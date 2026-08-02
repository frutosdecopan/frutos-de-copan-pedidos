// One-time migration: create a Supabase Auth account for every row in `users`,
// reusing each user's EXISTING email + plaintext password so login credentials
// don't change for anyone. Idempotent: safe to re-run, skips users that already
// have an auth_user_id set.
//
// Run with: node --env-file=.env.local scripts/migrate-users-to-auth.mjs
// Requires SUPABASE_SERVICE_ROLE_KEY and VITE_SUPABASE_URL in .env.local.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
});

const run = async () => {
    const { data: users, error } = await admin
        .from('users')
        .select('id, name, username, email, password, auth_user_id')
        .order('name');

    if (error) {
        console.error('Error reading users table:', error.message);
        process.exit(1);
    }

    console.log(`Found ${users.length} users.`);

    let created = 0, skipped = 0, failed = 0;

    for (const u of users) {
        if (u.auth_user_id) {
            console.log(`- ${u.name} (${u.username}): ya migrado, saltando.`);
            skipped++;
            continue;
        }
        if (!u.email) {
            console.error(`- ${u.name} (${u.username}): SIN EMAIL, no se puede migrar. Requiere atención manual.`);
            failed++;
            continue;
        }

        const { data: created_user, error: createError } = await admin.auth.admin.createUser({
            email: u.email,
            password: u.password,
            email_confirm: true,
            user_metadata: { username: u.username, name: u.name },
        });

        if (createError) {
            // If the auth user already exists (e.g. partial re-run), look it up and link it instead of failing.
            if (createError.message?.toLowerCase().includes('already') || createError.status === 422) {
                const { data: list, error: listError } = await admin.auth.admin.listUsers();
                const existing = !listError && list.users.find(au => au.email === u.email);
                if (existing) {
                    const { error: linkError } = await admin.from('users').update({ auth_user_id: existing.id }).eq('id', u.id);
                    if (linkError) {
                        console.error(`- ${u.name} (${u.username}): auth user ya existía pero no se pudo vincular: ${linkError.message}`);
                        failed++;
                    } else {
                        console.log(`- ${u.name} (${u.username}): auth user ya existía, vinculado.`);
                        created++;
                    }
                    continue;
                }
            }
            console.error(`- ${u.name} (${u.username}): error creando auth user: ${createError.message}`);
            failed++;
            continue;
        }

        const { error: linkError } = await admin
            .from('users')
            .update({ auth_user_id: created_user.user.id })
            .eq('id', u.id);

        if (linkError) {
            console.error(`- ${u.name} (${u.username}): auth user creado pero no se pudo vincular: ${linkError.message}`);
            failed++;
            continue;
        }

        console.log(`- ${u.name} (${u.username}): migrado correctamente.`);
        created++;
    }

    console.log(`\nResumen: ${created} migrados, ${skipped} ya migrados, ${failed} con error.`);
    if (failed > 0) process.exit(1);
};

run();
