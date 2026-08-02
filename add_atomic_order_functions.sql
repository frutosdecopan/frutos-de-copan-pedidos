-- ============================================================
-- Frutos de Copán — Crear/editar pedidos de forma atómica
-- Ejecutar en el SQL Editor de Supabase.
--
-- Reemplaza la generación de ID por lectura de MAX+1 (condición de
-- carrera) por una secuencia real de Postgres, y agrupa pedido +
-- productos + log en una sola función: si cualquier paso falla, se
-- revierte todo automáticamente (no puede quedar un pedido sin
-- productos ni un pedido huérfano).
--
-- SECURITY INVOKER (el valor por defecto, no se especifica aparte):
-- las políticas RLS ya aplicadas siguen rigiendo exactamente igual,
-- estas funciones no amplían permisos de nadie.
-- ============================================================

-- 1. Secuencia para el ID de pedido, alineada con el máximo actual.
CREATE SEQUENCE IF NOT EXISTS public.orders_id_seq;
SELECT setval(
  'public.orders_id_seq',
  COALESCE((SELECT MAX(substring(id from 'ORD-(\d+)')::int) FROM public.orders), 0) + 1,
  false
);

-- 2. Crear pedido + items + log en una sola transacción.
CREATE OR REPLACE FUNCTION public.create_order_with_items(
  p_user_id uuid,
  p_user_name text,
  p_client_name text,
  p_client_rtn text,
  p_client_phone text,
  p_origin_city_name text,
  p_order_type text,
  p_destination_name text,
  p_city_id uuid,
  p_city_name text,
  p_warehouse_id uuid,
  p_warehouse_name text,
  p_status text,
  p_delivery_date date,
  p_items jsonb
) RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_id text;
BEGIN
  v_order_id := 'ORD-' || lpad(nextval('public.orders_id_seq')::text, 3, '0');

  INSERT INTO public.orders (
    id, user_id, user_name, client_name, client_rtn, client_phone,
    origin_city_name, order_type, destination_name, city_id, city_name,
    warehouse_id, warehouse_name, status, delivery_date
  ) VALUES (
    v_order_id, p_user_id, p_user_name, p_client_name, p_client_rtn, p_client_phone,
    p_origin_city_name, p_order_type, p_destination_name, p_city_id, p_city_name,
    p_warehouse_id, p_warehouse_name, COALESCE(p_status, 'Enviado')::order_status, p_delivery_date
  );

  INSERT INTO public.order_items (order_id, product_id, product_name, presentation_id, presentation_name, quantity)
  SELECT
    v_order_id,
    (i->>'productId')::uuid,
    i->>'productName',
    (i->>'presentationId')::uuid,
    i->>'presentationName',
    (i->>'quantity')::int
  FROM jsonb_array_elements(p_items) AS i;

  INSERT INTO public.order_logs (order_id, message, user_name)
  VALUES (v_order_id, 'Pedido creado', COALESCE(p_user_name, 'Sistema'));

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order_with_items(
  uuid, text, text, text, text, text, text, text, uuid, text, uuid, text, text, date, jsonb
) TO authenticated;

-- 3. Editar pedido + reemplazar items + log en una sola transacción.
CREATE OR REPLACE FUNCTION public.update_order_with_items(
  p_order_id text,
  p_client_name text,
  p_client_rtn text,
  p_client_phone text,
  p_destination_name text,
  p_order_type text,
  p_warehouse_id uuid,
  p_warehouse_name text,
  p_city_id uuid,
  p_city_name text,
  p_status text,
  p_delivery_date date,
  p_user_name text,
  p_items jsonb
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.orders SET
    client_name = p_client_name,
    client_rtn = p_client_rtn,
    client_phone = p_client_phone,
    destination_name = p_destination_name,
    order_type = p_order_type,
    warehouse_id = p_warehouse_id,
    warehouse_name = p_warehouse_name,
    city_id = p_city_id,
    city_name = p_city_name,
    status = p_status::order_status,
    delivery_date = p_delivery_date
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido % no encontrado o sin permiso para editarlo', p_order_id;
  END IF;

  DELETE FROM public.order_items WHERE order_id = p_order_id;

  INSERT INTO public.order_items (order_id, product_id, product_name, presentation_id, presentation_name, quantity)
  SELECT
    p_order_id,
    (i->>'productId')::uuid,
    i->>'productName',
    (i->>'presentationId')::uuid,
    i->>'presentationName',
    (i->>'quantity')::int
  FROM jsonb_array_elements(p_items) AS i;

  INSERT INTO public.order_logs (order_id, message, user_name)
  VALUES (p_order_id, 'Pedido actualizado', COALESCE(p_user_name, 'Sistema'));
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_order_with_items(
  text, text, text, text, text, text, uuid, text, uuid, text, text, date, text, jsonb
) TO authenticated;

-- Verificación
SELECT last_value FROM public.orders_id_seq;
