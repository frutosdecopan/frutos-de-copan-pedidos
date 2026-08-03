import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface ClientNameRule {
    id: string;
    keyword: string;
    canonicalName: string;
    createdAt: string;
}

interface SupabaseClientNameRuleRow {
    id: string;
    keyword: string;
    canonical_name: string;
    created_at: string;
}

const transformRule = (row: SupabaseClientNameRuleRow): ClientNameRule => ({
    id: row.id,
    keyword: row.keyword,
    canonicalName: row.canonical_name,
    createdAt: row.created_at,
});

export const useClientNameRules = () => {
    const [clientNameRules, setClientNameRules] = useState<ClientNameRule[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchClientNameRules = async () => {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
            .from('client_name_rules')
            .select('*')
            .order('keyword');

        if (fetchError) {
            setError(fetchError.message);
            console.error('Error fetching client name rules:', fetchError);
        } else {
            setClientNameRules((data || []).map(transformRule));
        }

        setLoading(false);
    };

    const createClientNameRule = async (rule: { keyword: string; canonicalName: string }) => {
        const { data, error: createError } = await supabase
            .from('client_name_rules')
            .insert([{ keyword: rule.keyword, canonical_name: rule.canonicalName }])
            .select()
            .single();

        if (createError) {
            console.error('Error creating client name rule:', createError);
            return { success: false, error: createError.message };
        }

        if (data) {
            setClientNameRules(prev => [...prev, transformRule(data)]);
        }

        return { success: true };
    };

    const updateClientNameRule = async (id: string, updates: { keyword: string; canonicalName: string }) => {
        const { data, error: updateError } = await supabase
            .from('client_name_rules')
            .update({ keyword: updates.keyword, canonical_name: updates.canonicalName })
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating client name rule:', updateError);
            return { success: false, error: updateError.message };
        }

        if (data) {
            setClientNameRules(prev => prev.map(r => r.id === id ? transformRule(data) : r));
        }

        return { success: true };
    };

    const deleteClientNameRule = async (id: string) => {
        const { error: deleteError } = await supabase
            .from('client_name_rules')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Error deleting client name rule:', deleteError);
            return { success: false, error: deleteError.message };
        }

        setClientNameRules(prev => prev.filter(r => r.id !== id));
        return { success: true };
    };

    useEffect(() => {
        fetchClientNameRules();
    }, []);

    return {
        clientNameRules,
        loading,
        error,
        fetchClientNameRules,
        createClientNameRule,
        updateClientNameRule,
        deleteClientNameRule,
    };
};
