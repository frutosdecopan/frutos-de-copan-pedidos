// Ad-hoc test for api/manage-users.ts business logic, without needing a running
// Vercel dev server. Signs in as an existing admin to get a real access token,
// then calls the handler directly with mock req/res objects.
//
// Usage: node --env-file=.env.local scripts/test-manage-users.mjs <admin-username> <admin-password>

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const [adminUsername, adminPassword] = process.argv.slice(2);

if (!adminUsername || !adminPassword) {
    console.error('Usage: node --env-file=.env.local scripts/test-manage-users.mjs <admin-username> <admin-password>');
    process.exit(1);
}

const anon = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });

const run = async () => {
    const { data: lookup } = await anon.rpc('get_login_email', { p_identifier: adminUsername });
    if (!lookup || lookup.length === 0) { console.error('Admin no encontrado'); process.exit(1); }

    const { data: signInData, error: signInError } = await anon.auth.signInWithPassword({
        email: lookup[0].email,
        password: adminPassword,
    });
    if (signInError) { console.error('Login falló:', signInError.message); process.exit(1); }

    const token = signInData.session.access_token;
    console.log('Token de admin obtenido.');

    const { default: handler } = await import('../api/manage-users.ts');

    const testUsername = `test_temp_${Date.now()}`;
    const mockReq = {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
        body: {
            action: 'create',
            name: 'Usuario Temporal De Prueba',
            username: testUsername,
            password: 'temporal123',
            role: 'Vendedor',
            roles: ['Vendedor'],
            assignedCities: [],
            isActive: true,
        },
    };

    let statusCode = 200;
    let responseBody = null;
    const mockRes = {
        status(code) { statusCode = code; return this; },
        json(body) { responseBody = body; return this; },
    };

    await handler(mockReq, mockRes);
    console.log('CREATE ->', statusCode, responseBody);

    if (statusCode === 200 && responseBody?.id) {
        // Clean up: deactivate the test user we just created.
        const admin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
        const { data: created } = await admin.from('users').select('auth_user_id').eq('id', responseBody.id).single();
        if (created?.auth_user_id) await admin.auth.admin.deleteUser(created.auth_user_id);
        await admin.from('users').delete().eq('id', responseBody.id);
        console.log('Usuario de prueba eliminado (limpieza).');
    }

    await anon.auth.signOut();
};

run();
