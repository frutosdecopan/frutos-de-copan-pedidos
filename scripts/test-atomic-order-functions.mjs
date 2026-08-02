// Verifies create_order_with_items / update_order_with_items work end-to-end
// through a real authenticated (RLS-scoped) session, using throwaway data.
// Usage: node --env-file=.env.local scripts/test-atomic-order-functions.mjs

import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const CITY_ID = 'a4a4a4a4-b4b4-c4c4-d4d4-e4e4e4e4e4e4'; // Copán
const WAREHOUSE_ID = 'f4f4f4f4-a4a4-b4b4-c4c4-d4d4d4d4d4d4';
const PRODUCT_ID = '11111111-1111-1111-1111-111111111111'; // Mango
const PRESENTATION_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'; // Libra

const check = (label, condition) => {
    console.log(`${condition ? 'PASS' : 'FAIL'} — ${label}`);
    if (!condition) process.exitCode = 1;
};

const cleanup = { authIds: [], profileIds: [], orderIds: [] };

const run = async () => {
    try {
        const email = `rpc_test_seller_${Date.now()}@frutos.com`;
        const password = 'RpcTest' + Math.random().toString(36).slice(2) + '!9';
        const { data: authUser, error: authError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
        if (authError) throw new Error(authError.message);
        cleanup.authIds.push(authUser.user.id);

        const { data: profile, error: profileError } = await admin.from('users').insert({
            name: 'RPC Test Seller', username: `rpctest_${Date.now()}`, email,
            role: 'Vendedor', roles: ['Vendedor'], assigned_cities: [CITY_ID], is_active: true,
            auth_user_id: authUser.user.id,
        }).select('id').single();
        if (profileError) throw new Error(profileError.message);
        cleanup.profileIds.push(profile.id);

        const client = createClient(url, anonKey, { auth: { persistSession: false } });
        const { error: signInError } = await client.auth.signInWithPassword({ email, password });
        if (signInError) throw new Error(signInError.message);

        // 1. Create order via RPC
        const { data: orderId, error: createError } = await client.rpc('create_order_with_items', {
            p_user_id: profile.id,
            p_user_name: 'RPC Test Seller',
            p_client_name: 'Cliente de Prueba RPC',
            p_client_rtn: null,
            p_client_phone: null,
            p_origin_city_name: 'Copán',
            p_order_type: 'Venta',
            p_destination_name: 'Copán Ruinas',
            p_city_id: CITY_ID,
            p_city_name: 'Copán',
            p_warehouse_id: WAREHOUSE_ID,
            p_warehouse_name: 'Bodega Principal Copán',
            p_status: 'Enviado',
            p_delivery_date: null,
            p_items: [{ productId: PRODUCT_ID, productName: 'Mango', presentationId: PRESENTATION_ID, presentationName: 'Libra', quantity: 5 }],
        });
        check('create_order_with_items no da error', !createError);
        check('create_order_with_items devuelve un ID', typeof orderId === 'string' && orderId.startsWith('ORD-'));
        if (createError) throw new Error(createError.message);
        cleanup.orderIds.push(orderId);

        const { data: itemsAfterCreate } = await admin.from('order_items').select('quantity, product_name').eq('order_id', orderId);
        check('el pedido tiene 1 item con cantidad 5', itemsAfterCreate?.length === 1 && itemsAfterCreate[0].quantity === 5);

        const { data: logsAfterCreate } = await admin.from('order_logs').select('message').eq('order_id', orderId);
        check('se registró el log "Pedido creado"', logsAfterCreate?.some(l => l.message === 'Pedido creado'));

        // 2. Update order via RPC — replace items with a different quantity/product mix
        const { error: updateError } = await client.rpc('update_order_with_items', {
            p_order_id: orderId,
            p_client_name: 'Cliente de Prueba RPC Editado',
            p_client_rtn: null,
            p_client_phone: null,
            p_destination_name: 'Copán Ruinas',
            p_order_type: 'Venta',
            p_warehouse_id: WAREHOUSE_ID,
            p_warehouse_name: 'Bodega Principal Copán',
            p_city_id: CITY_ID,
            p_city_name: 'Copán',
            p_status: 'Enviado',
            p_delivery_date: null,
            p_user_name: 'RPC Test Seller',
            p_items: [{ productId: PRODUCT_ID, productName: 'Mango', presentationId: PRESENTATION_ID, presentationName: 'Libra', quantity: 12 }],
        });
        check('update_order_with_items no da error', !updateError);

        const { data: itemsAfterUpdate } = await admin.from('order_items').select('quantity').eq('order_id', orderId);
        check('tras editar, sigue habiendo exactamente 1 item (reemplazado, no duplicado)', itemsAfterUpdate?.length === 1);
        check('la cantidad se actualizó a 12', itemsAfterUpdate?.[0]?.quantity === 12);

        const { data: orderAfterUpdate } = await admin.from('orders').select('client_name').eq('id', orderId).single();
        check('el nombre del cliente se actualizó', orderAfterUpdate?.client_name === 'Cliente de Prueba RPC Editado');

        // 3. Update a non-existent/inaccessible order should raise, not silently succeed
        const { error: badUpdateError } = await client.rpc('update_order_with_items', {
            p_order_id: 'ORD-DOES-NOT-EXIST',
            p_client_name: 'x', p_client_rtn: null, p_client_phone: null,
            p_destination_name: 'x', p_order_type: 'Venta', p_warehouse_id: WAREHOUSE_ID,
            p_warehouse_name: 'x', p_city_id: CITY_ID, p_city_name: 'x', p_status: 'Enviado',
            p_delivery_date: null, p_user_name: 'x', p_items: [],
        });
        check('editar un pedido inexistente da error (no falla en silencio)', !!badUpdateError);

        console.log('\nTodas las verificaciones completadas.');
    } finally {
        console.log('\nLimpiando datos de prueba...');
        for (const id of cleanup.orderIds) await admin.from('orders').delete().eq('id', id);
        for (const id of cleanup.profileIds) await admin.from('users').delete().eq('id', id);
        for (const id of cleanup.authIds) await admin.auth.admin.deleteUser(id);
        console.log('Limpieza completa.');
    }
};

run();
