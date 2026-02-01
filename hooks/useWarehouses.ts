import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Warehouse } from '../types';

interface WarehouseWithCity extends Warehouse {
    city_id: string;
}

export const useWarehouses = () => {
    const [warehouses, setWarehouses] = useState<WarehouseWithCity[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchWarehouses = async () => {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
            .from('warehouses')
            .select(`
        *,
        cities (name)
      `)
            .order('name');

        if (fetchError) {
            setError(fetchError.message);
            console.error('Error fetching warehouses:', fetchError);
        } else {
            setWarehouses(data || []);
        }

        setLoading(false);
    };

    const createWarehouse = async (warehouse: { name: string; city_id: string; type: 'Local' | 'Principal' }) => {
        const { data, error: createError } = await supabase
            .from('warehouses')
            .insert([warehouse])
            .select()
            .single();

        if (createError) {
            console.error('Error creating warehouse:', createError);
            return { success: false, error: createError.message };
        }

        if (data) {
            setWarehouses(prev => [...prev, data]);
        }

        return { success: true, data };
    };

    const updateWarehouse = async (id: string, updates: Partial<{ name: string; city_id: string; type: 'Local' | 'Principal' }>) => {
        const { data, error: updateError } = await supabase
            .from('warehouses')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating warehouse:', updateError);
            return { success: false, error: updateError.message };
        }

        if (data) {
            setWarehouses(prev => prev.map(w => w.id === id ? data : w));
        }

        return { success: true, data };
    };

    const deleteWarehouse = async (id: string) => {
        // Check if warehouse is used in any orders
        const { data: orders, error: checkError } = await supabase
            .from('orders')
            .select('id')
            .eq('warehouse_id', id)
            .limit(1);

        if (checkError) {
            console.error('Error checking warehouse usage:', checkError);
            return { success: false, error: checkError.message };
        }

        if (orders && orders.length > 0) {
            return {
                success: false,
                error: 'No se puede eliminar esta bodega porque está siendo usada en pedidos existentes.'
            };
        }

        const { error: deleteError } = await supabase
            .from('warehouses')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Error deleting warehouse:', deleteError);
            return { success: false, error: deleteError.message };
        }

        setWarehouses(prev => prev.filter(w => w.id !== id));
        return { success: true };
    };

    useEffect(() => {
        fetchWarehouses();
    }, []);

    return {
        warehouses,
        loading,
        error,
        fetchWarehouses,
        createWarehouse,
        updateWarehouse,
        deleteWarehouse
    };
};
