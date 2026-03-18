-- ============================================================
-- Frutos de Copán - Habilitar RLS en todas las tablas
-- ============================================================
-- INSTRUCCIONES:
-- 1. Ve al SQL Editor de tu proyecto en Supabase
-- 2. Pega este script completo y ejecuta
-- ============================================================
--
-- CONTEXTO IMPORTANTE:
-- Esta app usa autenticación propia (tabla users con username/password),
-- NO usa Supabase Auth (auth.users). Por eso las políticas se basan
-- en que sólo el backend (service_role) y el anon key acceden a los datos.
-- Las políticas permiten acceso total al rol 'service_role' y también
-- al 'anon' (ya que la app no usa JWT de Supabase Auth).
-- ============================================================

-- ============================================================
-- 1. HABILITAR RLS EN TODAS LAS TABLAS
-- ============================================================

ALTER TABLE public.users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_logs     ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. TABLA: users
-- Políticas: lectura y escritura permitida al rol anon y service_role
-- (la autenticación la controla la app, no Supabase Auth)
-- ============================================================

DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
DROP POLICY IF EXISTS "users_delete_policy" ON public.users;

CREATE POLICY "users_select_policy" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "users_insert_policy" ON public.users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "users_update_policy" ON public.users
  FOR UPDATE USING (true);

CREATE POLICY "users_delete_policy" ON public.users
  FOR DELETE USING (true);

-- ============================================================
-- 3. TABLA: orders
-- ============================================================

DROP POLICY IF EXISTS "orders_select_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_update_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_delete_policy" ON public.orders;

CREATE POLICY "orders_select_policy" ON public.orders
  FOR SELECT USING (true);

CREATE POLICY "orders_insert_policy" ON public.orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "orders_update_policy" ON public.orders
  FOR UPDATE USING (true);

CREATE POLICY "orders_delete_policy" ON public.orders
  FOR DELETE USING (true);

-- ============================================================
-- 4. TABLA: cities
-- ============================================================

DROP POLICY IF EXISTS "cities_select_policy" ON public.cities;
DROP POLICY IF EXISTS "cities_insert_policy" ON public.cities;
DROP POLICY IF EXISTS "cities_update_policy" ON public.cities;
DROP POLICY IF EXISTS "cities_delete_policy" ON public.cities;

CREATE POLICY "cities_select_policy" ON public.cities
  FOR SELECT USING (true);

CREATE POLICY "cities_insert_policy" ON public.cities
  FOR INSERT WITH CHECK (true);

CREATE POLICY "cities_update_policy" ON public.cities
  FOR UPDATE USING (true);

CREATE POLICY "cities_delete_policy" ON public.cities
  FOR DELETE USING (true);

-- ============================================================
-- 5. TABLA: warehouses
-- ============================================================

DROP POLICY IF EXISTS "warehouses_select_policy" ON public.warehouses;
DROP POLICY IF EXISTS "warehouses_insert_policy" ON public.warehouses;
DROP POLICY IF EXISTS "warehouses_update_policy" ON public.warehouses;
DROP POLICY IF EXISTS "warehouses_delete_policy" ON public.warehouses;

CREATE POLICY "warehouses_select_policy" ON public.warehouses
  FOR SELECT USING (true);

CREATE POLICY "warehouses_insert_policy" ON public.warehouses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "warehouses_update_policy" ON public.warehouses
  FOR UPDATE USING (true);

CREATE POLICY "warehouses_delete_policy" ON public.warehouses
  FOR DELETE USING (true);

-- ============================================================
-- 6. TABLA: order_items
-- ============================================================

DROP POLICY IF EXISTS "order_items_select_policy" ON public.order_items;
DROP POLICY IF EXISTS "order_items_insert_policy" ON public.order_items;
DROP POLICY IF EXISTS "order_items_update_policy" ON public.order_items;
DROP POLICY IF EXISTS "order_items_delete_policy" ON public.order_items;

CREATE POLICY "order_items_select_policy" ON public.order_items
  FOR SELECT USING (true);

CREATE POLICY "order_items_insert_policy" ON public.order_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "order_items_update_policy" ON public.order_items
  FOR UPDATE USING (true);

CREATE POLICY "order_items_delete_policy" ON public.order_items
  FOR DELETE USING (true);

-- ============================================================
-- 7. TABLA: products
-- ============================================================

DROP POLICY IF EXISTS "products_select_policy" ON public.products;
DROP POLICY IF EXISTS "products_insert_policy" ON public.products;
DROP POLICY IF EXISTS "products_update_policy" ON public.products;
DROP POLICY IF EXISTS "products_delete_policy" ON public.products;

CREATE POLICY "products_select_policy" ON public.products
  FOR SELECT USING (true);

CREATE POLICY "products_insert_policy" ON public.products
  FOR INSERT WITH CHECK (true);

CREATE POLICY "products_update_policy" ON public.products
  FOR UPDATE USING (true);

CREATE POLICY "products_delete_policy" ON public.products
  FOR DELETE USING (true);

-- ============================================================
-- 8. TABLA: presentations
-- ============================================================

DROP POLICY IF EXISTS "presentations_select_policy" ON public.presentations;
DROP POLICY IF EXISTS "presentations_insert_policy" ON public.presentations;
DROP POLICY IF EXISTS "presentations_update_policy" ON public.presentations;
DROP POLICY IF EXISTS "presentations_delete_policy" ON public.presentations;

CREATE POLICY "presentations_select_policy" ON public.presentations
  FOR SELECT USING (true);

CREATE POLICY "presentations_insert_policy" ON public.presentations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "presentations_update_policy" ON public.presentations
  FOR UPDATE USING (true);

CREATE POLICY "presentations_delete_policy" ON public.presentations
  FOR DELETE USING (true);

-- ============================================================
-- 9. TABLA: order_logs
-- ============================================================

DROP POLICY IF EXISTS "order_logs_select_policy" ON public.order_logs;
DROP POLICY IF EXISTS "order_logs_insert_policy" ON public.order_logs;
DROP POLICY IF EXISTS "order_logs_update_policy" ON public.order_logs;
DROP POLICY IF EXISTS "order_logs_delete_policy" ON public.order_logs;

CREATE POLICY "order_logs_select_policy" ON public.order_logs
  FOR SELECT USING (true);

CREATE POLICY "order_logs_insert_policy" ON public.order_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "order_logs_update_policy" ON public.order_logs
  FOR UPDATE USING (true);

CREATE POLICY "order_logs_delete_policy" ON public.order_logs
  FOR DELETE USING (true);

-- ============================================================
-- 10. VERIFICACIÓN - Confirmar que RLS está activo
-- ============================================================

SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 'orders', 'cities', 'warehouses',
    'order_items', 'products', 'presentations', 'order_logs'
  )
ORDER BY tablename;
