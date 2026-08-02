-- ============================================================
-- Frutos de Copán — RLS real por rol (reemplaza enable_rls_policies.sql)
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de confirmar que el
-- login (Supabase Auth) ya funciona correctamente.
--
-- A partir de aquí, el rol 'anon' (sin sesión) ya NO puede leer ni
-- escribir nada, salvo la función get_login_email (necesaria para
-- poder iniciar sesión). Todo lo demás requiere sesión autenticada,
-- y los pedidos se filtran por rol/ciudad/vendedor/repartidor igual
-- que ya hace la interfaz — pero ahora también a nivel de base de datos.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Helper: acceso a un pedido según el rol del usuario autenticado
--    SECURITY DEFINER evita problemas de recursión al consultar users.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_access_order(
  p_city_id uuid,
  p_user_id uuid,
  p_assigned_delivery_id uuid
) RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.is_active = true
      AND (
        'Administrador' = ANY(COALESCE(u.roles, ARRAY[u.role]::text[]))
        OR (
          ('Bodega' = ANY(COALESCE(u.roles, ARRAY[u.role]::text[])) OR 'Producción' = ANY(COALESCE(u.roles, ARRAY[u.role]::text[])))
          AND p_city_id = ANY(u.assigned_cities)
        )
        OR ('Vendedor' = ANY(COALESCE(u.roles, ARRAY[u.role]::text[])) AND p_user_id = u.id)
        OR ('Repartidor' = ANY(COALESCE(u.roles, ARRAY[u.role]::text[])) AND p_assigned_delivery_id = u.id)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_access_order(uuid, uuid, uuid) TO authenticated;

-- Helper: ¿el usuario autenticado es Administrador activo?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.is_active = true
      AND 'Administrador' = ANY(COALESCE(u.roles, ARRAY[u.role]::text[]))
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ------------------------------------------------------------
-- 2. USERS — lectura para cualquier sesión válida (se necesita para
--    listar vendedores/repartidores en formularios); escritura solo
--    Administrador (la creación/cambio de contraseña real pasa por
--    /api/manage-users con service_role, que ignora RLS).
-- ------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_policy ON public.users;
DROP POLICY IF EXISTS users_insert_policy ON public.users;
DROP POLICY IF EXISTS users_update_policy ON public.users;
DROP POLICY IF EXISTS users_delete_policy ON public.users;

CREATE POLICY users_select_policy ON public.users FOR SELECT
  TO authenticated USING (true);

CREATE POLICY users_insert_policy ON public.users FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY users_update_policy ON public.users FOR UPDATE
  TO authenticated USING (public.is_admin());

CREATE POLICY users_delete_policy ON public.users FOR DELETE
  TO authenticated USING (public.is_admin());

-- ------------------------------------------------------------
-- 3. ORDERS / ORDER_ITEMS / ORDER_LOGS / ORDER_COMMENTS
-- ------------------------------------------------------------
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS orders_select_policy ON public.orders;
DROP POLICY IF EXISTS orders_insert_policy ON public.orders;
DROP POLICY IF EXISTS orders_update_policy ON public.orders;
DROP POLICY IF EXISTS orders_delete_policy ON public.orders;

CREATE POLICY orders_select_policy ON public.orders FOR SELECT
  TO authenticated USING (public.can_access_order(city_id, user_id, assigned_delivery_id));

CREATE POLICY orders_insert_policy ON public.orders FOR INSERT
  TO authenticated WITH CHECK (public.can_access_order(city_id, user_id, assigned_delivery_id));

CREATE POLICY orders_update_policy ON public.orders FOR UPDATE
  TO authenticated USING (public.can_access_order(city_id, user_id, assigned_delivery_id));

CREATE POLICY orders_delete_policy ON public.orders FOR DELETE
  TO authenticated USING (public.is_admin());

-- order_items / order_logs / order_comments heredan la visibilidad del pedido al que pertenecen.
DROP POLICY IF EXISTS order_items_select_policy ON public.order_items;
DROP POLICY IF EXISTS order_items_insert_policy ON public.order_items;
DROP POLICY IF EXISTS order_items_update_policy ON public.order_items;
DROP POLICY IF EXISTS order_items_delete_policy ON public.order_items;

CREATE POLICY order_items_select_policy ON public.order_items FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND public.can_access_order(o.city_id, o.user_id, o.assigned_delivery_id)));
CREATE POLICY order_items_insert_policy ON public.order_items FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND public.can_access_order(o.city_id, o.user_id, o.assigned_delivery_id)));
CREATE POLICY order_items_update_policy ON public.order_items FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND public.can_access_order(o.city_id, o.user_id, o.assigned_delivery_id)));
CREATE POLICY order_items_delete_policy ON public.order_items FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND public.can_access_order(o.city_id, o.user_id, o.assigned_delivery_id)));

DROP POLICY IF EXISTS order_logs_select_policy ON public.order_logs;
DROP POLICY IF EXISTS order_logs_insert_policy ON public.order_logs;

CREATE POLICY order_logs_select_policy ON public.order_logs FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_logs.order_id AND public.can_access_order(o.city_id, o.user_id, o.assigned_delivery_id)));
CREATE POLICY order_logs_insert_policy ON public.order_logs FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_logs.order_id AND public.can_access_order(o.city_id, o.user_id, o.assigned_delivery_id)));

DROP POLICY IF EXISTS "Enable read access for all users" ON public.order_comments;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.order_comments;

CREATE POLICY order_comments_select_policy ON public.order_comments FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_comments.order_id AND public.can_access_order(o.city_id, o.user_id, o.assigned_delivery_id)));
CREATE POLICY order_comments_insert_policy ON public.order_comments FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_comments.order_id AND public.can_access_order(o.city_id, o.user_id, o.assigned_delivery_id)));

-- ------------------------------------------------------------
-- 4. Datos de referencia/configuración: lectura para cualquier sesión
--    válida, escritura solo Administrador.
-- ------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['cities','warehouses','products','presentations','destinations','product_categories','order_types']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);

    EXECUTE format('DROP POLICY IF EXISTS "Enable read access for all users" ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Enable insert for all users" ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Enable update for all users" ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Enable delete for all users" ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_select_policy ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_insert_policy ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_update_policy ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_delete_policy ON public.%I;', t, t);

    EXECUTE format('CREATE POLICY %I_select_policy ON public.%I FOR SELECT TO authenticated USING (true);', t, t);
    EXECUTE format('CREATE POLICY %I_insert_policy ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_admin());', t, t);
    EXECUTE format('CREATE POLICY %I_update_policy ON public.%I FOR UPDATE TO authenticated USING (public.is_admin());', t, t);
    EXECUTE format('CREATE POLICY %I_delete_policy ON public.%I FOR DELETE TO authenticated USING (public.is_admin());', t, t);
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 5. Limpieza: ya no se necesita la columna password en texto plano.
--    (El login ahora pasa por Supabase Auth; verificado funcionando.)
-- ------------------------------------------------------------
UPDATE public.users SET password = NULL;
ALTER TABLE public.users DROP COLUMN IF EXISTS password;

-- ------------------------------------------------------------
-- Verificación
-- ------------------------------------------------------------
SELECT schemaname, tablename, rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
