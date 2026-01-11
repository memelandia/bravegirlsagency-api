-- ===================================================================
-- MIGRACIÓN: Deadlines del Curso
-- Fecha: 2026-01-11
-- Objetivo: Agregar fechas límite para completar el curso
-- ===================================================================

-- ===================================================================
-- Agregar columnas a lms_users
-- ===================================================================
ALTER TABLE lms_users 
ADD COLUMN IF NOT EXISTS course_deadline TIMESTAMP,
ADD COLUMN IF NOT EXISTS enrollment_date TIMESTAMP DEFAULT NOW();

-- ===================================================================
-- Actualizar usuarios existentes
-- ===================================================================
-- Establecer enrollment_date = created_at para usuarios existentes
UPDATE lms_users 
SET enrollment_date = created_at 
WHERE enrollment_date IS NULL;

-- Para usuarios que AÚN NO completaron el curso, establecer deadline en 7 días
UPDATE lms_users u
SET course_deadline = NOW() + INTERVAL '7 days'
WHERE u.role = 'chatter' 
  AND u.course_deadline IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM lms_course_completions cc 
    WHERE cc.user_id = u.id
  );

-- ===================================================================
-- Índices para búsquedas eficientes
-- ===================================================================
CREATE INDEX IF NOT EXISTS idx_users_deadline ON lms_users(course_deadline) 
WHERE course_deadline IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_enrollment ON lms_users(enrollment_date);

-- ===================================================================
-- COMENTARIOS DESCRIPTIVOS
-- ===================================================================
COMMENT ON COLUMN lms_users.course_deadline IS 'Fecha límite para completar el curso (NULL = sin deadline)';
COMMENT ON COLUMN lms_users.enrollment_date IS 'Fecha en que el usuario fue creado/inscrito al curso';

-- ===================================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ===================================================================
-- Ejecutar después de aplicar esta migración:
/*
-- Ver usuarios con deadline próximo
SELECT 
  name, 
  email, 
  enrollment_date,
  course_deadline,
  course_deadline - NOW() as time_remaining,
  EXISTS(SELECT 1 FROM lms_course_completions WHERE user_id = lms_users.id) as completed
FROM lms_users 
WHERE role = 'chatter' AND course_deadline IS NOT NULL
ORDER BY course_deadline ASC;

-- Ver usuarios que vencieron deadline
SELECT 
  name, 
  email, 
  course_deadline,
  NOW() - course_deadline as days_overdue
FROM lms_users 
WHERE role = 'chatter' 
  AND course_deadline < NOW()
  AND NOT EXISTS(SELECT 1 FROM lms_course_completions WHERE user_id = lms_users.id);
*/
