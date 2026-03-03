-- ============================================================
-- Migración: Agregar columna roles[] a tabla users
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 1. Agregar columna roles (text array) si no existe
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS roles text[] DEFAULT NULL;

-- 2. Rellenar roles a partir del campo role existente para todos
--    los usuarios que no tengan roles asignados todavía
UPDATE users
  SET roles = ARRAY[role]
  WHERE roles IS NULL OR array_length(roles, 1) IS NULL;

-- 3. Verificar resultado
SELECT id, name, role, roles FROM users ORDER BY name;
