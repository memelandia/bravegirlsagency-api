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
-- Valores por defecto conservadores (admin puede ajustar después)
-- Videos: 1-2 minutos promedio (admin debe configurar según video real)
-- Texto: Calculado automáticamente basado en palabras (200 palabras/min)

UPDATE lms_lessons 
SET 
  estimated_duration_seconds = CASE 
    WHEN type = 'video' THEN 90   -- 1.5 minutos promedio (ajustable por admin)
    WHEN type = 'text' THEN 
      -- Calcular basado en conteo de palabras: palabras / 200 * 60
      GREATEST(
        30, -- Mínimo 30 segundos
        LEAST(
          300, -- Máximo 5 minutos
          (LENGTH(text_content) - LENGTH(REPLACE(text_content, ' ', '')) + 1) / 200 * 60
        )
      )
    ELSE 60
  END,
  min_time_required_seconds = CASE 
    WHEN type = 'video' THEN 30  -- Mínimo 30 seg (evita clicks rápidos, admin ajusta)
    WHEN type = 'text' THEN 
      -- 80% del tiempo estimado de lectura
      GREATEST(
        20, -- Mínimo 20 segundos
        CAST(
          (LENGTH(text_content) - LENGTH(REPLACE(text_content, ' ', '')) + 1) / 200.0 * 60 * 0.8 
          AS INTEGER
        )
      )
    ELSE 30
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

COMMENT ON COLUMN lms_lessons.estimated_duration_seconds IS 'Duración estimada de la lección (para mostrar al usuario). Admin puede ajustar manualmente.';
COMMENT ON COLUMN lms_lessons.min_time_required_seconds IS 'Tiempo mínimo requerido para marcar como completada. Configurar según contenido: videos cortos 30-60seg, videos largos 2-5min, textos según palabras.';

-- ===================================================================
-- AJUSTE MANUAL POR ADMIN (Ejemplos)
-- ===================================================================
/*
-- Para video de 1 minuto (60 segundos):
UPDATE lms_lessons 
SET 
  estimated_duration_seconds = 60,
  min_time_required_seconds = 45  -- 75% del tiempo del video
WHERE id = 'uuid-de-leccion';

-- Para video de 5 minutos (300 segundos):
UPDATE lms_lessons 
SET 
  estimated_duration_seconds = 300,
  min_time_required_seconds = 240  -- 80% del tiempo del video
WHERE id = 'uuid-de-leccion';

-- Para texto corto (1 min lectura):
UPDATE lms_lessons 
SET 
  estimated_duration_seconds = 60,
  min_time_required_seconds = 40  -- Dar tiempo para leer tranquilo
WHERE id = 'uuid-de-leccion';

-- Para deshabilitar validación de tiempo en una lección específica:
UPDATE lms_lessons 
SET min_time_required_seconds = NULL
WHERE id = 'uuid-de-leccion';
*/

-- ===================================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ===================================================================
-- Ejecutar después de aplicar esta migración:
/*
-- Ver tiempo promedio por lección
SELECT 
  l.title,
  l.type,
  l.estimated_duration_seconds / 60 as estimated_minutes,
  AVG(pl.time_spent_seconds) / 60 as avg_minutes_spent,
  COUNT(DISTINCT pl.user_id) as users_completed
FROM lms_lessons l
LEFT JOIN lms_progress_lessons pl ON l.id = pl.lesson_id
WHERE pl.completed = true
GROUP BY l.id, l.title, l.type, l.estimated_duration_seconds
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
