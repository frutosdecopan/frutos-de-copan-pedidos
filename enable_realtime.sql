-- =============================================
-- Habilitar Realtime para orders y users
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Agregar tablas a la publicación de Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE users;

-- Verificar que quedaron habilitadas
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('orders', 'users');
