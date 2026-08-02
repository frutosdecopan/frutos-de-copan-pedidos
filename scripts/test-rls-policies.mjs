// Automated verification that the new RLS policies scope data correctly per
// role, using throwaway test users/orders (no real credentials needed).
// Cleans up everything it creates, including on failure.
//
// Usage: node --env-file=.env.local scripts/test-rls-policies.mjs

import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const CITY_A = 'a1a1a1a1-b1b1-c1c1-d1d1-e1e1e1e1e1e1'; // La Ceiba
const CITY_B = 'a2a2a2a2-b2b2-c2c2-d2d2-e2e2e2e2e2e2'; // San Pedro Sula

const cleanup = { authIds: [], profileIds: [], orderIds: [] };

const makeTestUser = async (label, role, assignedCities) => {
    const email = `rls_test_${label}_${Date.now()}@frutos.com`;
    const password = 'RlsTest' + Math.random().toString(36).slice(2) + '!9';
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
    });
    if (authError) throw new Error(`createUser(${label}): ${authError.message}`);
    cleanup.authIds.push(authUser.user.id);

    const { data: profile, error: profileError } = await admin.from('users').insert({
        name: `RLS Test ${label}`, username: `rlstest_${label}_${Date.now()}`, email,
        role, roles: [role], assigned_cities: assignedCities, is_active: true,
        auth_user_id: authUser.user.id,
    }).select('id').single();
    if (profileError) throw new Error(`profile insert(${label}): ${profileError.message}`);
    cleanup.profileIds.push(profile.id);

    const client = createClient(url, anonKey, { auth: { persistSession: false } });
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    if (signInError) throw new Error(`signIn(${label}): ${signInError.message}`);

    return { client, profileId: profile.id, authId: authUser.user.id };
};

const makeTestOrder = async (id, cityId, userId, deliveryId = null) => {
    const { error } = await admin.from('orders').insert({
        id, user_id: userId, user_name: 'RLS Test', client_name: 'RLS Test Client',
        origin_city_name: 'Test', order_type: 'Venta', destination_name: 'Test',
        city_id: cityId, city_name: 'Test', warehouse_id: null, warehouse_name: 'Test',
        status: 'Enviado', assigned_delivery_id: deliveryId,
    });
    if (error) throw new Error(`order insert(${id}): ${error.message}`);
    cleanup.orderIds.push(id);
};

const check = (label, condition) => {
    console.log(`${condition ? 'PASS' : 'FAIL'} — ${label}`);
    if (!condition) process.exitCode = 1;
};

const run = async () => {
    try {
        // 1. Anon (no session) should see nothing.
        const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });
        const { data: anonOrders } = await anonClient.from('orders').select('id');
        check('anon (sin sesión) no ve ningún pedido', (anonOrders || []).length === 0);
        const { data: anonUsers } = await anonClient.from('users').select('id');
        check('anon (sin sesión) no ve la tabla users', (anonUsers || []).length === 0);

        // 2. Set up test users.
        const seller = await makeTestUser('seller', 'Vendedor', [CITY_A]);
        const warehouseA = await makeTestUser('whA', 'Bodega', [CITY_A]);
        const delivery = await makeTestUser('delivery', 'Repartidor', [CITY_A]);
        const adminUser = await makeTestUser('admin', 'Administrador', []);

        // 3. Set up test orders: one in city A (seller's own), one in city B.
        await makeTestOrder('RLSTEST-A', CITY_A, seller.profileId, delivery.profileId);
        await makeTestOrder('RLSTEST-B', CITY_B, 'e4e4e4e4-e4e4-e4e4-e4e4-e4e4e4e4e4e4', null);

        // 4. Seller: sees only their own order, not the city-B one, even though it's not theirs.
        const { data: sellerOrders } = await seller.client.from('orders').select('id');
        const sellerIds = (sellerOrders || []).map(o => o.id);
        check('Vendedor ve su propio pedido (RLSTEST-A)', sellerIds.includes('RLSTEST-A'));
        check('Vendedor NO ve el pedido de otra ciudad/vendedor (RLSTEST-B)', !sellerIds.includes('RLSTEST-B'));

        // 5. Warehouse (assigned to city A only): sees city A order, not city B order.
        const { data: whOrders } = await warehouseA.client.from('orders').select('id');
        const whIds = (whOrders || []).map(o => o.id);
        check('Bodega (ciudad A) ve el pedido de su ciudad (RLSTEST-A)', whIds.includes('RLSTEST-A'));
        check('Bodega (ciudad A) NO ve el pedido de otra ciudad (RLSTEST-B)', !whIds.includes('RLSTEST-B'));

        // 6. Delivery: sees only the order assigned to them.
        const { data: delOrders } = await delivery.client.from('orders').select('id');
        const delIds = (delOrders || []).map(o => o.id);
        check('Repartidor ve el pedido que tiene asignado (RLSTEST-A)', delIds.includes('RLSTEST-A'));
        check('Repartidor NO ve el pedido no asignado a él (RLSTEST-B)', !delIds.includes('RLSTEST-B'));

        // 7. Admin: sees everything.
        const { data: adminOrders } = await adminUser.client.from('orders').select('id');
        const adminIds = (adminOrders || []).map(o => o.id);
        check('Administrador ve ambos pedidos de prueba', adminIds.includes('RLSTEST-A') && adminIds.includes('RLSTEST-B'));

        // 8. Non-admin can't write to users table (e.g. seller trying to deactivate someone).
        // Postgres RLS silently affects 0 rows on a blocked UPDATE rather than raising an
        // error, so the correct check is "no rows were returned/changed", not "error is set".
        const { data: forbiddenWriteData } = await seller.client.from('users').update({ is_active: false }).eq('id', warehouseA.profileId).select();
        check('Vendedor NO puede escribir en la tabla users (bloqueado por RLS)', (forbiddenWriteData || []).length === 0);

        console.log('\nTodas las verificaciones completadas.');
    } finally {
        console.log('\nLimpiando datos de prueba...');
        for (const id of cleanup.orderIds) {
            await admin.from('orders').delete().eq('id', id);
        }
        for (const id of cleanup.profileIds) {
            await admin.from('users').delete().eq('id', id);
        }
        for (const id of cleanup.authIds) {
            await admin.auth.admin.deleteUser(id);
        }
        console.log('Limpieza completa.');
    }
};

run();
