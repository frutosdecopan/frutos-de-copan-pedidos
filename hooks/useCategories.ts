import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface ProductCategory {
    id: string;
    name: string;
    active: boolean;
    created_at: string;
}

export const useCategories = () => {
    const [categories, setCategories] = useState<ProductCategory[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchCategories = async () => {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
            .from('product_categories')
            .select('*')
            .order('name');

        if (fetchError) {
            setError(fetchError.message);
            console.error('Error fetching categories:', fetchError);
        } else {
            setCategories(data || []);
        }

        setLoading(false);
    };

    const createCategory = async (category: { name: string }) => {
        const { data, error: createError } = await supabase
            .from('product_categories')
            .insert([{ ...category, active: true }])
            .select()
            .single();

        if (createError) {
            console.error('Error creating category:', createError);
            return { success: false, error: createError.message };
        }

        if (data) {
            setCategories(prev => [...prev, data]);
        }

        return { success: true, data };
    };

    const updateCategory = async (id: string, updates: { name: string }) => {
        const { data, error: updateError } = await supabase
            .from('product_categories')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating category:', updateError);
            return { success: false, error: updateError.message };
        }

        if (data) {
            setCategories(prev => prev.map(c => c.id === id ? data : c));
        }

        return { success: true, data };
    };

    const deleteCategory = async (id: string) => {
        // Check if category is used in any products
        const category = categories.find(c => c.id === id);
        if (!category) return { success: false, error: 'Categoría no encontrada' };

        const { data: products, error: checkError } = await supabase
            .from('products')
            .select('id')
            .eq('category', category.name)
            .limit(1);

        if (checkError) {
            console.error('Error checking category usage:', checkError);
            return { success: false, error: checkError.message };
        }

        if (products && products.length > 0) {
            return {
                success: false,
                error: 'No se puede eliminar esta categoría porque tiene productos asociados.'
            };
        }

        const { error: deleteError } = await supabase
            .from('product_categories')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Error deleting category:', deleteError);
            return { success: false, error: deleteError.message };
        }

        setCategories(prev => prev.filter(c => c.id !== id));
        return { success: true };
    };

    const toggleActive = async (id: string) => {
        const category = categories.find(c => c.id === id);
        if (!category) return { success: false, error: 'Categoría no encontrada' };

        const { data, error: updateError } = await supabase
            .from('product_categories')
            .update({ active: !category.active })
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            return { success: false, error: updateError.message };
        }

        if (data) {
            setCategories(prev => prev.map(c => c.id === id ? data : c));
        }

        return { success: true };
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    return {
        categories,
        loading,
        error,
        fetchCategories,
        createCategory,
        updateCategory,
        deleteCategory,
        toggleActive
    };
};
