-- Cambiar cooldown de quizzes de 60 minutos a 1 minuto
-- Ejecutar en Supabase SQL Editor
UPDATE lms_quizzes SET cooldown_minutes = 1 WHERE cooldown_minutes = 60;
