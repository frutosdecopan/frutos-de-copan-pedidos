import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { City } from '../types';

export const useCities = () => {
    const [cities, setCities] = useState<City[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchCities = async () => {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
            .from('cities')
            .select(`
        *,
        warehouses (*)
      `)
            .order('name');

        if (fetchError) {
            setError(fetchError.message);
            console.error('Error fetching cities:', fetchError);
        } else {
            setCities(data || []);
        }

        setLoading(false);
    };

    const createCity = async (city: { name: string }) => {
        const { data, error: createError } = await supabase
            .from('cities')
            .insert([city])
            .select()
            .single();

        if (createError) {
            console.error('Error creating city:', createError);
            return { success: false, error: createError.message };
        }

        if (data) {
            setCities(prev => [...prev, { ...data, warehouses: [] }]);
        }

        return { success: true, data };
    };

    const updateCity = async (id: string, updates: { name: string }) => {
        const { data, error: updateError } = await supabase
            .from('cities')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating city:', updateError);
            return { success: false, error: updateError.message };
        }

        if (data) {
            setCities(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
        }

        return { success: true, data };
    };

    const deleteCity = async (id: string) => {
        // Check if city has warehouses
        const { data: warehouses, error: checkError } = await supabase
            .from('warehouses')
            .select('id')
            .eq('city_id', id)
            .limit(1);

        if (checkError) {
            console.error('Error checking city usage:', checkError);
            return { success: false, error: checkError.message };
        }

        if (warehouses && warehouses.length > 0) {
            return {
                success: false,
                error: 'No se puede eliminar esta ciudad porque tiene bodegas asociadas. Elimina primero las bodegas.'
            };
        }

        const { error: deleteError } = await supabase
            .from('cities')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Error deleting city:', deleteError);
            return { success: false, error: deleteError.message };
        }

        setCities(prev => prev.filter(c => c.id !== id));
        return { success: true };
    };

    useEffect(() => {
        fetchCities();
    }, []);

    return {
        cities,
        loading,
        error,
        fetchCities,
        createCity,
        updateCity,
        deleteCity
    };
};
