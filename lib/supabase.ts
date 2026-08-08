import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Please check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─────────────────────────────────────────────────────────────────────────
// Auditoría de carga (2026-08): desde que se activó RLS ("TO authenticated"
// en todas las políticas — ver enable_rls_policies_v2.sql), cada consulta
// depende de tener un JWT válido y vigente. Antes de RLS esto era invisible
// porque las políticas eran abiertas; ahora, cualquier problema de sesión
// (falla silenciosa del refresh automático del token, refresh token
// revocado/expirado tras mucho tiempo en background en el celular, etc.)
// hace que TODAS las consultas devuelvan 0 filas sin ningún error — RLS
// simplemente no encuentra ninguna política que aplique a un rol "anon" o a
// un JWT inválido. El código anterior nunca escuchaba los eventos de auth
// (no había ningún onAuthStateChange en toda la app), así que la aplicación
// no tenía forma de notar que esto había pasado; el usuario solo veía datos
// vacíos/desactualizados para siempre, hasta cerrar y volver a abrir la app
// (lo que fuerza un getSession() nuevo con más chance de éxito).
//
// Este listener central: (1) dota a `sessionReady` de una señal real en vez
// de un timeout a ciegas, y (2) deja evidencia en consola de cada evento de
// auth (login, refresh, cierre de sesión) con expires_at, para poder
// diagnosticar el próximo incidente con datos reales en vez de conjeturas.
// ─────────────────────────────────────────────────────────────────────────
let resolveSessionReady: () => void;
export const sessionReady: Promise<void> = new Promise(resolve => { resolveSessionReady = resolve; });

// Red de seguridad: si por alguna razón el primer evento de auth nunca
// llega, no dejar a los hooks esperando para siempre. En condiciones
// normales el evento real llega mucho antes que esto.
const sessionReadyTimeoutId = setTimeout(() => resolveSessionReady(), 8000);

let sawFirstAuthEvent = false;

supabase.auth.onAuthStateChange((event, session) => {
    console.log(`[Auth] ${event}`, {
        userId: session?.user?.id ?? null,
        expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
        at: new Date().toISOString(),
    });

    if (!sawFirstAuthEvent) {
        sawFirstAuthEvent = true;
        clearTimeout(sessionReadyTimeoutId);
        resolveSessionReady();
    }
});
