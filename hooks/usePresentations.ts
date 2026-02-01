import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Presentation } from '../types';

export const usePresentations = () => {
    const [presentations, setPresentations] = useState<Presentation[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchPresentations = async () => {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
            .from('presentations')
            .select('*')
            .order('weight_kg');

        if (fetchError) {
            setError(fetchError.message);
            console.error('Error fetching presentations:', fetchError);
        } else {
            setPresentations(data || []);
        }

        setLoading(false);
    };

    const createPresentation = async (presentation: Omit<Presentation, 'id' | 'created_at'>) => {
        const { data, error: createError } = await supabase
            .from('presentations')
            .insert([presentation])
            .select()
            .single();

        if (createError) {
            console.error('Error creating presentation:', createError);
            return { success: false, error: createError.message };
        }

        if (data) {
            setPresentations(prev => [...prev, data]);
        }

        return { success: true, data };
    };

    const updatePresentation = async (id: string, updates: Partial<Presentation>) => {
        const { data, error: updateError } = await supabase
            .from('presentations')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating presentation:', updateError);
            return { success: false, error: updateError.message };
        }

        if (data) {
            setPresentations(prev => prev.map(p => p.id === id ? data : p));
        }

        return { success: true, data };
    };

    const deletePresentation = async (id: string) => {
        // Check if presentation is used in any orders
        const { data: orderItems, error: checkError } = await supabase
            .from('order_items')
            .select('id')
            .eq('presentation_id', id)
            .limit(1);

        if (checkError) {
            console.error('Error checking presentation usage:', checkError);
            return { success: false, error: checkError.message };
        }

        if (orderItems && orderItems.length > 0) {
            return {
                success: false,
                error: 'No se puede eliminar esta presentación porque está siendo usada en pedidos existentes.'
            };
        }

        const { error: deleteError } = await supabase
            .from('presentations')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Error deleting presentation:', deleteError);
            return { success: false, error: deleteError.message };
        }

        setPresentations(prev => prev.filter(p => p.id !== id));
        return { success: true };
    };

    useEffect(() => {
        fetchPresentations();
    }, []);

    return {
        presentations,
        loading,
        error,
        fetchPresentations,
        createPresentation,
        updatePresentation,
        deletePresentation
    };
};
