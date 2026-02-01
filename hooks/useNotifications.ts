import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../ToastContext';
import { User, UserRole, OrderStatus } from '../types';

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

                    // 1. NOTIFICACIONES PARA BODEGA Y ADMIN (Nuevos pedidos)
                    if (eventType === 'INSERT') {
                        const isRelevant =
                            user.role === UserRole.ADMIN ||
                            (user.role === UserRole.WAREHOUSE && user.assignedCities.includes(newOrder.city_id)) ||
                            (user.role === UserRole.PRODUCTION && user.assignedCities.includes(newOrder.city_id));

                        if (isRelevant) {
                            addToast(`📦 Nuevo pedido recibido: ${newOrder.client_name}`, 'info');
                            // Reproducir sonido si es posible
                            try { const audio = new Audio('/notification.mp3'); audio.play(); } catch (e) { }
                        }
                    }

                    // 2. NOTIFICACIONES PARA VENDEDOR (Cambios de estado)
                    if (eventType === 'UPDATE' && user.role === UserRole.SELLER) {
                        if (user.id === newOrder.user_id) {
                            // Cambio de estado
                            if (newOrder.status !== oldOrder.status) {
                                let msg = `Tu pedido para ${newOrder.client_name} ahora está: ${newOrder.status}`;
                                let type: 'success' | 'error' | 'info' = 'info';

                                if (newOrder.status === OrderStatus.DELIVERED) type = 'success';
                                if (newOrder.status === OrderStatus.REJECTED) type = 'error';

                                addToast(msg, type);
                            }
                        }
                    }

                    // 3. NOTIFICACIONES PARA REPARTIDOR (Asignaciones)
                    if (eventType === 'UPDATE' && user.role === UserRole.DELIVERY) {
                        // Fue asignado a este pedido (antes no lo tenía o tenía otro, ahora tiene mi ID)
                        if (newOrder.assigned_delivery_id === user.id && oldOrder.assigned_delivery_id !== user.id) {
                            addToast(`🚚 Nuevo pedido asignado: ${newOrder.client_name}`, 'success');
                        }
                    }

                    // 4. NOTIFICACIONES PARA COMENTARIOS (Todos)
                    // Note: This requires listening to a different table if we want comment notifications, 
                    // but usually comments don't change the order row unless we update 'updated_at'.
                    // We will handle comment notifications in a separate channel or expansion if requested.
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [user, addToast]);
}
