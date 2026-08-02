import { useEffect, useRef } from 'react';
import { useToast } from '../ToastContext';
import { User, UserRole, OrderStatus, Order } from '../types';

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

// Deriva notificaciones comparando el arreglo `orders` (ya mantenido al día por
// useOrders, con su propia suscripción Realtime) contra su valor anterior, en
// vez de abrir una segunda suscripción `postgres_changes` redundante sobre la
// misma tabla `orders`.
export function useNotifications(user: User | null, orders: Order[]) {
    const { addToast } = useToast();
    const previousOrdersRef = useRef<Order[]>([]);
    // true hasta que capturamos la primera "foto" de orders con un usuario
    // activo — evita notificar como "nuevo pedido" todo lo que ya existía
    // antes de que este usuario iniciara sesión.
    const isFirstRunRef = useRef(true);

    useEffect(() => {
        if (!user) {
            isFirstRunRef.current = true;
            return;
        }

        if (isFirstRunRef.current) {
            isFirstRunRef.current = false;
            previousOrdersRef.current = orders;
            return;
        }

        const previousById = new Map(previousOrdersRef.current.map(o => [o.id, o]));

        for (const order of orders) {
            const previous = previousById.get(order.id);

            // 1. BODEGA / ADMIN / PRODUCCIÓN — Nuevo pedido recibido
            if (!previous) {
                const isRelevant =
                    user.roles.includes(UserRole.ADMIN) ||
                    (user.roles.includes(UserRole.WAREHOUSE) && user.assignedCities.includes(order.cityId)) ||
                    (user.roles.includes(UserRole.PRODUCTION) && user.assignedCities.includes(order.cityId));

                if (isRelevant) {
                    addToast(`📦 Nuevo pedido recibido: ${order.clientName}`, 'info');
                    playNotificationSound('new_order');
                }
                continue;
            }

            // 2. VENDEDOR — Cambio de estado en sus pedidos
            if (user.roles.includes(UserRole.SELLER) && user.id === order.userId && order.status !== previous.status) {
                let type: 'success' | 'error' | 'info' = 'info';
                if (order.status === OrderStatus.DELIVERED) type = 'success';
                if (order.status === OrderStatus.REJECTED) type = 'error';
                addToast(`Tu pedido para ${order.clientName} ahora está: ${order.status}`, type);
            }

            // 3. REPARTIDOR — Pedido asignado
            if (
                user.roles.includes(UserRole.DELIVERY) &&
                order.assignedDeliveryId === user.id &&
                previous.assignedDeliveryId !== user.id
            ) {
                addToast(`🚚 Nuevo pedido asignado: ${order.clientName}`, 'success');
                playNotificationSound('assigned');
            }
        }

        previousOrdersRef.current = orders;
    }, [orders, user, addToast]);
}
