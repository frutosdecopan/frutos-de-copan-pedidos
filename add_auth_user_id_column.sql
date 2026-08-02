-- ============================================================
-- Frutos de Copán - Vincular users con Supabase Auth
-- Ejecutar en el SQL Editor de Supabase ANTES de correr el
-- script de migración scripts/migrate-users-to-auth.mjs
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id);

-- Verificación
SELECT id, name, username, email, auth_user_id FROM public.users ORDER BY name;
