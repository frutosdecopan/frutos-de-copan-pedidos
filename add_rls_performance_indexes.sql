-- ============================================================
-- Índices para acelerar las nuevas políticas RLS
-- (auth_user_id se consulta en CADA request ahora; antes no tenía índice)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_delivery_id ON public.orders(assigned_delivery_id);
CREATE INDEX IF NOT EXISTS idx_users_assigned_cities ON public.users USING GIN(assigned_cities);
