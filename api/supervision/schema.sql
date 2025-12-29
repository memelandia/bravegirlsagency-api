-- Esquema de base de datos para Sistema de Supervisión BraveGirls
-- Ejecutar esto UNA VEZ en Vercel Postgres

-- Tabla para ChecklistMes (supervisión diaria)
-- Guarda el estado de cada celda del checklist
CREATE TABLE IF NOT EXISTS checklist_mes (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,  -- Formato: "chatter-cuenta-day-subheader"
  status TEXT NOT NULL,      -- OK, OBS, CRIT, N/A, o vacío
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_checklist_key ON checklist_mes(key);

-- Tabla para VIP Repaso (tracker de ballenas)
CREATE TABLE IF NOT EXISTS vip_repaso (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,  -- Formato: "cuenta-day"
  status TEXT NOT NULL,      -- OK, OBS, CRIT, N/A, o vacío
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vip_key ON vip_repaso(key);

-- Tabla para Registro de Errores
CREATE TABLE IF NOT EXISTS registro_errores (
  id TEXT PRIMARY KEY,       -- Generado en frontend con Date.now()
  fecha DATE NOT NULL,
  cuenta TEXT,
  chatter TEXT,
  tipo TEXT,                 -- Script, Precio irregular, Tiempo de respuesta, etc.
  gravedad TEXT,             -- Mínimo, Medio, Grave
  detalle TEXT,
  traslado TEXT,             -- Sí, No
  estado TEXT,               -- Abierto, Corregido
  link TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_errores_fecha ON registro_errores(fecha);
CREATE INDEX idx_errores_chatter ON registro_errores(chatter);
CREATE INDEX idx_errores_estado ON registro_errores(estado);

-- Tabla para Supervisión Semanal
CREATE TABLE IF NOT EXISTS supervision_semanal (
  id TEXT PRIMARY KEY,
  mes TEXT,
  semana TEXT,               -- Semana 1, Semana 2, Semana 3, Semana 4
  week_index INTEGER,
  chatter TEXT,
  cuenta TEXT,
  facturacion TEXT,
  nuevos_fans TEXT,
  meta_semanal TEXT,
  meta_mensual TEXT,
  posteos TEXT,
  historias TEXT,
  pendientes TEXT,
  resueltos TEXT,
  impacto TEXT,
  tiempo_respuesta TEXT,
  estado_objetivo TEXT,      -- Cumplido, Cerca, Fallido
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_semanal_semana ON supervision_semanal(semana);
CREATE INDEX idx_semanal_chatter ON supervision_semanal(chatter);
CREATE INDEX idx_semanal_cuenta ON supervision_semanal(cuenta);
