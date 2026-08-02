-- ============================================================
-- ROLLBACK DE EMERGENCIA — vuelve a abrir el acceso (USING true)
-- Ejecutar SOLO si algo se rompe después de correr
-- enable_rls_policies_v2.sql y necesitas restaurar el acceso
-- de inmediato mientras se investiga.
-- NOTA: esto NO restaura la columna password (ya se eliminó);
-- el login seguirá funcionando vía Supabase Auth.
-- ============================================================

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','orders','order_items','order_logs','order_comments','cities','warehouses','products','presentations','destinations','product_categories','order_types']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_select_policy ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_insert_policy ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_update_policy ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_delete_policy ON public.%I;', t, t);

    EXECUTE format('CREATE POLICY %I_select_policy ON public.%I FOR SELECT USING (true);', t, t);
    EXECUTE format('CREATE POLICY %I_insert_policy ON public.%I FOR INSERT WITH CHECK (true);', t, t);
    EXECUTE format('CREATE POLICY %I_update_policy ON public.%I FOR UPDATE USING (true);', t, t);
    EXECUTE format('CREATE POLICY %I_delete_policy ON public.%I FOR DELETE USING (true);', t, t);
  END LOOP;
END $$;
