import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface OrderTypeItem {
    id: string;
    name: string;
    active: boolean;
    created_at: string;
}

export const useOrderTypes = () => {
    const [orderTypes, setOrderTypes] = useState<OrderTypeItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchOrderTypes = async () => {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
            .from('order_types')
            .select('*')
            .eq('active', true)
            .order('name');

        if (fetchError) {
            setError(fetchError.message);
            console.error('Error fetching order types:', fetchError);
        } else {
            setOrderTypes(data || []);
        }

        setLoading(false);
    };

    const fetchAllOrderTypes = async () => {
        setLoading(true);
        const { data, error: fetchError } = await supabase
            .from('order_types')
            .select('*')
            .order('name');

        if (!fetchError) setOrderTypes(data || []);
        setLoading(false);
    };

    const createOrderType = async (orderType: { name: string }) => {
        const { data, error: createError } = await supabase
            .from('order_types')
            .insert([{ ...orderType, active: true }])
            .select()
            .single();

        if (createError) {
            console.error('Error creating order type:', createError);
            return { success: false, error: createError.message };
        }

        if (data) {
            setOrderTypes(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        }

        return { success: true, data };
    };

    const updateOrderType = async (id: string, updates: { name: string }) => {
        const { data, error: updateError } = await supabase
            .from('order_types')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating order type:', updateError);
            return { success: false, error: updateError.message };
        }

        if (data) {
            setOrderTypes(prev => prev.map(t => t.id === id ? data : t));
        }

        return { success: true, data };
    };

    const deleteOrderType = async (id: string) => {
        // Check if used in existing orders
        const orderType = orderTypes.find(t => t.id === id);
        if (!orderType) return { success: false, error: 'Tipo no encontrado' };

        const { data: usedOrders, error: checkError } = await supabase
            .from('orders')
            .select('id')
            .eq('order_type', orderType.name)
            .limit(1);

        if (checkError) {
            return { success: false, error: checkError.message };
        }

        if (usedOrders && usedOrders.length > 0) {
            return {
                success: false,
                error: 'No se puede eliminar porque hay pedidos con este tipo.'
            };
        }

        const { error: deleteError } = await supabase
            .from('order_types')
            .delete()
            .eq('id', id);

        if (deleteError) {
            return { success: false, error: deleteError.message };
        }

        setOrderTypes(prev => prev.filter(t => t.id !== id));
        return { success: true };
    };

    const toggleActive = async (id: string) => {
        const orderType = orderTypes.find(t => t.id === id);
        if (!orderType) return { success: false, error: 'Tipo no encontrado' };

        const { data, error: updateError } = await supabase
            .from('order_types')
            .update({ active: !orderType.active })
            .eq('id', id)
            .select()
            .single();

        if (updateError) return { success: false, error: updateError.message };
        if (data) setOrderTypes(prev => prev.map(t => t.id === id ? data : t));
        return { success: true };
    };

    useEffect(() => {
        fetchAllOrderTypes();
    }, []);

    return {
        orderTypes,
        loading,
        error,
        fetchOrderTypes,
        fetchAllOrderTypes,
        createOrderType,
        updateOrderType,
        deleteOrderType,
        toggleActive,
    };
};
