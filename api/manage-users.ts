import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Privileged user-management operations (create account, change password) that
// require the Supabase service_role key — this must run server-side only.
// The caller must be an authenticated, active Administrador; verified below
// using their own access token before any service_role operation runs.

const supabaseUrl = process.env.VITE_SUPABASE_URL as string;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
});

const jsonError = (res: VercelResponse, status: number, error: string) => {
    res.status(status).json({ error });
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return jsonError(res, 405, 'Method not allowed');
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
        return jsonError(res, 401, 'No autenticado');
    }

    const { data: callerAuth, error: callerAuthError } = await admin.auth.getUser(token);
    if (callerAuthError || !callerAuth.user) {
        return jsonError(res, 401, 'Sesión inválida');
    }

    const { data: callerProfile, error: callerProfileError } = await admin
        .from('users')
        .select('id, roles, role, is_active')
        .eq('auth_user_id', callerAuth.user.id)
        .single();

    const callerRoles: string[] = (callerProfile?.roles && callerProfile.roles.length > 0)
        ? callerProfile.roles
        : (callerProfile?.role ? [callerProfile.role] : []);

    if (callerProfileError || !callerProfile || callerProfile.is_active === false || !callerRoles.includes('Administrador')) {
        return jsonError(res, 403, 'Solo un administrador puede realizar esta acción');
    }

    const body = req.body || {};
    const { action } = body;

    try {
        if (action === 'create') {
            const { name, username, password, role, roles, assignedCities, unavailableDates, isActive } = body;

            if (!name?.trim() || !username?.trim() || !password || password.length < 6) {
                return jsonError(res, 400, 'Datos incompletos o contraseña muy corta (mínimo 6 caracteres)');
            }

            const { data: existing } = await admin
                .from('users')
                .select('id')
                .ilike('username', username)
                .maybeSingle();
            if (existing) {
                return jsonError(res, 409, 'El nombre de usuario ya existe');
            }

            const email = `${username}@frutos.com`;

            const { data: newAuthUser, error: createAuthError } = await admin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { username, name },
            });

            if (createAuthError || !newAuthUser.user) {
                return jsonError(res, 400, createAuthError?.message || 'Error creando la cuenta');
            }

            const { data: newProfile, error: insertError } = await admin
                .from('users')
                .insert({
                    name,
                    username,
                    email,
                    role: (roles && roles[0]) || role,
                    roles: roles && roles.length > 0 ? roles : [role],
                    assigned_cities: assignedCities || [],
                    unavailable_dates: unavailableDates || [],
                    is_active: isActive !== false,
                    auth_user_id: newAuthUser.user.id,
                })
                .select('id')
                .single();

            if (insertError) {
                // Roll back the auth account so we don't leave an orphaned login with no profile.
                await admin.auth.admin.deleteUser(newAuthUser.user.id);
                return jsonError(res, 400, insertError.message);
            }

            return res.status(200).json({ id: newProfile.id });
        }

        if (action === 'update') {
            const { userId, name, username, password, role, roles, assignedCities, unavailableDates, isActive } = body;

            if (!userId) return jsonError(res, 400, 'Falta userId');

            const { data: target, error: targetError } = await admin
                .from('users')
                .select('id, username, email, auth_user_id')
                .eq('id', userId)
                .single();

            if (targetError || !target) {
                return jsonError(res, 404, 'Usuario no encontrado');
            }

            const updateData: Record<string, unknown> = {};
            let newEmail: string | undefined;

            if (name?.trim()) updateData.name = name;
            if (username?.trim() && username !== target.username) {
                const { data: existing } = await admin
                    .from('users')
                    .select('id')
                    .ilike('username', username)
                    .neq('id', userId)
                    .maybeSingle();
                if (existing) return jsonError(res, 409, 'El nombre de usuario ya existe');

                updateData.username = username;
                newEmail = `${username}@frutos.com`;
                updateData.email = newEmail;
            }
            if (roles && roles.length > 0) {
                updateData.roles = roles;
                updateData.role = roles[0];
            } else if (role) {
                updateData.role = role;
                updateData.roles = [role];
            }
            if (assignedCities) updateData.assigned_cities = assignedCities;
            if (unavailableDates !== undefined) updateData.unavailable_dates = unavailableDates;
            if (isActive !== undefined) updateData.is_active = isActive;

            if (target.auth_user_id && (password || newEmail)) {
                const authUpdate: Record<string, unknown> = {};
                if (password) {
                    if (password.length < 6) return jsonError(res, 400, 'La contraseña debe tener al menos 6 caracteres');
                    authUpdate.password = password;
                }
                if (newEmail) authUpdate.email = newEmail;

                const { error: authUpdateError } = await admin.auth.admin.updateUserById(target.auth_user_id, authUpdate);
                if (authUpdateError) return jsonError(res, 400, authUpdateError.message);
            }

            if (Object.keys(updateData).length > 0) {
                const { error: updateError } = await admin.from('users').update(updateData).eq('id', userId);
                if (updateError) return jsonError(res, 400, updateError.message);
            }

            return res.status(200).json({ ok: true });
        }

        return jsonError(res, 400, 'Acción no reconocida');
    } catch (err: any) {
        console.error('manage-users error:', err);
        return jsonError(res, 500, 'Error interno del servidor');
    }
}
