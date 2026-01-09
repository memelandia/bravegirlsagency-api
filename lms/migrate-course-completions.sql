-- ===================================================================
-- MIGRACIÓN: Course Completions
-- Fecha: 2026-01-09
-- Objetivo: Crear tabla para registrar graduaciones y certificaciones
-- ===================================================================

-- ===================================================================
-- TABLA: course_completions
-- Registra cuando un usuario completa TODO el curso exitosamente
-- ===================================================================
CREATE TABLE IF NOT EXISTS lms_course_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES lms_users(id) ON DELETE CASCADE,
  completed_at TIMESTAMP DEFAULT NOW(),
  overall_score INTEGER NOT NULL, -- Promedio de todos los quizzes
  approved BOOLEAN NOT NULL, -- true si overall_score >= 80
  certificate_issued BOOLEAN DEFAULT false,
  certificate_url TEXT, -- URL del PDF del certificado
  hired BOOLEAN DEFAULT false, -- ¿Se contrató al chatter?
  hired_at TIMESTAMP,
  notes TEXT, -- Comentarios del supervisor/admin
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT overall_score_range CHECK (overall_score >= 0 AND overall_score <= 100),
  CONSTRAINT unique_user_completion UNIQUE (user_id) -- Solo una completion por usuario
);

-- Índices para búsquedas eficientes
CREATE INDEX idx_course_completions_user ON lms_course_completions(user_id);
CREATE INDEX idx_course_completions_approved ON lms_course_completions(approved);
CREATE INDEX idx_course_completions_hired ON lms_course_completions(hired);
CREATE INDEX idx_course_completions_completed_at ON lms_course_completions(completed_at DESC);

-- ===================================================================
-- COMENTARIOS DESCRIPTIVOS
-- ===================================================================
COMMENT ON TABLE lms_course_completions IS 'Registra cuando un chatter completa exitosamente todo el curso LMS';
COMMENT ON COLUMN lms_course_completions.overall_score IS 'Promedio ponderado de todos los quizzes del curso (0-100)';
COMMENT ON COLUMN lms_course_completions.approved IS 'true si overall_score >= 80 (aprobado), false si < 80';
COMMENT ON COLUMN lms_course_completions.certificate_issued IS 'Indica si se generó y envió el certificado PDF';
COMMENT ON COLUMN lms_course_completions.hired IS 'Indica si el chatter fue contratado después de graduarse';
COMMENT ON COLUMN lms_course_completions.notes IS 'Comentarios del supervisor: rendimiento, actitud, recomendaciones';

-- ===================================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ===================================================================
-- Ejecutar después de aplicar esta migración:
-- SELECT * FROM lms_course_completions LIMIT 5;
-- SELECT COUNT(*) as total_graduados FROM lms_course_completions WHERE approved = true;
-- SELECT COUNT(*) as total_contratados FROM lms_course_completions WHERE hired = true;
