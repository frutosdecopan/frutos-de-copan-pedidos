import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Destination {
    id: string;
    name: string;
    active: boolean;
    created_at: string;
}

export const useDestinations = () => {
    const [destinations, setDestinations] = useState<Destination[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDestinations = async () => {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
            .from('destinations')
            .select('*')
            .order('name');

        if (fetchError) {
            setError(fetchError.message);
            console.error('Error fetching destinations:', fetchError);
        } else {
            setDestinations(data || []);
        }

        setLoading(false);
    };

    const createDestination = async (destination: { name: string }) => {
        const { data, error: createError } = await supabase
            .from('destinations')
            .insert([{ ...destination, active: true }])
            .select()
            .single();

        if (createError) {
            console.error('Error creating destination:', createError);
            return { success: false, error: createError.message };
        }

        if (data) {
            setDestinations(prev => [...prev, data]);
        }

        return { success: true, data };
    };

    const updateDestination = async (id: string, updates: { name: string }) => {
        const { data, error: updateError } = await supabase
            .from('destinations')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating destination:', updateError);
            return { success: false, error: updateError.message };
        }

        if (data) {
            setDestinations(prev => prev.map(d => d.id === id ? data : d));
        }

        return { success: true, data };
    };

    const deleteDestination = async (id: string) => {
        const { error: deleteError } = await supabase
            .from('destinations')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Error deleting destination:', deleteError);
            return { success: false, error: deleteError.message };
        }

        setDestinations(prev => prev.filter(d => d.id !== id));
        return { success: true };
    };

    const toggleActive = async (id: string) => {
        const destination = destinations.find(d => d.id === id);
        if (!destination) return { success: false, error: 'Destino no encontrado' };

        const { data, error: updateError } = await supabase
            .from('destinations')
            .update({ active: !destination.active })
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            return { success: false, error: updateError.message };
        }

        if (data) {
            setDestinations(prev => prev.map(d => d.id === id ? data : d));
        }

        return { success: true };
    };

    useEffect(() => {
        fetchDestinations();
    }, []);

    return {
        destinations,
        loading,
        error,
        fetchDestinations,
        createDestination,
        updateDestination,
        deleteDestination,
        toggleActive
    };
};
