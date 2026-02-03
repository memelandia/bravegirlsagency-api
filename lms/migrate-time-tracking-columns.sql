-- ===================================================================
-- MIGRACIÓN: Agregar Columnas de Time Tracking
-- Fecha: 21 de Enero, 2026
-- Relacionado con: Problema #21 - Tiempo de Estudio No Se Guarda
-- ===================================================================

-- Agregar columna para tracking de tiempo dedicado (en segundos)
ALTER TABLE lms_progress_lessons 
ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER DEFAULT 0;

-- Agregar columna para última actividad (útil para detectar sesiones)
ALTER TABLE lms_progress_lessons 
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP DEFAULT NOW();

-- Agregar índice para consultas por última actividad
CREATE INDEX IF NOT EXISTS idx_lms_progress_last_activity 
ON lms_progress_lessons(last_activity_at DESC);

-- Actualizar registros existentes con timestamp de completed_at
UPDATE lms_progress_lessons 
SET last_activity_at = completed_at 
WHERE last_activity_at IS NULL;

-- ===================================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ===================================================================

COMMENT ON COLUMN lms_progress_lessons.time_spent_seconds IS 
'Tiempo total dedicado a la lección en segundos (acumulativo)';

COMMENT ON COLUMN lms_progress_lessons.last_activity_at IS 
'Timestamp de última actividad en la lección (tracking, completado, etc.)';

-- ===================================================================
-- VALIDACIÓN POST-MIGRACIÓN
-- ===================================================================

-- Verificar estructura final
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'lms_progress_lessons'
-- ORDER BY ordinal_position;

-- Estadísticas de uso
-- SELECT 
--   COUNT(*) as total_registros,
--   COUNT(DISTINCT user_id) as usuarios_unicos,
--   COUNT(DISTINCT lesson_id) as lecciones_diferentes,
--   AVG(time_spent_seconds) as tiempo_promedio_segundos,
--   MAX(time_spent_seconds) as tiempo_maximo_segundos
-- FROM lms_progress_lessons;
