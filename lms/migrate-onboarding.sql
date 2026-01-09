-- ============================================
-- MIGRACIÓN: Agregar campos de onboarding
-- Fecha: 2026-01-09
-- Descripción: Agrega campos para detectar primer login y completar onboarding
-- ============================================

-- Agregar columna first_login (detecta si es primera vez que entra)
ALTER TABLE lms_users 
ADD COLUMN IF NOT EXISTS first_login BOOLEAN DEFAULT true;

-- Agregar columna onboarding_completed_at (timestamp cuando completó bienvenida)
ALTER TABLE lms_users 
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP;

-- Agregar columna must_change_password (para passwords temporales)
ALTER TABLE lms_users 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;

-- Agregar columna password_changed_at (tracking de seguridad)
ALTER TABLE lms_users 
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;

-- Marcar usuarios existentes como si ya completaron onboarding
-- (para no forzarlos a ver la pantalla de bienvenida)
UPDATE lms_users 
SET 
  first_login = false,
  onboarding_completed_at = NOW()
WHERE onboarding_completed_at IS NULL;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_lms_users_first_login 
ON lms_users(first_login) WHERE first_login = true;

-- Verificar cambios
SELECT 
  id, 
  name, 
  email, 
  first_login, 
  onboarding_completed_at,
  must_change_password,
  created_at
FROM lms_users
ORDER BY created_at DESC
LIMIT 10;
