import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Order, OrderStatus } from '../types';

export interface OrderFilters {
    status?: OrderStatus | '';
    cityId?: string;
    startDate?: string;
    endDate?: string;
    userId?: string;
    searchTerm?: string;
    orderType?: string;
}

export function useOrders() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<OrderFilters>({});

    const [hasMore, setHasMore] = useState(true);
    const PAGE_SIZE = 50;

    // Helper to transform single order
    const transformOrder = (order: any): Order => ({
        id: order.id,
        userId: order.user_id,
        userName: order.user_name,
        clientName: order.client_name,
        clientRtn: order.client_rtn ?? undefined,
        clientPhone: order.client_phone ?? undefined,
        originCityName: order.origin_city_name,
        orderType: order.order_type,
        destinationName: order.destination_name,
        cityId: order.city_id,
        cityName: order.city_name,
        warehouseId: order.warehouse_id,
        warehouseName: order.warehouse_name,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        status: order.status as OrderStatus,
        items: (order.order_items || []).map((item: any) => ({
            productId: item.product_id,
            productName: item.product_name,
            presentationId: item.presentation_id,
            presentationName: item.presentation_name,
            quantity: item.quantity
        })),
        logs: (order.order_logs || []).map((log: any) => ({
            timestamp: log.timestamp,
            message: log.message,
            user: log.user_name
        })),
        comments: (order.order_comments || []).map((comment: any) => ({
            id: comment.id,
            orderId: order.id,
            userId: comment.user_id,
            userName: comment.user_name,
            content: comment.content,
            createdAt: comment.created_at
        })).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        assignedDeliveryId: order.assigned_delivery_id,
        deliveryDate: order.delivery_date ?? undefined,
    });

    // Fetch orders with pagination
    // silent=true skips the loading state (used for background polling)
    const fetchOrders = async (page = 0, append = false, silent = false, currentFilters: OrderFilters = filters) => {
        try {
            if (page === 0 && !silent) setLoading(true);

            const from = page * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;

            let query = supabase
                .from('orders')
                .select(`
          *,
          order_items (
            id,
            product_id,
            product_name,
            presentation_id,
            presentation_name,
            quantity
          ),
          order_logs (
            timestamp,
            message,
            user_name
          ),
          order_comments (
            id,
            user_id,
            user_name,
            content,
            created_at
          )
        `);

            // Apply Filters
            if (currentFilters.userId) {
                query = query.eq('user_id', currentFilters.userId);
            }
            if (currentFilters.status) {
                query = query.eq('status', currentFilters.status);
            }
            if (currentFilters.cityId) {
                // Check both origin and destination city
                query = query.or(`city_id.eq.${currentFilters.cityId},destination_name.ilike.%${currentFilters.cityId}%`);
            }
            if (currentFilters.startDate) {
                query = query.gte('created_at', currentFilters.startDate);
            }
            if (currentFilters.endDate) {
                query = query.lte('created_at', currentFilters.endDate + 'T23:59:59');
            }
            if (currentFilters.searchTerm) {
                const term = currentFilters.searchTerm.toLowerCase();
                query = query.or(`client_name.ilike.%${term}%,id.ilike.%${term}%`);
            }

            const { data, error: fetchError } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (fetchError) throw fetchError;

            // Transform Supabase data
            const newOrders = (data || []).map(transformOrder);

            if (newOrders.length < PAGE_SIZE) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }

            setOrders(prev => {
                if (append) {
                    // Filter duplicates just in case
                    const existingIds = new Set(prev.map(o => o.id));
                    const uniqueNewOrders = newOrders.filter(o => !existingIds.has(o.id));
                    return [...prev, ...uniqueNewOrders];
                }
                return newOrders;
            });

            setError(null);
        } catch (err: any) {
            console.error('Error fetching orders:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadMore = () => {
        if (!hasMore) return;
        const nextPage = Math.floor(orders.length / PAGE_SIZE);
        fetchOrders(nextPage, true);
    };

    const applyFilters = (newFilters: OrderFilters) => {
        setFilters(newFilters);
        fetchOrders(0, false, false, newFilters);
    };

    // Fetch the COMPLETE set of orders matching filters directly from Supabase,
    // bypassing the small on-screen PAGE_SIZE. Used for exports (CSV/PDF) so
    // reports aren't limited to whatever pages happen to be loaded on screen.
    const fetchOrdersForExport = async (currentFilters: OrderFilters = {}): Promise<Order[]> => {
        const EXPORT_BATCH_SIZE = 1000;
        const allOrders: Order[] = [];
        let page = 0;

        while (true) {
            const from = page * EXPORT_BATCH_SIZE;
            const to = from + EXPORT_BATCH_SIZE - 1;

            let query = supabase
                .from('orders')
                .select(`
          *,
          order_items (
            id,
            product_id,
            product_name,
            presentation_id,
            presentation_name,
            quantity
          ),
          order_logs (
            timestamp,
            message,
            user_name
          ),
          order_comments (
            id,
            user_id,
            user_name,
            content,
            created_at
          )
        `);

            if (currentFilters.userId) {
                query = query.eq('user_id', currentFilters.userId);
            }
            if (currentFilters.status) {
                query = query.eq('status', currentFilters.status);
            }
            if (currentFilters.orderType) {
                query = query.eq('order_type', currentFilters.orderType);
            }
            if (currentFilters.cityId) {
                query = query.or(`city_id.eq.${currentFilters.cityId},destination_name.ilike.%${currentFilters.cityId}%`);
            }
            if (currentFilters.startDate) {
                query = query.gte('created_at', currentFilters.startDate);
            }
            if (currentFilters.endDate) {
                query = query.lte('created_at', currentFilters.endDate + 'T23:59:59');
            }
            if (currentFilters.searchTerm) {
                const term = currentFilters.searchTerm.toLowerCase();
                query = query.or(`client_name.ilike.%${term}%,id.ilike.%${term}%`);
            }

            const { data, error: fetchError } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (fetchError) throw fetchError;

            const batch = (data || []).map(transformOrder);
            allOrders.push(...batch);

            if (batch.length < EXPORT_BATCH_SIZE) break;
            page++;
        }

        return allOrders;
    };

    // Create new order — order + items + log are inserted atomically via a
    // single Postgres function (create_order_with_items), so a mid-way
    // failure can never leave an orphaned order with no items.
    const createOrder = async (orderData: Partial<Order>) => {
        try {
            const { data: orderId, error } = await supabase.rpc('create_order_with_items', {
                p_user_id: orderData.userId,
                p_user_name: orderData.userName,
                p_client_name: orderData.clientName,
                p_client_rtn: orderData.clientRtn || null,
                p_client_phone: orderData.clientPhone || null,
                p_origin_city_name: orderData.originCityName,
                p_order_type: orderData.orderType,
                p_destination_name: orderData.destinationName,
                p_city_id: orderData.cityId,
                p_city_name: orderData.cityName,
                p_warehouse_id: orderData.warehouseId,
                p_warehouse_name: orderData.warehouseName,
                p_status: orderData.status || OrderStatus.SENT,
                p_delivery_date: orderData.deliveryDate || null,
                p_items: (orderData.items || []).map(item => ({
                    productId: item.productId,
                    productName: item.productName,
                    presentationId: item.presentationId,
                    presentationName: item.presentationName,
                    quantity: item.quantity,
                })),
            });

            if (error) throw error;

            // Refresh orders
            await fetchOrders();
            return orderId as string;
        } catch (err: any) {
            console.error('Error creating order:', err);
            throw err;
        }
    };

    // Update order status
    // Single source of truth for status-transition business rules, so no
    // caller (any current or future view) can bypass them.
    const validateStatusTransition = (currentOrder: Order | undefined, newStatus: OrderStatus) => {
        if (!currentOrder) return; // order not loaded locally yet; let the write proceed

        if (newStatus === OrderStatus.DISPATCH && !currentOrder.assignedDeliveryId) {
            throw new Error('Debes asignar un repartidor antes de pasar a "En Despacho".');
        }

        if (
            currentOrder.status === OrderStatus.DISPATCH &&
            currentOrder.assignedDeliveryId &&
            newStatus !== OrderStatus.DELIVERED &&
            newStatus !== OrderStatus.CANCELLED
        ) {
            throw new Error('El pedido ya está en ruta con un repartidor asignado; no se puede revertir el estado.');
        }
    };

    const updateOrderStatus = async (orderId: string, newStatus: OrderStatus, userName: string = 'Sistema', reason?: string) => {
        try {
            validateStatusTransition(orders.find(o => o.id === orderId), newStatus);

            const { error: updateError } = await supabase
                .from('orders')
                .update({ status: newStatus })
                .eq('id', orderId);

            if (updateError) throw updateError;

            // Add log
            let logMessage = `Estado cambiado a ${newStatus}`;
            if (newStatus === OrderStatus.REJECTED && reason) {
                logMessage = `Rechazado: ${reason}`;
            }

            const { error: logError } = await supabase
                .from('order_logs')
                .insert({
                    order_id: orderId,
                    message: logMessage,
                    user_name: userName,
                });

            if (logError) throw logError;

            // Refresh orders
            await fetchOrders();
        } catch (err: any) {
            console.error('Error updating order status:', err);
            throw err;
        }
    };

    // Update order — update + item replacement + log are done atomically via
    // a single Postgres function (update_order_with_items), so a mid-way
    // failure can never leave the order with zero items.
    const updateOrder = async (orderId: string, orderData: Partial<Order>) => {
        try {
            const { error } = await supabase.rpc('update_order_with_items', {
                p_order_id: orderId,
                p_client_name: orderData.clientName,
                p_client_rtn: orderData.clientRtn ?? null,
                p_client_phone: orderData.clientPhone ?? null,
                p_destination_name: orderData.destinationName,
                p_order_type: orderData.orderType,
                p_warehouse_id: orderData.warehouseId,
                p_warehouse_name: orderData.warehouseName,
                p_city_id: orderData.cityId,
                p_city_name: orderData.cityName,
                p_status: orderData.status,
                p_delivery_date: orderData.deliveryDate ?? null,
                p_user_name: orderData.userName || 'Sistema',
                p_items: (orderData.items || []).map(item => ({
                    productId: item.productId,
                    productName: item.productName,
                    presentationId: item.presentationId,
                    presentationName: item.presentationName,
                    quantity: item.quantity,
                })),
            });

            if (error) throw error;

            // Refresh orders
            await fetchOrders();
        } catch (err: any) {
            console.error('Error updating order:', err);
            throw err;
        }
    };

    // Assign delivery
    const assignDelivery = async (orderId: string, deliveryUserId: string, userName: string = 'Sistema') => {
        try {
            const { error: updateError } = await supabase
                .from('orders')
                .update({ assigned_delivery_id: deliveryUserId })
                .eq('id', orderId);

            if (updateError) throw updateError;

            // Add log
            const { error: logError } = await supabase
                .from('order_logs')
                .insert({
                    order_id: orderId,
                    message: 'Repartidor asignado',
                    user_name: userName,
                });

            if (logError) throw logError;

            // Refresh orders
            await fetchOrders();
        } catch (err: any) {
            console.error('Error assigning delivery:', err);
            throw err;
        }
    };

    // Add comment
    const addComment = async (orderId: string, userId: string, userName: string, content: string) => {
        try {
            const { error: commentError } = await supabase
                .from('order_comments')
                .insert({
                    order_id: orderId,
                    user_id: userId,
                    user_name: userName,
                    content: content
                });

            if (commentError) throw commentError;

            // Refresh orders
            await fetchOrders();
        } catch (err: any) {
            console.error('Error adding comment:', err);
            throw err;
        }
    };

    // Subscribe to real-time changes + polling fallback
    useEffect(() => {
        let active = true;
        // Wait for Supabase to finish restoring a persisted session before the
        // first query — otherwise it can go out as an anonymous request and RLS
        // silently returns 0 rows (no error), which nothing here would retry.
        supabase.auth.getSession().finally(() => {
            if (active) fetchOrders(0);
        });

        // Set up real-time subscription
        const subscription = supabase
            .channel('orders_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async (payload) => {
                const eventType = payload.eventType;
                const newRecord = payload.new as any;

                if (eventType === 'INSERT') {
                    // Fetch complete order data for the new record
                    const { data, error } = await supabase
                        .from('orders')
                        .select(`
                            *,
                            order_items (id, product_id, product_name, presentation_id, presentation_name, quantity),
                            order_logs (timestamp, message, user_name),
                            order_comments (id, user_id, user_name, content, created_at)
                        `)
                        .eq('id', newRecord.id)
                        .single();

                    if (!error && data) {
                        const transformed = transformOrder(data);
                        setOrders(prev => {
                            // Avoid duplicates
                            if (prev.some(o => o.id === transformed.id)) return prev;
                            return [transformed, ...prev];
                        });
                    }
                } else if (eventType === 'UPDATE') {
                    const newRecord = payload.new as any;
                    setOrders(prev => prev.map(o => {
                        if (o.id === newRecord.id) {
                            return { ...o, status: newRecord.status, assignedDeliveryId: newRecord.assigned_delivery_id, updatedAt: newRecord.updated_at };
                        }
                        return o;
                    }));
                } else if (eventType === 'DELETE') {
                    const oldRecord = payload.old as any;
                    setOrders(prev => prev.filter(o => o.id !== oldRecord.id));
                }
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_comments' }, (payload) => {
                const newComment = payload.new as any;
                setOrders(prev => prev.map(o => {
                    if (o.id !== newComment.order_id || o.comments.some(c => c.id === newComment.id)) return o;
                    const comment = {
                        id: newComment.id,
                        orderId: newComment.order_id,
                        userId: newComment.user_id,
                        userName: newComment.user_name,
                        content: newComment.content,
                        createdAt: newComment.created_at,
                    };
                    return {
                        ...o,
                        comments: [comment, ...o.comments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
                    };
                }));
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_logs' }, (payload) => {
                const newLog = payload.new as any;
                setOrders(prev => prev.map(o => {
                    if (o.id !== newLog.order_id || o.logs.some(l => l.timestamp === newLog.timestamp && l.message === newLog.message)) return o;
                    return { ...o, logs: [...o.logs, { timestamp: newLog.timestamp, message: newLog.message, user: newLog.user_name }] };
                }));
            })
            .subscribe((status) => {
                console.log('[Realtime] orders_channel status:', status);
            });

        // Polling fallback: refresh silently every 60 seconds (silent=true avoids loading flicker)
        const pollInterval = setInterval(() => {
            fetchOrders(0, false, true);
        }, 60000);

        return () => {
            active = false;
            subscription.unsubscribe();
            clearInterval(pollInterval);
        };
    }, []);

    return {
        orders,
        loading,
        error,
        createOrder,
        updateOrder,
        updateOrderStatus,
        assignDelivery,
        addComment,
        refetch: () => fetchOrders(0),
        applyFilters,
        loadMore,
        hasMore,
        fetchOrdersForExport
    };
}
