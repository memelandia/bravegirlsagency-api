-- Migration: Sistema de Tareas y Auditoría
-- Ejecutar en Neon/Supabase
-- Versión robusta sin dependencias estrictas

-- ============================================
-- TABLA: crm_tasks (Gestión de Tareas)
-- ============================================
DROP TABLE IF EXISTS crm_task_comments CASCADE;
DROP TABLE IF EXISTS crm_tasks CASCADE;

CREATE TABLE crm_tasks (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    assigned_to INTEGER,
    model_id INTEGER,
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT chk_type CHECK (type IN ('edit_reel', 'schedule_ppv', 'upload_content', 'creative_review', 'other')),
    CONSTRAINT chk_status CHECK (status IN ('pending', 'in_progress', 'review', 'completed')),
    CONSTRAINT chk_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
);

CREATE INDEX idx_tasks_status ON crm_tasks(status);
CREATE INDEX idx_tasks_assigned ON crm_tasks(assigned_to);
CREATE INDEX idx_tasks_model ON crm_tasks(model_id);
CREATE INDEX idx_tasks_priority ON crm_tasks(priority);
CREATE INDEX idx_tasks_due_date ON crm_tasks(due_date);

-- ============================================
-- TABLA: crm_audit_log (Historial y Auditoría)
-- ============================================
DROP TABLE IF EXISTS crm_audit_log CASCADE;

CREATE TABLE crm_audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_name TEXT NOT NULL,
    user_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    entity_name TEXT,
    old_values JSONB,
    new_values JSONB,
    changes_summary TEXT,
    ip_address TEXT,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_action CHECK (action IN ('create', 'update', 'delete', 'assign', 'unassign')),
    CONSTRAINT chk_entity_type CHECK (entity_type IN ('model', 'chatter', 'assignment', 'staff', 'supervisor', 'social_account', 'task'))
);

CREATE INDEX idx_audit_user ON crm_audit_log(user_name);
CREATE INDEX idx_audit_entity ON crm_audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_timestamp ON crm_audit_log(timestamp DESC);
CREATE INDEX idx_audit_action ON crm_audit_log(action);

-- ============================================
-- TABLA: crm_task_comments (Comentarios en Tareas)
-- ============================================
CREATE TABLE crm_task_comments (
    id BIGSERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL,
    user_name TEXT NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_task ON crm_task_comments(task_id);
CREATE INDEX idx_comments_created ON crm_task_comments(created_at DESC);

-- ============================================
-- FUNCIÓN: Auto-crear log de auditoría (OPCIONAL)
-- ============================================
-- Esta función es opcional. Puedes crear logs manualmente desde la aplicación.
-- Solo descomenta si quieres auditoría automática por triggers.

/*
CREATE OR REPLACE FUNCTION log_audit_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO crm_audit_log (
            user_name,
            action,
            entity_type,
            entity_id,
            old_values,
            changes_summary
        ) VALUES (
            COALESCE(current_user, 'system'),
            'delete',
            TG_TABLE_NAME,
            OLD.id,
            row_to_json(OLD),
            'Registro eliminado'
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO crm_audit_log (
            user_name,
            action,
            entity_type,
            entity_id,
            old_values,
            new_values,
            changes_summary
        ) VALUES (
            COALESCE(current_user, 'system'),
            'update',
            TG_TABLE_NAME,
            NEW.id,
            row_to_json(OLD),
            row_to_json(NEW),
            'Registro actualizado'
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO crm_audit_log (
            user_name,
            action,
            entity_type,
            entity_id,
            new_values,
            changes_summary
        ) VALUES (
            COALESCE(current_user, 'system'),
            'create',
            TG_TABLE_NAME,
            NEW.id,
            row_to_json(NEW),
            'Registro creado'
        );
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;
*/

-- ============================================
-- TRIGGERS: Activar auditoría automática
-- ============================================
-- Solo activar en tablas principales (opcional, puede generar mucho volumen)
-- Descomenta las que quieras auditar automáticamente:

-- DROP TRIGGER IF EXISTS audit_models ON crm_models;
-- CREATE TRIGGER audit_models AFTER INSERT OR UPDATE OR DELETE ON crm_models
-- FOR EACH ROW EXECUTE FUNCTION log_audit_change();

-- DROP TRIGGER IF EXISTS audit_chatters ON crm_chatters;
-- CREATE TRIGGER audit_chatters AFTER INSERT OR UPDATE OR DELETE ON crm_chatters
-- FOR EACH ROW EXECUTE FUNCTION log_audit_change();

-- DROP TRIGGER IF EXISTS audit_assignments ON crm_assignments;
-- CREATE TRIGGER audit_assignments AFTER INSERT OR UPDATE OR DELETE ON crm_assignments
-- FOR EACH ROW EXECUTE FUNCTION log_audit_change();

-- ============================================
-- DATOS DE EJEMPLO (Opcional - para testing)
-- ============================================
INSERT INTO crm_tasks (title, description, type, priority, status) VALUES
('Editar Reel de @Sofia', 'Reel de 30 segundos promocionando nuevo contenido', 'edit_reel', 'high', 'pending'),
('Programar PPV para @Maria', 'Programar 5 PPVs para esta semana', 'schedule_ppv', 'medium', 'in_progress'),
('Subir contenido de @Ana', 'Upload de fotos del último set', 'upload_content', 'high', 'pending');

INSERT INTO crm_audit_log (user_name, action, entity_type, entity_id, entity_name, changes_summary) VALUES
('Francisco', 'create', 'task', 1, 'Editar Reel', 'Tarea creada'),
('Sistema', 'update', 'model', 1, '@Sofia', 'Cambió prioridad');

-- ============================================
-- VERIFICACIÓN
-- ============================================
SELECT 'Tablas creadas exitosamente' as status;
SELECT COUNT(*) as total_tasks FROM crm_tasks;
SELECT COUNT(*) as total_audit_logs FROM crm_audit_log;
