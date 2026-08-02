-- =============================================
-- Habilitar Realtime para order_comments y order_logs
-- Sin esto, los comentarios que Bodega/Producción agregan a un pedido
-- nunca llegan en vivo a la sesión del vendedor (solo con recargar).
-- Ejecutar en Supabase SQL Editor.
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE order_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE order_logs;

-- Verificar que quedaron habilitadas
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('orders', 'users', 'order_comments', 'order_logs');
