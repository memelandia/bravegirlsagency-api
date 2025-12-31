-- CRM Database Schema
-- Para usar en Neon, Supabase, o cualquier PostgreSQL

-- ============================================
-- TABLA: crm_models
-- ============================================
CREATE TABLE IF NOT EXISTS crm_models (
    id SERIAL PRIMARY KEY,
    handle VARCHAR(255) NOT NULL UNIQUE,
    estimado_facturacion_mensual INTEGER DEFAULT 0,
    prioridad INTEGER DEFAULT 3 CHECK (prioridad >= 1 AND prioridad <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_crm_models_prioridad ON crm_models(prioridad DESC);
CREATE INDEX idx_crm_models_handle ON crm_models(handle);

-- ============================================
-- TABLA: crm_chatters
-- ============================================
CREATE TABLE IF NOT EXISTS crm_chatters (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    estado VARCHAR(50) DEFAULT 'activo' CHECK (estado IN ('activo', 'prueba', 'pausa')),
    nivel VARCHAR(50) DEFAULT 'junior' CHECK (nivel IN ('junior', 'mid', 'senior')),
    pais VARCHAR(100),
    disponibilidad JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_crm_chatters_estado ON crm_chatters(estado);
CREATE INDEX idx_crm_chatters_nivel ON crm_chatters(nivel);

-- ============================================
-- TABLA: crm_assignments
-- ============================================
CREATE TABLE IF NOT EXISTS crm_assignments (
    id SERIAL PRIMARY KEY,
    chatter_id INTEGER NOT NULL REFERENCES crm_chatters(id) ON DELETE CASCADE,
    model_id INTEGER NOT NULL REFERENCES crm_models(id) ON DELETE CASCADE,
    horario JSONB DEFAULT '{}',
    estado VARCHAR(50) DEFAULT 'activa' CHECK (estado IN ('activa', 'prueba', 'reemplazo')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_crm_assignments_chatter ON crm_assignments(chatter_id);
CREATE INDEX idx_crm_assignments_model ON crm_assignments(model_id);
CREATE INDEX idx_crm_assignments_estado ON crm_assignments(estado);

-- ============================================
-- TABLA: crm_social_accounts
-- ============================================
CREATE TABLE IF NOT EXISTS crm_social_accounts (
    id SERIAL PRIMARY KEY,
    model_id INTEGER NOT NULL REFERENCES crm_models(id) ON DELETE CASCADE,
    plataforma VARCHAR(50) NOT NULL CHECK (plataforma IN ('Instagram', 'TikTok', 'Telegram')),
    handle VARCHAR(255) NOT NULL,
    idioma VARCHAR(50),
    nicho VARCHAR(100),
    verticales JSONB DEFAULT '[]',
    estado VARCHAR(50) DEFAULT 'activa' CHECK (estado IN ('activa', 'warming', 'shadowban', 'pausada')),
    link_principal TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_crm_social_accounts_model ON crm_social_accounts(model_id);
CREATE INDEX idx_crm_social_accounts_plataforma ON crm_social_accounts(plataforma);
CREATE INDEX idx_crm_social_accounts_estado ON crm_social_accounts(estado);

-- ============================================
-- TABLA: crm_supervisors
-- ============================================
CREATE TABLE IF NOT EXISTS crm_supervisors (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    scope JSONB DEFAULT '{"type": "todos"}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_crm_supervisors_nombre ON crm_supervisors(nombre);

-- ============================================
-- TABLA: crm_staff
-- ============================================
CREATE TABLE IF NOT EXISTS crm_staff (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    rol VARCHAR(50) NOT NULL CHECK (rol IN ('EDITOR_REELS', 'PROGRAMADOR_PPV', 'AM_UPLOAD', 'CD', 'VA_EDITOR')),
    estado VARCHAR(50) DEFAULT 'activo' CHECK (estado IN ('activo', 'prueba', 'pausado')),
    modelos_asignados JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_crm_staff_rol ON crm_staff(rol);
CREATE INDEX idx_crm_staff_estado ON crm_staff(estado);

-- ============================================
-- DATOS DE PRUEBA (SEED)
-- ============================================

-- Modelos de ejemplo
INSERT INTO crm_models (handle, estimado_facturacion_mensual, prioridad) VALUES
('carmencitax', 15000, 5),
('bellarose', 8000, 4),
('lunasol', 5000, 3)
ON CONFLICT (handle) DO NOTHING;

-- Chatters de ejemplo
INSERT INTO crm_chatters (nombre, estado, nivel, pais, disponibilidad) VALUES
('Yaye Sanchez', 'activo', 'senior', 'México', '{"L": ["09:00-17:00"], "M": ["09:00-17:00"], "X": ["09:00-17:00"], "J": ["09:00-17:00"], "V": ["09:00-17:00"]}'),
('Diego Salcedo', 'activo', 'mid', 'Colombia', '{"L": ["14:00-22:00"], "M": ["14:00-22:00"], "X": ["14:00-22:00"], "J": ["14:00-22:00"], "V": ["14:00-22:00"]}'),
('Alfonso Silva', 'prueba', 'junior', 'Argentina', '{"L": ["10:00-18:00"], "X": ["10:00-18:00"], "V": ["10:00-18:00"]}')
ON CONFLICT DO NOTHING;

-- Supervisores de ejemplo
INSERT INTO crm_supervisors (nombre, scope) VALUES
('María Rodríguez', '{"type": "todos"}'),
('Juan Pérez', '{"type": "lista", "chatters": [1, 2]}')
ON CONFLICT DO NOTHING;

-- Staff de ejemplo
INSERT INTO crm_staff (nombre, rol, estado, modelos_asignados) VALUES
('Ana Martínez', 'VA_EDITOR', 'activo', '[1, 2]'),
('Carlos López', 'AM_UPLOAD', 'activo', '[1]'),
('Sofia García', 'CD', 'activo', '[1, 2, 3]')
ON CONFLICT DO NOTHING;
