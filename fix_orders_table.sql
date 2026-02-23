-- =============================================
-- Frutos de Copán — Fix Orders Table
-- Migration: fix_orders_table.sql
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- =============================================
-- PROBLEMA: La columna order_type es un ENUM de PostgreSQL
-- que rechaza valores dinámicos (ej: 'Inventario').
-- También faltan columnas: client_rtn, client_phone, delivery_date
-- =============================================

-- 1. Cambiar order_type de ENUM a TEXT (acepta cualquier string)
ALTER TABLE orders
  ALTER COLUMN order_type TYPE TEXT;

-- 2. Agregar columnas opcionales si no existen todavía
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS client_rtn TEXT,
  ADD COLUMN IF NOT EXISTS client_phone TEXT,
  ADD COLUMN IF NOT EXISTS delivery_date DATE;

-- =============================================
-- VERIFICACIÓN — debe mostrar las columnas actualizadas
-- =============================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name IN ('order_type', 'client_rtn', 'client_phone', 'delivery_date')
ORDER BY column_name;
