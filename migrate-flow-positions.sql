-- Migration: Agregar posiciones para ReactFlow
-- Ejecutar en Neon/Supabase para guardar posiciones de nodos

-- Agregar columnas de posición a chatters
ALTER TABLE crm_chatters 
ADD COLUMN IF NOT EXISTS flow_position_x NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS flow_position_y NUMERIC DEFAULT NULL;

-- Agregar columnas de posición a models
ALTER TABLE crm_models 
ADD COLUMN IF NOT EXISTS flow_position_x NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS flow_position_y NUMERIC DEFAULT NULL;

-- Agregar columnas de posición a supervisors
ALTER TABLE crm_supervisors 
ADD COLUMN IF NOT EXISTS flow_position_x NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS flow_position_y NUMERIC DEFAULT NULL;

-- Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_chatters_flow_position ON crm_chatters(flow_position_x, flow_position_y);
CREATE INDEX IF NOT EXISTS idx_models_flow_position ON crm_models(flow_position_x, flow_position_y);
CREATE INDEX IF NOT EXISTS idx_supervisors_flow_position ON crm_supervisors(flow_position_x, flow_position_y);

-- Comentarios
COMMENT ON COLUMN crm_chatters.flow_position_x IS 'Posición X del nodo en ReactFlow (para persistencia)';
COMMENT ON COLUMN crm_chatters.flow_position_y IS 'Posición Y del nodo en ReactFlow (para persistencia)';
COMMENT ON COLUMN crm_models.flow_position_x IS 'Posición X del nodo en ReactFlow (para persistencia)';
COMMENT ON COLUMN crm_models.flow_position_y IS 'Posición Y del nodo en ReactFlow (para persistencia)';
COMMENT ON COLUMN crm_supervisors.flow_position_x IS 'Posición X del nodo en ReactFlow (para persistencia)';
COMMENT ON COLUMN crm_supervisors.flow_position_y IS 'Posición Y del nodo en ReactFlow (para persistencia)';
