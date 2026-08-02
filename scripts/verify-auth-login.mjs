// Verifies that a migrated user can sign in via Supabase Auth using their
// EXISTING credentials, exactly as the app will do post-migration. Never
// prints the password. Usage:
//   node --env-file=.env.local scripts/verify-auth-login.mjs <username>

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const usernameArg = process.argv[2];

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('Missing env vars in .env.local');
    process.exit(1);
}
if (!usernameArg) {
    console.error('Usage: node --env-file=.env.local scripts/verify-auth-login.mjs <username>');
    process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
const anon = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });

const run = async () => {
    const { data: user, error } = await admin
        .from('users')
        .select('email, password, auth_user_id')
        .eq('username', usernameArg)
        .single();

    if (error || !user) {
        console.error('Usuario no encontrado:', error?.message);
        process.exit(1);
    }
    if (!user.auth_user_id) {
        console.error('Este usuario aún no tiene auth_user_id (no migrado).');
        process.exit(1);
    }

    const { data: signInData, error: signInError } = await anon.auth.signInWithPassword({
        email: user.email,
        password: user.password,
    });

    if (signInError) {
        console.error(`FALLÓ el login para ${usernameArg}:`, signInError.message);
        process.exit(1);
    }

    console.log(`OK: ${usernameArg} inició sesión correctamente vía Supabase Auth.`);
    console.log(`auth.uid() = ${signInData.user.id} (coincide con users.auth_user_id: ${signInData.user.id === user.auth_user_id})`);
    await anon.auth.signOut();
};

run();
