import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Product } from '../types';

export const useProducts = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchProducts = async () => {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
            .from('products')
            .select('*')
            .order('name');

        if (fetchError) {
            setError(fetchError.message);
            console.error('Error fetching products:', fetchError);
        } else {
            setProducts(data || []);
        }

        setLoading(false);
    };

    const createProduct = async (product: Omit<Product, 'id' | 'created_at'>) => {
        const { data, error: createError } = await supabase
            .from('products')
            .insert([product])
            .select()
            .single();

        if (createError) {
            console.error('Error creating product:', createError);
            return { success: false, error: createError.message };
        }

        if (data) {
            setProducts(prev => [...prev, data]);
        }

        return { success: true, data };
    };

    const updateProduct = async (id: string, updates: Partial<Product>) => {
        const { data, error: updateError } = await supabase
            .from('products')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating product:', updateError);
            return { success: false, error: updateError.message };
        }

        if (data) {
            setProducts(prev => prev.map(p => p.id === id ? data : p));
        }

        return { success: true, data };
    };

    const deleteProduct = async (id: string) => {
        // Check if product is used in any orders
        const { data: orderItems, error: checkError } = await supabase
            .from('order_items')
            .select('id')
            .eq('product_id', id)
            .limit(1);

        if (checkError) {
            console.error('Error checking product usage:', checkError);
            return { success: false, error: checkError.message };
        }

        if (orderItems && orderItems.length > 0) {
            return {
                success: false,
                error: 'No se puede eliminar este producto porque está siendo usado en pedidos existentes.'
            };
        }

        const { error: deleteError } = await supabase
            .from('products')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Error deleting product:', deleteError);
            return { success: false, error: deleteError.message };
        }

        setProducts(prev => prev.filter(p => p.id !== id));
        return { success: true };
    };

    const toggleAvailability = async (id: string) => {
        const product = products.find(p => p.id === id);
        if (!product) return { success: false, error: 'Producto no encontrado' };

        return updateProduct(id, { available: !product.available });
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    return {
        products,
        loading,
        error,
        fetchProducts,
        createProduct,
        updateProduct,
        deleteProduct,
        toggleAvailability
    };
};
