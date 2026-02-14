import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, UserRole } from '../types';

export function useUsers() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch all users
    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('name');

            if (error) throw error;

            // Transform Supabase data to match our User type
            const transformedUsers: User[] = (data || []).map((user: any) => ({
                id: user.id,
                name: user.name,
                username: user.username || '',
                password: user.password || '',
                role: user.role as UserRole,
                assignedCities: user.assigned_cities || [],
                unavailableDates: user.unavailable_dates?.map((d: any) =>
                    typeof d === 'string' ? d : new Date(d).toISOString().split('T')[0]
                ) || [],
                isActive: user.is_active !== false,
            }));

            setUsers(transformedUsers);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching users:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Create new user
    const createUser = async (userData: Omit<User, 'id'>) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .insert({
                    name: userData.name,
                    username: userData.username,
                    password: userData.password,
                    email: `${userData.username}@frutos.com`,
                    role: userData.role,
                    assigned_cities: (userData.assignedCities || []).filter(id => id && id.trim() !== ''),
                    unavailable_dates: userData.unavailableDates || [],
                    is_active: userData.isActive !== false,
                })
                .select()
                .single();

            if (error) throw error;

            // Refresh users
            await fetchUsers();
            return data.id;
        } catch (err: any) {
            console.error('Error creating user:', err);
            throw err;
        }
    };

    // Update user
    const updateUser = async (userId: string, userData: Partial<User>) => {
        try {
            const updateData: any = {};

            if (userData.name) updateData.name = userData.name;
            if (userData.username) updateData.username = userData.username;
            if (userData.password) updateData.password = userData.password;
            if (userData.role) updateData.role = userData.role;
            if (userData.assignedCities) {
                updateData.assigned_cities = (userData.assignedCities || []).filter(id => id && id.trim() !== '');
            }
            if (userData.unavailableDates !== undefined) {
                updateData.unavailable_dates = userData.unavailableDates;
            }
            if (userData.isActive !== undefined) updateData.is_active = userData.isActive;

            const { error } = await supabase
                .from('users')
                .update(updateData)
                .eq('id', userId);

            if (error) throw error;

            // Refresh users
            await fetchUsers();
        } catch (err: any) {
            console.error('Error updating user:', err);
            throw err;
        }
    };

    // Delete user (soft delete)
    const deleteUser = async (userId: string) => {
        try {
            const { error } = await supabase
                .from('users')
                .update({ is_active: false })
                .eq('id', userId);

            if (error) throw error;

            // Refresh users
            await fetchUsers();
        } catch (err: any) {
            console.error('Error deleting user:', err);
            throw err;
        }
    };

    // Subscribe to real-time changes
    useEffect(() => {
        fetchUsers();

        // Set up real-time subscription
        const subscription = supabase
            .channel('users_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
                fetchUsers();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return {
        users,
        loading,
        error,
        createUser,
        updateUser,
        deleteUser,
        refetch: fetchUsers,
    };
}
