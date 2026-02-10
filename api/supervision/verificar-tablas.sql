-- ============================================================================
-- VERIFICAR QUÉ TABLAS EXISTEN EN NEONTECH
-- Ejecuta esta consulta para ver el estado actual
-- ============================================================================

SELECT 
  t.table_name,
  COUNT(c.column_name) as total_columnas
FROM information_schema.tables t
LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public' 
  AND t.table_name IN ('checklist_mes','vip_repaso','vip_fans','registro_errores','supervision_semanal')
GROUP BY t.table_name
ORDER BY t.table_name;

-- ============================================================================
-- VERIFICAR ESTRUCTURA DETALLADA DE CADA TABLA
-- ============================================================================

SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN ('checklist_mes','vip_repaso','vip_fans','registro_errores','supervision_semanal')
ORDER BY table_name, ordinal_position;

-- ============================================================================
-- RESULTADO ESPERADO:
-- Si ves estas 5 tablas con estas columnas, TODO ESTÁ BIEN:
--
-- checklist_mes (4 columnas):
--   - id (integer)
--   - key (text)
--   - status (text)  
--   - updated_at (timestamp)
--
-- vip_repaso (4 columnas):
--   - id (integer)
--   - key (text)
--   - status (text)
--   - updated_at (timestamp)
--
-- vip_fans (6 columnas):
--   - id (text)
--   - name (text)
--   - account (text)
--   - type (text)
--   - chat_link (text)
--   - created_at (timestamp)
--
-- registro_errores (11 columnas):
--   - id (text)
--   - fecha (date)
--   - cuenta (text)
--   - chatter (text)
--   - tipo (text)
--   - gravedad (text)
--   - detalle (text)
--   - traslado (text)
--   - estado (text)
--   - link (text)
--   - created_at (timestamp)
--
-- supervision_semanal (20 columnas):
--   - id (text)
--   - mes (text)
--   - semana (text)
--   - week_index (integer)
--   - chatter (text)
--   - cuenta (text)
--   - facturacion (text)
--   - nuevos_fans (text)
--   - meta_semanal (text)
--   - meta_mensual (text)
--   - meta_facturacion (text)
--   - facturacion_mensual_objetivo (text)
--   - posteos (text)
--   - historias (text)
--   - pendientes (text)
--   - resueltos (text)
--   - impacto (text)
--   - tiempo_respuesta (text)
--   - estado_objetivo (text)
--   - updated_at (timestamp)
-- ============================================================================
