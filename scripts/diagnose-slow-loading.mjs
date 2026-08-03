// Measures real wall-clock latency for the exact queries the app fires on
// load (login, fetch users, fetch orders page 0), through a real anon-key
// session (mirrors actual RLS-scoped behavior), to find where the reported
// multi-minute load time is actually going.
// Usage: node --env-file=.env.local scripts/diagnose-slow-loading.mjs

import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const PROFILE_COLUMNS = 'id, name, username, email, role, roles, assigned_cities, unavailable_dates, is_active, auth_user_id';
const CITY_ID = 'a4a4a4a4-b4b4-c4c4-d4d4-e4e4e4e4e4e4'; // Copán

const time = async (label, fn) => {
    const start = Date.now();
    const result = await fn();
    const ms = Date.now() - start;
    console.log(`${ms >= 3000 ? 'SLOW' : 'OK  '} ${label}: ${ms} ms`);
    return result;
};

const cleanup = { authIds: [], profileIds: [] };

const run = async () => {
    try {
        console.log('--- Volumen de datos (via service_role) ---');
        const { count: ordersCount } = await admin.from('orders').select('*', { count: 'exact', head: true });
        const { count: usersCount } = await admin.from('users').select('*', { count: 'exact', head: true });
        const { count: commentsCount } = await admin.from('order_comments').select('*', { count: 'exact', head: true });
        const { count: logsCount } = await admin.from('order_logs').select('*', { count: 'exact', head: true });
        console.log(`orders: ${ordersCount}, users: ${usersCount}, order_comments: ${commentsCount}, order_logs: ${logsCount}`);

        console.log('\n--- Creando sesión de prueba (Vendedor) ---');
        const email = `diag_seller_${Date.now()}@frutos.com`;
        const password = 'DiagTest' + Math.random().toString(36).slice(2) + '!9';
        const { data: authUser, error: authError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
        if (authError) throw new Error(authError.message);
        cleanup.authIds.push(authUser.user.id);

        const { data: profile, error: profileError } = await admin.from('users').insert({
            name: 'Diag Test Seller', username: `diagtest_${Date.now()}`, email,
            role: 'Vendedor', roles: ['Vendedor'], assigned_cities: [CITY_ID], is_active: true,
            auth_user_id: authUser.user.id,
        }).select('id').single();
        if (profileError) throw new Error(profileError.message);
        cleanup.profileIds.push(profile.id);

        const client = createClient(url, anonKey, { auth: { persistSession: false } });

        console.log('\n--- Tiempos reales (sesión anon-key, como en la app) ---');
        await time('auth.signInWithPassword', () => client.auth.signInWithPassword({ email, password }));

        await time('getSession (post-login)', () => client.auth.getSession());

        await time('fetchUsers (SELECT PROFILE_COLUMNS ORDER BY name)', () =>
            client.from('users').select(PROFILE_COLUMNS).order('name')
        );

        await time('fetchOrders page 0 (join items/logs/comments, range 0-49)', () =>
            client.from('orders')
                .select(`
                    *,
                    order_items (id, product_id, product_name, presentation_id, presentation_name, quantity),
                    order_logs (timestamp, message, user_name),
                    order_comments (id, user_id, user_name, content, created_at)
                `)
                .order('created_at', { ascending: false })
                .range(0, 49)
        );

        await time('fetchCities (join warehouses)', () =>
            client.from('cities').select('*, warehouses (*)').order('name')
        );

        // Repeat once more to see if a second request is fast (rules out one-time cold start)
        console.log('\n--- Segunda pasada (mismos requests, para ver si el problema es de "arranque en frío") ---');
        await time('fetchUsers #2', () => client.from('users').select(PROFILE_COLUMNS).order('name'));
        await time('fetchOrders #2', () =>
            client.from('orders')
                .select(`*, order_items(id), order_logs(timestamp), order_comments(id)`)
                .order('created_at', { ascending: false })
                .range(0, 49)
        );

        console.log('\nDiagnóstico completo.');
    } finally {
        console.log('\nLimpiando datos de prueba...');
        for (const id of cleanup.profileIds) await admin.from('users').delete().eq('id', id);
        for (const id of cleanup.authIds) await admin.auth.admin.deleteUser(id);
        console.log('Limpieza completa.');
    }
};

run();
