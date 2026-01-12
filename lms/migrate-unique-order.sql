-- ===================================================================
-- MIGRACIÓN: UNIQUE CONSTRAINTS PARA ORDER_INDEX
-- Fecha: 12 de Enero, 2026
-- Propósito: Prevenir order_index duplicados que podrían causar bugs
-- ===================================================================

-- IMPORTANTE: Esta migración puede fallar si ya existen duplicados
-- Verificar antes de ejecutar:

-- Verificar duplicados en lms_modules
SELECT stage_id, order_index, COUNT(*) as count
FROM lms_modules
GROUP BY stage_id, order_index
HAVING COUNT(*) > 1;

-- Verificar duplicados en lms_lessons
SELECT module_id, order_index, COUNT(*) as count
FROM lms_lessons
GROUP BY module_id, order_index
HAVING COUNT(*) > 1;

-- Verificar duplicados en lms_questions
SELECT quiz_id, order_index, COUNT(*) as count
FROM lms_questions
GROUP BY quiz_id, order_index
HAVING COUNT(*) > 1;

-- Si hay duplicados, corregir manualmente antes de continuar:
-- UPDATE lms_modules SET order_index = X WHERE id = 'uuid';

-- ===================================================================
-- AGREGAR UNIQUE CONSTRAINTS
-- ===================================================================

-- 1. Módulos: No puede haber dos módulos con mismo order en misma etapa
ALTER TABLE lms_modules 
ADD CONSTRAINT unique_module_order_per_stage 
UNIQUE (stage_id, order_index);

-- 2. Lecciones: No puede haber dos lecciones con mismo order en mismo módulo
ALTER TABLE lms_lessons 
ADD CONSTRAINT unique_lesson_order_per_module 
UNIQUE (module_id, order_index);

-- 3. Preguntas: No puede haber dos preguntas con mismo order en mismo quiz
ALTER TABLE lms_questions 
ADD CONSTRAINT unique_question_order_per_quiz 
UNIQUE (quiz_id, order_index);

-- ===================================================================
-- VERIFICAR CONSTRAINTS CREADOS
-- ===================================================================

SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conname LIKE 'unique_%_order_%'
ORDER BY conrelid::regclass;

-- Resultado esperado:
-- unique_module_order_per_stage | lms_modules | UNIQUE (stage_id, order_index)
-- unique_lesson_order_per_module | lms_lessons | UNIQUE (module_id, order_index)
-- unique_question_order_per_quiz | lms_questions | UNIQUE (quiz_id, order_index)

-- ===================================================================
-- ROLLBACK (si es necesario)
-- ===================================================================

-- Para revertir estos cambios:
-- ALTER TABLE lms_modules DROP CONSTRAINT unique_module_order_per_stage;
-- ALTER TABLE lms_lessons DROP CONSTRAINT unique_lesson_order_per_module;
-- ALTER TABLE lms_questions DROP CONSTRAINT unique_question_order_per_quiz;
