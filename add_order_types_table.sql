-- =============================================
-- Frutos de Copán — Order Types Table
-- Migration: add_order_types_table.sql
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- =============================================

-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS order_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- DATOS INICIALES (equivalentes al enum original)
-- =============================================

INSERT INTO order_types (name, active) VALUES
  ('Venta',        TRUE),
  ('Degustación',  TRUE),
  ('Cambio',       TRUE),
  ('Muestra',      TRUE),
  ('Promoción',    TRUE),
  ('Donación',     TRUE)
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- ÍNDICES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_order_types_active ON order_types(active);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE order_types ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes antes de recrearlas (evita error de duplicado)
DROP POLICY IF EXISTS "Enable read access for all users"  ON order_types;
DROP POLICY IF EXISTS "Enable insert for all users"       ON order_types;
DROP POLICY IF EXISTS "Enable update for all users"       ON order_types;
DROP POLICY IF EXISTS "Enable delete for all users"       ON order_types;

-- Recrear políticas limpias
CREATE POLICY "Enable read access for all users" ON order_types
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON order_types
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON order_types
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON order_types
  FOR DELETE USING (true);

-- =============================================
-- VERIFICACIÓN — Debe mostrar 6 registros
-- =============================================

SELECT id, name, active, created_at
FROM order_types
ORDER BY name;
