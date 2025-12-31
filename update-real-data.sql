-- LIMPIEZA Y ACTUALIZACIÓN CON DATOS REALES
-- Ejecutar en Neon SQL Editor

-- Limpiar TODOS los datos existentes
DELETE FROM crm_assignments;
DELETE FROM crm_social_accounts;
DELETE FROM crm_models;
DELETE FROM crm_chatters;
DELETE FROM crm_supervisors;
DELETE FROM crm_staff;

-- ============================================
-- MODELOS REALES (UPSERT)
-- ============================================
INSERT INTO crm_models (handle, estimado_facturacion_mensual, prioridad) VALUES
('carmen', 15000, 5),
('bellarey', 12000, 5),
('vicky', 10000, 4),
('lexiflix', 8000, 4),
('lucygarcia', 7000, 3),
('ambar', 6000, 3),
('kate', 5000, 3)
ON CONFLICT (handle) DO UPDATE SET
    estimado_facturacion_mensual = EXCLUDED.estimado_facturacion_mensual,
    prioridad = EXCLUDED.prioridad,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- CHATTERS REALES
-- ============================================
INSERT INTO crm_chatters (nombre, estado, nivel, pais, disponibilidad) VALUES
('Nico', 'activo', 'senior', 'Argentina', '{"L": ["09:00-17:00"], "M": ["09:00-17:00"], "X": ["09:00-17:00"], "J": ["09:00-17:00"], "V": ["09:00-17:00"]}'),
('Alfonso', 'activo', 'senior', 'Argentina', '{"L": ["09:00-17:00"], "M": ["09:00-17:00"], "X": ["09:00-17:00"], "J": ["09:00-17:00"], "V": ["09:00-17:00"]}'),
('Yaye', 'activo', 'senior', 'México', '{"L": ["09:00-17:00"], "M": ["09:00-17:00"], "X": ["09:00-17:00"], "J": ["09:00-17:00"], "V": ["09:00-17:00"]}'),
('Diego', 'activo', 'mid', 'Colombia', '{"L": ["14:00-22:00"], "M": ["14:00-22:00"], "X": ["14:00-22:00"], "J": ["14:00-22:00"], "V": ["14:00-22:00"]}'),
('Kari', 'activo', 'mid', 'Venezuela', '{"L": ["10:00-18:00"], "M": ["10:00-18:00"], "X": ["10:00-18:00"], "J": ["10:00-18:00"], "V": ["10:00-18:00"]}'),
('Ana', 'prueba', 'junior', 'Colombia', '{"L": ["10:00-18:00"], "X": ["10:00-18:00"], "V": ["10:00-18:00"]}'),
('Emeley', 'prueba', 'junior', 'Perú', '{"L": ["10:00-18:00"], "X": ["10:00-18:00"], "V": ["10:00-18:00"]}'),
('Gabriela', 'prueba', 'junior', 'México', '{"L": ["10:00-18:00"], "X": ["10:00-18:00"], "V": ["10:00-18:00"]}');

-- ============================================
-- SUPERVISORES REALES
-- ============================================
INSERT INTO crm_supervisors (nombre, scope) VALUES
('Jonatan', '{"type": "todos"}');

-- ============================================
-- STAFF DE MARKETING REAL
-- ============================================
INSERT INTO crm_staff (nombre, rol, estado, modelos_asignados) VALUES
('Franco', 'CD', 'activo', '[1, 2, 3, 4, 5, 6, 7]'),
('Jonatan', 'VA_EDITOR', 'activo', '[1, 2, 3, 4, 5, 6, 7]'),
('Aldi', 'AM_UPLOAD', 'activo', '[1, 2, 3, 4, 5, 6, 7]'),
('Josue', 'VA_EDITOR', 'activo', '[1, 2, 3, 4, 5, 6, 7]');

-- Verificar datos insertados
SELECT 'MODELOS' as tabla, COUNT(*) as total FROM crm_models
UNION ALL
SELECT 'CHATTERS', COUNT(*) FROM crm_chatters
UNION ALL
SELECT 'SUPERVISORES', COUNT(*) FROM crm_supervisors
UNION ALL
SELECT 'STAFF', COUNT(*) FROM crm_staff;
