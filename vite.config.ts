import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      // NOTE: GEMINI_API_KEY is intentionally NOT inlined into the client bundle here.
      // It's a paid API key — never expose it client-side. The AI report feature
      // (services/geminiService.ts) stays gracefully disabled until it's wired
      // through a server-side proxy (Vercel function / Edge Function) that keeps
      // the key secret — see api/manage-users.ts for the same pattern applied
      // to another server-side-only secret (SUPABASE_SERVICE_ROLE_KEY).
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
