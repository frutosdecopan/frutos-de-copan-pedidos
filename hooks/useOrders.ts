import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Order, OrderStatus, OrderType } from '../types';

export function useOrders() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [hasMore, setHasMore] = useState(true);
    const PAGE_SIZE = 50;

    // Helper to transform single order
    const transformOrder = (order: any): Order => ({
        id: order.id,
        userId: order.user_id,
        userName: order.user_name,
        clientName: order.client_name,
        originCityName: order.origin_city_name,
        orderType: order.order_type as OrderType,
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
    });

    // Fetch orders with pagination
    const fetchOrders = async (page = 0, append = false) => {
        try {
            if (page === 0) setLoading(true); // Only show full loading on first page

            const from = page * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;

            const { data, error } = await supabase
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
        `)
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

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

    // Create new order
    const createOrder = async (orderData: Partial<Order>) => {
        try {
            // Generate order ID by querying the database for the highest existing ID
            const { data: existingOrders, error: countError } = await supabase
                .from('orders')
                .select('id')
                .order('id', { ascending: false })
                .limit(1);

            if (countError) throw countError;

            // Extract number from last order ID (e.g., "ORD-005" -> 5)
            let nextNumber = 1;
            if (existingOrders && existingOrders.length > 0) {
                const lastId = existingOrders[0].id;
                const match = lastId.match(/ORD-(\d+)/);
                if (match) {
                    nextNumber = parseInt(match[1], 10) + 1;
                }
            }

            const orderId = `ORD-${String(nextNumber).padStart(3, '0')}`;

            // Insert order
            const { data: newOrder, error: orderError } = await supabase
                .from('orders')
                .insert({
                    id: orderId,
                    user_id: orderData.userId,
                    user_name: orderData.userName,
                    client_name: orderData.clientName,
                    origin_city_name: orderData.originCityName,
                    order_type: orderData.orderType,
                    destination_name: orderData.destinationName,
                    city_id: orderData.cityId,
                    city_name: orderData.cityName,
                    warehouse_id: orderData.warehouseId,
                    warehouse_name: orderData.warehouseName,
                    status: orderData.status || OrderStatus.SENT,
                })
                .select()
                .single();

            if (orderError) throw orderError;

            // Insert order items
            if (orderData.items && orderData.items.length > 0) {
                const itemsToInsert = orderData.items.map(item => ({
                    order_id: orderId,
                    product_id: item.productId,
                    product_name: item.productName,
                    presentation_id: item.presentationId,
                    presentation_name: item.presentationName,
                    quantity: item.quantity,
                }));

                const { error: itemsError } = await supabase
                    .from('order_items')
                    .insert(itemsToInsert);

                if (itemsError) throw itemsError;
            }

            // Insert log
            const { error: logError } = await supabase
                .from('order_logs')
                .insert({
                    order_id: orderId,
                    message: 'Pedido creado',
                    user_name: orderData.userName || 'Sistema',
                });

            if (logError) throw logError;

            // Refresh orders
            await fetchOrders();
            return orderId;
        } catch (err: any) {
            console.error('Error creating order:', err);
            throw err;
        }
    };

    // Update order status
    const updateOrderStatus = async (orderId: string, newStatus: OrderStatus, userName: string = 'Sistema', reason?: string) => {
        try {
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

    // Update order
    const updateOrder = async (orderId: string, orderData: Partial<Order>) => {
        try {
            // Update order
            const { error: orderError } = await supabase
                .from('orders')
                .update({
                    client_name: orderData.clientName,
                    destination_name: orderData.destinationName,
                    order_type: orderData.orderType,
                    warehouse_id: orderData.warehouseId,
                    warehouse_name: orderData.warehouseName,
                    city_id: orderData.cityId,
                    city_name: orderData.cityName,
                })
                .eq('id', orderId);

            if (orderError) throw orderError;

            // Delete existing items
            const { error: deleteError } = await supabase
                .from('order_items')
                .delete()
                .eq('order_id', orderId);

            if (deleteError) throw deleteError;

            // Insert new items
            if (orderData.items && orderData.items.length > 0) {
                const itemsToInsert = orderData.items.map(item => ({
                    order_id: orderId,
                    product_id: item.productId,
                    product_name: item.productName,
                    presentation_id: item.presentationId,
                    presentation_name: item.presentationName,
                    quantity: item.quantity,
                }));

                const { error: itemsError } = await supabase
                    .from('order_items')
                    .insert(itemsToInsert);

                if (itemsError) throw itemsError;
            }

            // Add log
            const { error: logError } = await supabase
                .from('order_logs')
                .insert({
                    order_id: orderId,
                    message: 'Pedido actualizado',
                    user_name: orderData.userName || 'Sistema',
                });

            if (logError) throw logError;

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

    // Subscribe to real-time changes
    useEffect(() => {
        fetchOrders(0);

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
                        setOrders(prev => [transformed, ...prev]);
                    }
                } else if (eventType === 'UPDATE') {
                    // For updates, we usually want to refresh the local state
                    // Ideally we just update the specific field in the local array to avoid refetch
                    setOrders(prev => prev.map(o => {
                        if (o.id === newRecord.id) {
                            // Shallow merge for basic fields that might have changed
                            // Note: deep nesting (items) might need a fetch if they changed
                            return { ...o, status: newRecord.status, assignedDeliveryId: newRecord.assigned_delivery_id, updatedAt: newRecord.updated_at };
                        }
                        return o;
                    }));

                    // If it was a critical update (like status change that affects sorting), might want to re-sort
                    // But usually timestamp sort is stable.
                }
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
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
        loadMore,
        hasMore
    };
}
