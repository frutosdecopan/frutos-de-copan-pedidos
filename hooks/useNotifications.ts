import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../ToastContext';
import { User, UserRole, OrderStatus } from '../types';

// ─── Web Audio API ────────────────────────────────────────────────────────────
// Se usa un único AudioContext compartido para evitar límites del navegador.
// Los navegadores crean el contexto en estado "suspended" hasta que hay un
// gesto del usuario — se desbloquea automáticamente con los listeners de abajo.

let _audioCtx: AudioContext | null = null;

function getOrCreateCtx(): AudioContext | null {
    try {
        const Ctor = window.AudioContext || (window as any).webkitAudioContext;
        if (!Ctor) return null;
        if (!_audioCtx || _audioCtx.state === 'closed') {
            _audioCtx = new Ctor();
        }
        return _audioCtx;
    } catch {
        return null;
    }
}

// Registrar listeners para desbloquear el AudioContext en el primer gesto
if (typeof window !== 'undefined') {
    const unlock = () => {
        const ctx = getOrCreateCtx();
        if (ctx && ctx.state === 'suspended') {
            ctx.resume().then(() => console.log('🔊 AudioContext desbloqueado'));
        }
    };
    window.addEventListener('click', unlock);
    window.addEventListener('touchstart', unlock);
    window.addEventListener('keydown', unlock);
}

/**
 * Genera sonidos de alerta sin archivos externos.
 * - 'new_order': doble bip para bodega/admin al recibir un pedido.
 * - 'assigned':  acorde tipo campana para repartidor al ser asignado.
 */
function playNotificationSound(type: 'new_order' | 'assigned') {
    const ctx = getOrCreateCtx();
    if (!ctx) {
        console.warn('🔇 Web Audio API no disponible en este navegador');
        return;
    }

    const doPlay = () => {
        console.log(`🔊 Sonido "${type}" | contexto: ${ctx.state}`);

        if (type === 'new_order') {
            // Doble bip ascendente: 880 Hz → 1100 Hz
            [0, 0.28].forEach((offset, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880 + i * 220, ctx.currentTime + offset);
                gain.gain.setValueAtTime(0.6, ctx.currentTime + offset);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.22);
                osc.start(ctx.currentTime + offset);
                osc.stop(ctx.currentTime + offset + 0.22);
            });

        } else if (type === 'assigned') {
            // Acorde tipo campana: Do5 – Mi5 – Sol5
            [523.25, 659.25, 783.99].forEach((freq) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, ctx.currentTime);
                gain.gain.setValueAtTime(0.35, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 1.0);
            });
        }
    };

    // Si el contexto está suspendido, resumirlo antes de tocar
    if (ctx.state === 'suspended') {
        ctx.resume().then(doPlay).catch((e) => console.error('Audio resume error:', e));
    } else {
        doPlay();
    }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNotifications(user: User | null) {
    const { addToast } = useToast();

    useEffect(() => {
        if (!user) return;

        console.log('🔔 Suscribiendo a notificaciones para:', user.role);

        const subscription = supabase
            .channel('orders_notifications')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                },
                (payload) => {
                    const newOrder = payload.new as any;
                    const oldOrder = payload.old as any;
                    const eventType = payload.eventType;

                    // 1. BODEGA / ADMIN — Nuevo pedido recibido (INSERT)
                    if (eventType === 'INSERT') {
                        const isRelevant =
                            user.role === UserRole.ADMIN ||
                            (user.role === UserRole.WAREHOUSE && user.assignedCities.includes(newOrder.city_id)) ||
                            (user.role === UserRole.PRODUCTION && user.assignedCities.includes(newOrder.city_id));

                        if (isRelevant) {
                            addToast(`📦 Nuevo pedido recibido: ${newOrder.client_name}`, 'info');
                            playNotificationSound('new_order');
                        }
                    }

                    // 2. VENDEDOR — Cambio de estado en sus pedidos
                    if (eventType === 'UPDATE' && user.role === UserRole.SELLER) {
                        if (user.id === newOrder.user_id && newOrder.status !== oldOrder.status) {
                            let msg = `Tu pedido para ${newOrder.client_name} ahora está: ${newOrder.status}`;
                            let type: 'success' | 'error' | 'info' = 'info';
                            if (newOrder.status === OrderStatus.DELIVERED) type = 'success';
                            if (newOrder.status === OrderStatus.REJECTED) type = 'error';
                            addToast(msg, type);
                        }
                    }

                    // 3. REPARTIDOR — Pedido asignado
                    if (eventType === 'UPDATE' && user.role === UserRole.DELIVERY) {
                        if (
                            newOrder.assigned_delivery_id === user.id &&
                            oldOrder.assigned_delivery_id !== user.id
                        ) {
                            addToast(`🚚 Nuevo pedido asignado: ${newOrder.client_name}`, 'success');
                            playNotificationSound('assigned');
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [user, addToast]);
}
