-- ===================================================================
-- OPTIMIZACIÓN DE QUERIES - ÍNDICES FALTANTES
-- Fecha: 12 de Enero, 2026
-- Propósito: Mejorar performance de queries frecuentes
-- ===================================================================

-- Índices para lms_quiz_attempts (usado en analytics y reportes)
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_created 
ON lms_quiz_attempts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_passed 
ON lms_quiz_attempts(quiz_id, passed);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_passed 
ON lms_quiz_attempts(user_id, passed, score DESC);

-- Índices para lms_progress_lessons (usado en campus y progreso)
CREATE INDEX IF NOT EXISTS idx_progress_lessons_user_lesson 
ON lms_progress_lessons(user_id, lesson_id);

CREATE INDEX IF NOT EXISTS idx_progress_lessons_completed 
ON lms_progress_lessons(user_id, completed_at DESC) 
WHERE completed_at IS NOT NULL;

-- Índices para lms_lessons (usado en módulos)
CREATE INDEX IF NOT EXISTS idx_lessons_module_order 
ON lms_lessons(module_id, order_index);

CREATE INDEX IF NOT EXISTS idx_lessons_module_published 
ON lms_lessons(module_id, published) 
WHERE published = true;

-- Índices para lms_modules (usado en campus)
CREATE INDEX IF NOT EXISTS idx_modules_stage_order 
ON lms_modules(stage_id, order_index);

CREATE INDEX IF NOT EXISTS idx_modules_published 
ON lms_modules(published) 
WHERE published = true;

-- Índices para lms_questions (usado en quizzes)
CREATE INDEX IF NOT EXISTS idx_questions_quiz 
ON lms_questions(quiz_id, order_index);

-- Índices para lms_quizzes (usado en evaluaciones)
CREATE INDEX IF NOT EXISTS idx_quizzes_module 
ON lms_quizzes(module_id);

-- Índices para lms_users (usado en admin y autenticación)
CREATE INDEX IF NOT EXISTS idx_users_email 
ON lms_users(email);

CREATE INDEX IF NOT EXISTS idx_users_role_active 
ON lms_users(role, active);

CREATE INDEX IF NOT EXISTS idx_users_deadline 
ON lms_users(course_deadline) 
WHERE course_deadline IS NOT NULL;

-- Índices para lms_stages (usado en campus)
CREATE INDEX IF NOT EXISTS idx_stages_order 
ON lms_stages(order_index);

-- Índice compuesto para filtros comunes en admin
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_composite 
ON lms_quiz_attempts(user_id, quiz_id, passed, created_at DESC);

-- Índice para búsqueda de usuarios por nombre
CREATE INDEX IF NOT EXISTS idx_users_name_trgm 
ON lms_users USING gin(name gin_trgm_ops);

-- Nota: El índice anterior requiere extensión pg_trgm
-- Si no está instalada, ejecutar primero:
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Verificar índices creados
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename LIKE 'lms_%'
ORDER BY tablename, indexname;
