-- ===================================================================
-- MIGRACIÓN: Time Tracking de Lecciones
-- Fecha: 2026-01-11
-- Objetivo: Prevenir que chatters completen lecciones sin estudiarlas
-- ===================================================================

-- ===================================================================
-- Agregar columnas a lms_progress_lessons
-- ===================================================================
ALTER TABLE lms_progress_lessons 
ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP;

-- ===================================================================
-- Agregar columnas a lms_lessons para tracking
-- ===================================================================
ALTER TABLE lms_lessons 
ADD COLUMN IF NOT EXISTS estimated_duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS min_time_required_seconds INTEGER;

-- ===================================================================
-- Establecer duraciones estimadas para lecciones existentes
-- ===================================================================
-- Videos: aproximadamente 5-10 minutos (300-600 segundos)
-- Texto: aproximadamente 2-5 minutos (120-300 segundos)

UPDATE lms_lessons 
SET 
  estimated_duration_seconds = CASE 
    WHEN content_type = 'video' THEN 420  -- 7 minutos promedio
    WHEN content_type = 'text' THEN 180   -- 3 minutos promedio
    ELSE 300
  END,
  min_time_required_seconds = CASE 
    WHEN content_type = 'video' THEN 300  -- Mínimo 5 minutos para videos
    WHEN content_type = 'text' THEN 120   -- Mínimo 2 minutos para texto
    ELSE 180
  END
WHERE estimated_duration_seconds IS NULL;

-- ===================================================================
-- Índices para búsquedas eficientes
-- ===================================================================
CREATE INDEX IF NOT EXISTS idx_progress_lessons_time 
ON lms_progress_lessons(user_id, time_spent_seconds);

CREATE INDEX IF NOT EXISTS idx_progress_lessons_activity 
ON lms_progress_lessons(user_id, last_activity_at);

-- ===================================================================
-- COMENTARIOS DESCRIPTIVOS
-- ===================================================================
COMMENT ON COLUMN lms_progress_lessons.time_spent_seconds IS 'Tiempo real dedicado a la lección (medido en frontend)';
COMMENT ON COLUMN lms_progress_lessons.started_at IS 'Momento en que el usuario abrió la lección por primera vez';
COMMENT ON COLUMN lms_progress_lessons.last_activity_at IS 'Última vez que hubo actividad en la lección';

COMMENT ON COLUMN lms_lessons.estimated_duration_seconds IS 'Duración estimada de la lección (para mostrar al usuario)';
COMMENT ON COLUMN lms_lessons.min_time_required_seconds IS 'Tiempo mínimo requerido para marcar como completada';

-- ===================================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ===================================================================
-- Ejecutar después de aplicar esta migración:
/*
-- Ver tiempo promedio por lección
SELECT 
  l.title,
  l.content_type,
  l.estimated_duration_seconds / 60 as estimated_minutes,
  AVG(pl.time_spent_seconds) / 60 as avg_minutes_spent,
  COUNT(DISTINCT pl.user_id) as users_completed
FROM lms_lessons l
LEFT JOIN lms_progress_lessons pl ON l.id = pl.lesson_id
WHERE pl.completed = true
GROUP BY l.id, l.title, l.content_type, l.estimated_duration_seconds
ORDER BY avg_minutes_spent DESC;

-- Ver usuarios que completaron lecciones muy rápido (posible trampa)
SELECT 
  u.name,
  u.email,
  l.title,
  l.min_time_required_seconds / 60 as min_required_minutes,
  pl.time_spent_seconds / 60 as actual_minutes,
  pl.completed_at
FROM lms_progress_lessons pl
JOIN lms_users u ON pl.user_id = u.id
JOIN lms_lessons l ON pl.lesson_id = l.id
WHERE pl.completed = true
  AND pl.time_spent_seconds < l.min_time_required_seconds
ORDER BY pl.completed_at DESC;
*/
