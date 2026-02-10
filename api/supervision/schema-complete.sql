-- ============================================================================
-- SCRIPT DE VERIFICACIÓN Y CREACIÓN COMPLETA DEL ESQUEMA DE SUPERVISIÓN
-- INSTRUCCIONES: Ejecuta cada bloque UNO POR UNO en NeonTech
-- ============================================================================

-- BLOQUE 1: Crear tabla checklist_mes
CREATE TABLE IF NOT EXISTS checklist_mes (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- BLOQUE 2: Crear índice para checklist_mes
CREATE INDEX IF NOT EXISTS idx_checklist_key ON checklist_mes(key);

-- BLOQUE 3: Crear tabla vip_repaso
CREATE TABLE IF NOT EXISTS vip_repaso (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- BLOQUE 4: Crear índice para vip_repaso
CREATE INDEX IF NOT EXISTS idx_vip_key ON vip_repaso(key);

-- BLOQUE 5: Crear tabla vip_fans
CREATE TABLE IF NOT EXISTS vip_fans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  account TEXT NOT NULL,
  type TEXT NOT NULL,
  chat_link TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- BLOQUE 6: Crear índices para vip_fans
CREATE INDEX IF NOT EXISTS idx_vip_fans_account ON vip_fans(account);

-- BLOQUE 7: Crear segundo índice para vip_fans
CREBLOQUE 8: Crear tabla registro_errores
CREATE TABLE IF NOT EXISTS registro_errores (
  id TEXT PRIMARY KEY,
  fecha DATE NOT NULL,
  cuenta TEXT,
  chatter TEXT,
  tipo TEXT,
  gravedad TEXT,
  detalle TEXT,
  traslado TEXT,
  estado TEXT,
  link TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- BLOQUE 9: Crear índices para registro_errores
CREATE INDEX IF NOT EXISTS idx_errores_fecha ON registro_errores(fecha);

-- BLOQUE 10: Crear segundo índice para registro_errores
CREATE INDEX IF NOT EXISTS idx_errores_chatter ON registro_errores(chatter);

-- BLOQUE 11: Crear tercer índice para registro_errores
CREBLOQUE 12: Crear tabla supervision_semanal
CREATE TABLE IF NOT EXISTS supervision_semanal (
  id TEXT PRIMARY KEY,
  mes TEXT,
  semana TEXT,
  week_index INTEGER,
  chatter TEXT,
  cuenta TEXT,
  facturacion TEXT,
  nuevos_fans TEXT,
  meta_semanal TEXT,
  meta_mensual TEXT,
  meta_facturacion TEXT,
  facturacion_mensual_objetivo TEXT,
  posteos TEXT,
  historias TEXT,
  pendientes TEXT,
  resueltos TEXT,
  impacto TEXT,
  tiempo_respuesta TEXT,
  estado_objetivo TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- BLOQUE 13: Crear índices para supervision_semanal
CREATE INDEX IF NOT EXISTS idx_semanal_chatter ON supervision_semanal(chatter);

-- BLOQUE 14: Crear segundo índice para supervision_semanal
CREATE INDEX IF NOT EXISTS idx_semanal_semana ON supervision_semanal(semana);

-- BLOQUE 15: Crear tercer índice para supervision_semanal
);

CREATE INDEX IF NOT EXISTS idx_semanal_chatter ON supervision_semanal(chatter);
CREATE INDEX IF NOT EXISTS idx_semanal_semana ON supervision_semanal(semana);
CREATE INDEX IF NOT EXISTS idx_semanal_week_index ON supervision_semanal(week_index);

-- ============================================================================
-- CONSULTAS DE VERIFICACIÓN (Ejecuta estas después de crear las tablas)
-- ============================================================================

-- VERIFICACIÓN 1: Ver todas las tablas creadas
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as columnas
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('checklist_mes','vip_repaso','vip_fans','registro_errores','supervision_semanal')
ORDER BY table_name;

-- VERIFICACIÓN 2: Contar registros en cada tabla  
SELECT 'checklist_mes' as tabla, COUNT(*) as registros FROM checklist_mes
UNION ALL
SELECT 'vip_repaso', COUNT(*) FROM vip_repaso
UNION ALL
SELECT 'vip_fans', COUNT(*) FROM vip_fans
UNION ALL
SELECT 'registro_errores', COUNT(*) FROM registro_errores
UNION ALL
SELECT 'supervision_semanal', COUNT(*) FROM supervision_semanal
ORDER BY tabla;

-- ============================================================================
-- RESULTADO ESPERADO DE LA VERIFICACIÓN:
-- checklist_mes: 4 columnas
-- vip_repaso: 4 columnas
-- vip_fans: 6 columnas
-- registro_errores: 11 columnas
-- supervision_semanal: 20 columnas
-- ============================================================================
