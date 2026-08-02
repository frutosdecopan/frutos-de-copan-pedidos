-- ============================================================
-- Frutos de Copán - Función para resolver usuario/nombre → email
-- Ejecutar en el SQL Editor de Supabase.
--
-- El login sigue pidiendo "usuario" (username o nombre), pero ahora
-- se autentica con Supabase Auth (que requiere email). Esta función
-- expone SOLO el email y el estado activo — nunca la contraseña ni
-- otros datos — y puede ser llamada sin sesión (es el paso ANTES de
-- iniciar sesión).
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_login_email(p_identifier text)
RETURNS TABLE(email text, is_active boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email, is_active
  FROM public.users
  WHERE lower(username) = lower(p_identifier) OR lower(name) = lower(p_identifier)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_login_email(text) TO anon, authenticated;

-- Verificación (reemplaza 'admin' por un username real para probar)
-- SELECT * FROM public.get_login_email('admin');
