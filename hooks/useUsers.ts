import { useState, useEffect } from 'react';
import { supabase, sessionReady } from '../lib/supabase';
import { User, UserRole } from '../types';

const PROFILE_COLUMNS = 'id, name, username, email, role, roles, assigned_cities, unavailable_dates, is_active, auth_user_id';

// Shape of the raw row Supabase returns for `PROFILE_COLUMNS`, before
// `transformUser` maps it to `User`.
interface SupabaseUserRow {
    id: string;
    name: string;
    username: string | null;
    email: string;
    role: string;
    roles: string[] | null;
    assigned_cities: string[] | null;
    unavailable_dates: (string | Date)[] | null;
    is_active: boolean | null;
    auth_user_id: string | null;
}

const transformUser = (user: SupabaseUserRow): User => {
    const rolesArr: UserRole[] = (Array.isArray(user.roles) && user.roles.length > 0)
        ? user.roles as UserRole[]
        : [user.role as UserRole];
    return {
        id: user.id,
        name: user.name,
        username: user.username || '',
        role: rolesArr[0],
        roles: rolesArr,
        assignedCities: user.assigned_cities || [],
        unavailableDates: user.unavailable_dates?.map(d =>
            typeof d === 'string' ? d : new Date(d).toISOString().split('T')[0]
        ) || [],
        isActive: user.is_active !== false,
    };
};

// Calls the privileged /api/manage-users serverless function (uses the Supabase
// service_role key server-side) for operations that touch Supabase Auth accounts
// (creating a user, changing a password) and can't be done from the browser.
const callManageUsers = async (body: Record<string, unknown>) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) throw new Error('Sesión expirada. Vuelve a iniciar sesión.');

    const response = await fetch('/api/manage-users', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(result.error || 'Error al procesar la solicitud');
    }
    return result;
};

export function useUsers() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('users')
                .select(PROFILE_COLUMNS)
                .order('name');

            if (error) throw error;

            setUsers((data || []).map(transformUser));
            setError(null);
        } catch (err: any) {
            console.error('Error fetching users:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Resolve username/name -> email (via RPC, no session required), then
    // authenticate with Supabase Auth, then load the caller's own profile.
    const login = async (identifier: string, password: string): Promise<User> => {
        const { data: lookup, error: lookupError } = await supabase.rpc('get_login_email', {
            p_identifier: identifier,
        });

        if (lookupError || !lookup || lookup.length === 0) {
            throw new Error('Usuario o contraseña incorrectos');
        }

        const { email, is_active } = lookup[0];

        if (!is_active) {
            throw new Error('Este usuario está inactivo. Contacta al administrador.');
        }

        const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (signInError || !authData.user) {
            throw new Error('Usuario o contraseña incorrectos');
        }

        const { data: profile, error: profileError } = await supabase
            .from('users')
            .select(PROFILE_COLUMNS)
            .eq('auth_user_id', authData.user.id)
            .single();

        if (profileError || !profile) {
            await supabase.auth.signOut();
            throw new Error('No se encontró el perfil de este usuario. Contacta al administrador.');
        }

        return transformUser(profile);
    };

    const logout = async () => {
        await supabase.auth.signOut();
    };

    // Restore session on page load / refresh (Supabase persists the session in localStorage).
    const restoreSession = async (): Promise<User | null> => {
        const { data: sessionData } = await supabase.auth.getSession();
        const authUserId = sessionData.session?.user.id;
        if (!authUserId) return null;

        const { data: profile, error: profileError } = await supabase
            .from('users')
            .select(PROFILE_COLUMNS)
            .eq('auth_user_id', authUserId)
            .single();

        if (profileError || !profile) return null;
        return transformUser(profile);
    };

    // Create new user (goes through the serverless function: creating a Supabase
    // Auth account + setting its password requires the service_role key).
    const createUser = async (userData: Omit<User, 'id'>) => {
        try {
            const rolesArr = (userData.roles && userData.roles.length > 0) ? userData.roles : [userData.role];
            await callManageUsers({
                action: 'create',
                name: userData.name,
                username: userData.username,
                password: userData.password,
                role: rolesArr[0],
                roles: rolesArr,
                assignedCities: (userData.assignedCities || []).filter(id => id && id.trim() !== ''),
                unavailableDates: userData.unavailableDates || [],
                isActive: userData.isActive !== false,
            });
            await fetchUsers();
        } catch (err: any) {
            console.error('Error creating user:', err);
            throw err;
        }
    };

    // Update user (goes through the serverless function so a password change,
    // if any, can be applied to the Supabase Auth account with service_role).
    const updateUser = async (userId: string, userData: Partial<User>) => {
        try {
            const rolesArr = (userData.roles && userData.roles.length > 0)
                ? userData.roles
                : (userData.role ? [userData.role] : undefined);

            await callManageUsers({
                action: 'update',
                userId,
                name: userData.name,
                username: userData.username,
                password: userData.password || undefined, // only sent if actually changing
                role: rolesArr?.[0],
                roles: rolesArr,
                assignedCities: userData.assignedCities
                    ? (userData.assignedCities || []).filter(id => id && id.trim() !== '')
                    : undefined,
                unavailableDates: userData.unavailableDates,
                isActive: userData.isActive,
            });
            await fetchUsers();
        } catch (err: any) {
            console.error('Error updating user:', err);
            throw err;
        }
    };

    // Soft delete (deactivate) — no Auth account changes needed.
    const deleteUser = async (userId: string) => {
        try {
            const { error } = await supabase
                .from('users')
                .update({ is_active: false })
                .eq('id', userId);

            if (error) throw error;

            await fetchUsers();
        } catch (err: any) {
            console.error('Error deleting user:', err);
            throw err;
        }
    };

    // Subscribe to real-time changes + polling fallback
    useEffect(() => {
        let active = true;
        // Wait for Supabase to finish restoring a persisted session before the
        // first query — otherwise it can go out as an anonymous request and RLS
        // silently returns 0 rows (no error), which nothing here would retry.
        sessionReady.finally(() => {
            if (active) fetchUsers();
        });

        const subscription = supabase
            .channel('users_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
                fetchUsers();
            })
            .subscribe((status) => {
                console.log('[Realtime] users_channel status:', status);
            });

        const pollInterval = setInterval(() => {
            fetchUsers();
        }, 30000);

        return () => {
            active = false;
            subscription.unsubscribe();
            clearInterval(pollInterval);
        };
    }, []);

    return {
        users,
        loading,
        error,
        login,
        logout,
        restoreSession,
        createUser,
        updateUser,
        deleteUser,
        refetch: fetchUsers,
    };
}
