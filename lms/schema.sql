-- ===================================================================
-- LMS DATABASE SCHEMA
-- Learning Management System para BraveGirls Agency
-- ===================================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===================================================================
-- TABLA: users
-- Gestión de usuarios del LMS (chatters, supervisors, admins)
-- ===================================================================
CREATE TABLE IF NOT EXISTS lms_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('chatter', 'supervisor', 'admin')),
  active BOOLEAN DEFAULT true,
  first_login BOOLEAN DEFAULT true,
  onboarding_completed_at TIMESTAMP,
  must_change_password BOOLEAN DEFAULT false,
  password_changed_at TIMESTAMP,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_lms_users_email ON lms_users(email);
CREATE INDEX idx_lms_users_role ON lms_users(role);
CREATE INDEX idx_lms_users_active ON lms_users(active);

-- ===================================================================
-- TABLA: stages
-- Etapas del curso (ej: Onboarding, Negocio, Operación OF, etc.)
-- ===================================================================
CREATE TABLE IF NOT EXISTS lms_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_lms_stages_order ON lms_stages(order_index);

-- ===================================================================
-- TABLA: modules
-- Módulos dentro de cada etapa (secuenciales con bloqueo)
-- ===================================================================
CREATE TABLE IF NOT EXISTS lms_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stage_id UUID NOT NULL REFERENCES lms_stages(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_lms_modules_stage ON lms_modules(stage_id);
CREATE INDEX idx_lms_modules_order ON lms_modules(order_index);
CREATE INDEX idx_lms_modules_published ON lms_modules(published);

-- ===================================================================
-- TABLA: lessons
-- Lecciones dentro de cada módulo (video o texto)
-- ===================================================================
CREATE TABLE IF NOT EXISTS lms_lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID NOT NULL REFERENCES lms_modules(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('video', 'text')),
  order_index INTEGER NOT NULL,
  loom_url TEXT,
  text_content TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT check_lesson_content CHECK (
    (type = 'video' AND loom_url IS NOT NULL) OR
    (type = 'text' AND text_content IS NOT NULL)
  )
);

CREATE INDEX idx_lms_lessons_module ON lms_lessons(module_id);
CREATE INDEX idx_lms_lessons_order ON lms_lessons(order_index);

-- ===================================================================
-- TABLA: quizzes
-- Configuración de evaluaciones por módulo
-- ===================================================================
CREATE TABLE IF NOT EXISTS lms_quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID NOT NULL REFERENCES lms_modules(id) ON DELETE CASCADE,
  passing_score INTEGER DEFAULT 80 CHECK (passing_score >= 0 AND passing_score <= 100),
  max_attempts INTEGER DEFAULT 3 CHECK (max_attempts > 0),
  cooldown_minutes INTEGER DEFAULT 5 CHECK (cooldown_minutes >= 0),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_lms_quizzes_module ON lms_quizzes(module_id);

-- ===================================================================
-- TABLA: questions
-- Preguntas multiple choice para cada quiz
-- ===================================================================
CREATE TABLE IF NOT EXISTS lms_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES lms_quizzes(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  options JSONB NOT NULL, -- Array de strings con las opciones
  correct_option_index INTEGER NOT NULL CHECK (correct_option_index >= 0),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_lms_questions_quiz ON lms_questions(quiz_id);
CREATE INDEX idx_lms_questions_order ON lms_questions(order_index);

-- ===================================================================
-- TABLA: progress_lessons
-- Registro de lecciones completadas por usuario
-- ===================================================================
CREATE TABLE IF NOT EXISTS lms_progress_lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES lms_users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lms_lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

CREATE INDEX idx_lms_progress_user ON lms_progress_lessons(user_id);
CREATE INDEX idx_lms_progress_lesson ON lms_progress_lessons(lesson_id);

-- ===================================================================
-- TABLA: quiz_attempts
-- Intentos de evaluación realizados por usuarios
-- ===================================================================
CREATE TABLE IF NOT EXISTS lms_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES lms_users(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES lms_quizzes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  passed BOOLEAN NOT NULL,
  answers JSONB NOT NULL, -- {question_id: selected_option_index}
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_lms_attempts_user ON lms_quiz_attempts(user_id);
CREATE INDEX idx_lms_attempts_quiz ON lms_quiz_attempts(quiz_id);
CREATE INDEX idx_lms_attempts_created ON lms_quiz_attempts(created_at DESC);

-- ===================================================================
-- VISTAS ÚTILES
-- ===================================================================

-- Vista de progreso por usuario y módulo
CREATE OR REPLACE VIEW lms_user_module_progress AS
SELECT 
  u.id as user_id,
  u.name as user_name,
  u.email as user_email,
  m.id as module_id,
  m.title as module_title,
  m.stage_id,
  s.name as stage_name,
  m.order_index as module_order,
  COUNT(DISTINCT l.id) as total_lessons,
  COUNT(DISTINCT pl.lesson_id) as completed_lessons,
  CASE 
    WHEN COUNT(DISTINCT l.id) > 0 
    THEN ROUND((COUNT(DISTINCT pl.lesson_id)::DECIMAL / COUNT(DISTINCT l.id)) * 100, 2)
    ELSE 0
  END as lessons_completion_percentage,
  BOOL_OR(qa.passed) as quiz_passed,
  MAX(qa.score) as best_quiz_score,
  COUNT(qa.id) as quiz_attempts_count,
  MAX(qa.created_at) as last_quiz_attempt
FROM lms_users u
CROSS JOIN lms_modules m
LEFT JOIN lms_stages s ON m.stage_id = s.id
LEFT JOIN lms_lessons l ON l.module_id = m.id
LEFT JOIN lms_progress_lessons pl ON pl.lesson_id = l.id AND pl.user_id = u.id
LEFT JOIN lms_quizzes q ON q.module_id = m.id
LEFT JOIN lms_quiz_attempts qa ON qa.quiz_id = q.id AND qa.user_id = u.id
WHERE u.role = 'chatter' AND u.active = true AND m.published = true
GROUP BY u.id, u.name, u.email, m.id, m.title, m.stage_id, s.name, m.order_index;

-- ===================================================================
-- FUNCIONES AUXILIARES
-- ===================================================================

-- Función para verificar si un usuario puede acceder a un módulo
CREATE OR REPLACE FUNCTION lms_can_access_module(p_user_id UUID, p_module_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_module_order INTEGER;
  v_prev_module_id UUID;
  v_prev_module_completed BOOLEAN;
BEGIN
  -- Obtener el orden del módulo solicitado
  SELECT order_index INTO v_module_order
  FROM lms_modules
  WHERE id = p_module_id;
  
  -- El primer módulo siempre es accesible
  IF v_module_order = 0 THEN
    RETURN true;
  END IF;
  
  -- Verificar que el módulo anterior esté completado
  SELECT m.id INTO v_prev_module_id
  FROM lms_modules m
  WHERE m.stage_id = (SELECT stage_id FROM lms_modules WHERE id = p_module_id)
    AND m.order_index = v_module_order - 1;
  
  IF v_prev_module_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verificar que todas las lecciones del módulo anterior estén completadas
  SELECT 
    COUNT(DISTINCT l.id) = COUNT(DISTINCT pl.lesson_id)
  INTO v_prev_module_completed
  FROM lms_lessons l
  LEFT JOIN lms_progress_lessons pl ON pl.lesson_id = l.id AND pl.user_id = p_user_id
  WHERE l.module_id = v_prev_module_id;
  
  IF NOT v_prev_module_completed THEN
    RETURN false;
  END IF;
  
  -- Verificar que el quiz del módulo anterior esté aprobado (si existe)
  IF EXISTS (
    SELECT 1 FROM lms_quizzes WHERE module_id = v_prev_module_id
  ) THEN
    RETURN EXISTS (
      SELECT 1 
      FROM lms_quiz_attempts qa
      JOIN lms_quizzes q ON q.id = qa.quiz_id
      WHERE q.module_id = v_prev_module_id
        AND qa.user_id = p_user_id
        AND qa.passed = true
    );
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_lms_users_updated_at BEFORE UPDATE ON lms_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lms_stages_updated_at BEFORE UPDATE ON lms_stages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lms_modules_updated_at BEFORE UPDATE ON lms_modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lms_lessons_updated_at BEFORE UPDATE ON lms_lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lms_quizzes_updated_at BEFORE UPDATE ON lms_quizzes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lms_questions_updated_at BEFORE UPDATE ON lms_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================================================
-- COMENTARIOS
-- ===================================================================
COMMENT ON TABLE lms_users IS 'Usuarios del LMS (chatters, supervisors, admins)';
COMMENT ON TABLE lms_stages IS 'Etapas del curso';
COMMENT ON TABLE lms_modules IS 'Módulos secuenciales dentro de cada etapa';
COMMENT ON TABLE lms_lessons IS 'Lecciones (video o texto) dentro de cada módulo';
COMMENT ON TABLE lms_quizzes IS 'Configuración de evaluaciones por módulo';
COMMENT ON TABLE lms_questions IS 'Preguntas multiple choice';
COMMENT ON TABLE lms_progress_lessons IS 'Registro de lecciones completadas';
COMMENT ON TABLE lms_quiz_attempts IS 'Intentos de evaluación';
