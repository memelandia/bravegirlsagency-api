-- Migration: Sistema de Tareas y Auditoría
-- Ejecutar en Neon/Supabase
-- Versión robusta sin dependencias estrictas

-- ============================================
-- TABLA: crm_tasks (Gestión de Tareas)
-- ============================================
CREATE TABLE IF NOT EXISTS crm_tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('edit_reel', 'schedule_ppv', 'upload_content', 'creative_review', 'other')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'review', 'completed')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    -- Asignaciones (SIN foreign keys para evitar errores)
    assigned_to INTEGER,  -- ID del staff
    model_id INTEGER,     -- ID del modelo relacionado
    
    -- Fechas
    due_date TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_crm_tasks_status ON crm_tasks(status);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_assigned ON crm_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_model ON crm_tasks(model_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_priority ON crm_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_due_date ON crm_tasks(due_date);

COMMENT ON TABLE crm_tasks IS 'Sistema de gestión de tareas para el equipo';
COMMENT ON COLUMN crm_tasks.type IS 'Tipo de tarea: edit_reel, schedule_ppv, upload_content, creative_review, other';
COMMENT ON COLUMN crm_tasks.status IS 'Estado: pending, in_progress, review, completed';

-- ============================================
-- TABLA: crm_audit_log (Historial y Auditoría)
-- ============================================
CREATE TABLE IF NOT EXISTS crm_audit_log (
    id SERIAL PRIMARY KEY,
    
    -- Usuario que realizó la acción
    user_name VARCHAR(255) NOT NULL,
    user_id VARCHAR(100),
    
    -- Acción realizada
    action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'update', 'delete', 'assign', 'unassign')),
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('model', 'chatter', 'assignment', 'staff', 'supervisor', 'social_account', 'task')),
    entity_id INTEGER NOT NULL,
    entity_name VARCHAR(255),
    
    -- Cambios realizados
    old_values JSONB,
    new_values JSONB,
    changes_summary TEXT,
    
    -- Metadata
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crm_audit_user ON crm_audit_log(user_name);
CREATE INDEX IF NOT EXISTS idx_crm_audit_entity ON crm_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_crm_audit_timestamp ON crm_audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_crm_audit_action ON crm_audit_log(action);

COMMENT ON TABLE crm_audit_log IS 'Registro completo de auditoría para compliance y transparencia';
COMMENT ON COLUMN crm_audit_log.action IS 'Tipo de acción: create, update, delete, assign, unassign';
COMMENT ON COLUMN crm_audit_log.entity_type IS 'Tipo de entidad modificada';
COMMENT ON COLUMN crm_audit_log.changes_summary IS 'Resumen legible de los cambios';

-- ============================================
-- TABLA: crm_task_comments (Comentarios en Tareas)
-- ============================================
CREATE TABLE IF NOT EXISTS crm_task_comments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL,  -- SIN foreign key para evitar errores
    user_name VARCHAR(255) NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crm_task_comments_task ON crm_task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_crm_task_comments_created ON crm_task_comments(created_at DESC);

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
-- Descomenta si quieres datos de prueba

/*
-- Ejemplo de tareas
INSERT INTO crm_tasks (title, description, type, priority, status) VALUES
('Editar Reel de @Sofia', 'Reel de 30 segundos promocionando nuevo contenido', 'edit_reel', 'high', 'pending'),
('Programar PPV para @Maria', 'Programar 5 PPVs para esta semana', 'schedule_ppv', 'medium', 'in_progress'),
('Subir contenido de @Ana', 'Upload de fotos del último set', 'upload_content', 'high', 'pending');

-- Ejemplo de log de auditoría manual
INSERT INTO crm_audit_log (user_name, action, entity_type, entity_id, entity_name, changes_summary) VALUES
('Francisco', 'update', 'model', 1, '@Sofia', 'Cambió prioridad de 3 a 5'),
('Ana', 'create', 'assignment', 1, 'Maria → @Sofia', 'Nueva asignación creada');
*/

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Ejecuta estas queries para verificar que todo se creó correctamente:

-- SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'crm_task%' OR table_name = 'crm_audit_log';
-- SELECT * FROM crm_tasks LIMIT 5;
-- SELECT * FROM crm_audit_log LIMIT 5;
