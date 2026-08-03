import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Please check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Several hooks each need to wait for Supabase to finish restoring a
// persisted session before firing their first query (otherwise it can go
// out as an anonymous request and RLS silently returns 0 rows). Rather than
// every hook calling supabase.auth.getSession() independently on mount —
// which stampedes 7+ concurrent calls through the same auth lock and, on a
// slow/flaky connection, can leave every one of them waiting minutes on a
// single stuck token refresh — they all await this ONE shared promise. A
// hard timeout caps the wait so a stuck getSession() can never block the
// app's initial load indefinitely; each hook's own polling fallback picks
// up the data shortly after if the session was still restoring at that point.
export const sessionReady: Promise<void> = Promise.race([
    supabase.auth.getSession().then(() => undefined),
    new Promise<void>(resolve => setTimeout(resolve, 6000)),
]).catch(() => undefined);
