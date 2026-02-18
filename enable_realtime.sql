-- =============================================
-- Habilitar Realtime para la tabla orders
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Agregar la tabla orders a la publicación de Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- Verificar que quedó habilitada
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename = 'orders';
