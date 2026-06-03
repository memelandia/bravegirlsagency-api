-- ═══════════════════════════════════════════════════════════════
-- Esquema del Dashboard Administrativo y Contable BraveGirls
-- Ejecutar UNA STATEMENT A LA VEZ en Neon SQL Editor.
-- Si Neon rechaza con "read-only transaction", abrir la SQL Editor
-- directamente desde console.neon.tech (no vía Vercel).
-- ═══════════════════════════════════════════════════════════════

-- 1) Planes de servicio (catálogo)
CREATE TABLE IF NOT EXISTS planes_servicio (
  id                       SERIAL PRIMARY KEY,
  nombre                   TEXT NOT NULL,
  porcentaje               NUMERIC(5,2) NOT NULL,
  servicios_factura_texto  TEXT,
  activa                   BOOLEAN DEFAULT TRUE,
  created_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2) Modelos
CREATE TABLE IF NOT EXISTS modelos (
  id                          SERIAL PRIMARY KEY,
  nombre                      TEXT NOT NULL,
  nombre_fiscal               TEXT,
  identificador               TEXT,
  direccion                   TEXT,
  email                       TEXT,
  fecha_inicio                DATE,
  plan_id                     INTEGER REFERENCES planes_servicio(id),
  porcentaje                  NUMERIC(5,2),
  moneda_default              TEXT DEFAULT 'USD',
  medio_pago_default          TEXT DEFAULT 'Transf',
  factura_numero_actual       INTEGER DEFAULT 0,
  gasto_om_modelo_default     NUMERIC(10,2) DEFAULT 0,
  gasto_om_agencia_default    NUMERIC(10,2) DEFAULT 0,
  servicios_factura_texto     TEXT,
  activa                      BOOLEAN DEFAULT TRUE,
  created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3) Cuentas (una modelo puede tener varias: PAID, BIZUM, FREE, AMERICANA, etc)
CREATE TABLE IF NOT EXISTS cuentas (
  id              SERIAL PRIMARY KEY,
  modelo_id       INTEGER REFERENCES modelos(id) ON DELETE CASCADE,
  nombre_cuenta   TEXT NOT NULL,
  tipo            TEXT,
  of_username     TEXT,
  of_password     TEXT,
  activa          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4) Chatters
CREATE TABLE IF NOT EXISTS chatters_admin (
  id                          SERIAL PRIMARY KEY,
  nombre                      TEXT NOT NULL,
  nombre_fiscal               TEXT,
  identificador               TEXT,
  direccion                   TEXT,
  email                       TEXT,
  fecha_inicio                DATE,
  porcentaje_default          NUMERIC(5,2) DEFAULT 15,
  porcentaje_supervisor       NUMERIC(5,2) DEFAULT 5,
  rol                         TEXT DEFAULT 'chatter',
  es_team_leader              BOOLEAN DEFAULT FALSE,
  activo                      BOOLEAN DEFAULT TRUE,
  created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5) Equipo fijo (Aldi, Josue, etc)
CREATE TABLE IF NOT EXISTS equipo_fijo (
  id                  SERIAL PRIMARY KEY,
  nombre              TEXT NOT NULL,
  rol                 TEXT,
  sueldo_mensual_usd  NUMERIC(10,2),
  fecha_inicio        DATE,
  activo              BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6) Cierre mensual por cuenta (base de la factura a modelo)
CREATE TABLE IF NOT EXISTS cierre_cuenta_mes (
  id                        BIGSERIAL PRIMARY KEY,
  mes                       CHAR(7) NOT NULL,
  cuenta_id                 INTEGER REFERENCES cuentas(id) ON DELETE CASCADE,
  fact_total                NUMERIC(12,2) DEFAULT 0,
  suscripciones             NUMERIC(12,2) DEFAULT 0,
  masivos                   NUMERIC(12,2) DEFAULT 0,
  ventas_por_fuera          NUMERIC(12,2) DEFAULT 0,
  observ_ventas_por_fuera   TEXT,
  porcentaje_aplicado       NUMERIC(5,2),
  software_om_fee           NUMERIC(10,2) DEFAULT 0,
  pago_verificado_ig        NUMERIC(10,2) DEFAULT 0,
  otros_extras              JSONB,
  total_a_cobrar            NUMERIC(12,2),
  moneda                    TEXT DEFAULT 'USD',
  cotizacion_eur            NUMERIC(10,4),
  medio_pago                TEXT,
  estado_resumen            TEXT DEFAULT 'pendiente',
  pago_recibido             NUMERIC(12,2) DEFAULT 0,
  observaciones             TEXT,
  created_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (mes, cuenta_id)
);

-- 7) Cierre mensual por (chatter × cuenta)
CREATE TABLE IF NOT EXISTS cierre_chatter_cuenta_mes (
  id                      BIGSERIAL PRIMARY KEY,
  mes                     CHAR(7) NOT NULL,
  chatter_id              INTEGER REFERENCES chatters_admin(id) ON DELETE CASCADE,
  cuenta_id               INTEGER REFERENCES cuentas(id) ON DELETE CASCADE,
  fact_chatter            NUMERIC(12,2) DEFAULT 0,
  porcentaje_comision     NUMERIC(5,2),
  observaciones           TEXT,
  created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (mes, chatter_id, cuenta_id)
);

-- 8) Pago mensual a chatter (resumen + envíos)
CREATE TABLE IF NOT EXISTS chatter_pagos_mes (
  id                        BIGSERIAL PRIMARY KEY,
  mes                       CHAR(7) NOT NULL,
  chatter_id                INTEGER REFERENCES chatters_admin(id) ON DELETE CASCADE,
  comisiones_total          NUMERIC(12,2) DEFAULT 0,
  team_leader_bonus         NUMERIC(10,2) DEFAULT 0,
  incentivos_individuales   JSONB,
  incentivo_mes_ganado      BOOLEAN DEFAULT FALSE,
  incentivo_mes_monto       NUMERIC(10,2) DEFAULT 50,
  total_bruto               NUMERIC(12,2) DEFAULT 0,
  transaction_fee_pct       NUMERIC(5,2),
  neto_a_pagar              NUMERIC(12,2),
  envio_1                   NUMERIC(10,2) DEFAULT 0,
  envio_2                   NUMERIC(10,2) DEFAULT 0,
  envio_3                   NUMERIC(10,2) DEFAULT 0,
  fecha_envio_1             DATE,
  fecha_envio_2             DATE,
  fecha_envio_3             DATE,
  falta_pagar               NUMERIC(12,2),
  observaciones             TEXT,
  UNIQUE (mes, chatter_id)
);

-- 9) Pago mensual a equipo fijo (Aldi, Josue)
CREATE TABLE IF NOT EXISTS equipo_pagos_mes (
  id              BIGSERIAL PRIMARY KEY,
  mes             CHAR(7) NOT NULL,
  equipo_id       INTEGER REFERENCES equipo_fijo(id) ON DELETE CASCADE,
  monto           NUMERIC(10,2),
  envio_1         NUMERIC(10,2) DEFAULT 0,
  envio_2         NUMERIC(10,2) DEFAULT 0,
  falta_pagar     NUMERIC(10,2),
  UNIQUE (mes, equipo_id)
);

-- 10) Comisión mensual del supervisor (Jony)
CREATE TABLE IF NOT EXISTS supervisor_comision_mes (
  id                          BIGSERIAL PRIMARY KEY,
  mes                         CHAR(7) NOT NULL UNIQUE,
  chatter_supervisor_id       INTEGER REFERENCES chatters_admin(id),
  sfs_control                 NUMERIC(10,2) DEFAULT 100,
  comision_suscripciones      NUMERIC(10,2) DEFAULT 0,
  comision_ventas_chatters    NUMERIC(12,2) DEFAULT 0,
  total_bruto                 NUMERIC(12,2),
  transaction_fee_pct         NUMERIC(5,2),
  neto_a_pagar                NUMERIC(12,2),
  observaciones               TEXT
);

-- 11) Histórico incentivos del mes ($50 default)
CREATE TABLE IF NOT EXISTS incentivos_historico (
  id              SERIAL PRIMARY KEY,
  mes             CHAR(7) NOT NULL UNIQUE,
  chatter_id      INTEGER REFERENCES chatters_admin(id),
  monto           NUMERIC(10,2) DEFAULT 50,
  motivo          TEXT
);

-- 12) Gastos del mes (Reddit, OnlyMonster, IA, etc)
CREATE TABLE IF NOT EXISTS gastos_mes (
  id              BIGSERIAL PRIMARY KEY,
  mes             CHAR(7) NOT NULL,
  descripcion     TEXT,
  categoria       TEXT,
  monto           NUMERIC(10,2),
  paga            TEXT DEFAULT 'AGENCIA',
  observaciones   TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13) Facturas emitidas (snapshot inmutable)
CREATE TABLE IF NOT EXISTS facturas_emitidas (
  id                  BIGSERIAL PRIMARY KEY,
  numero              INTEGER NOT NULL,
  tipo                TEXT NOT NULL,
  entidad_tipo        TEXT,
  entidad_id          INTEGER,
  mes                 CHAR(7),
  emisor              TEXT DEFAULT 'BraveGirls Agency LLC',
  fecha_emision       DATE,
  fecha_vencimiento   DATE,
  pago_por            TEXT,
  concepto            TEXT,
  porcentaje_concepto NUMERIC(5,2),
  items               JSONB,
  subtotal            NUMERIC(12,2),
  iva                 NUMERIC(12,2) DEFAULT 0,
  total               NUMERIC(12,2),
  moneda              TEXT DEFAULT 'USD',
  cotizacion_eur     NUMERIC(10,4),
  servicios_pie       TEXT,
  estado              TEXT DEFAULT 'emitida',
  pdf_html_snapshot   TEXT,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (entidad_tipo, entidad_id, numero)
);

-- 14) Config global: transaction fee por mes
CREATE TABLE IF NOT EXISTS transaction_fee_mes (
  mes             CHAR(7) PRIMARY KEY,
  porcentaje      NUMERIC(5,2) NOT NULL
);

-- 15) Override manual de suscripciones para cálculo del supervisor (por mes)
CREATE TABLE IF NOT EXISTS supervisor_suscripciones_mes (
  mes                       CHAR(7) PRIMARY KEY,
  suscripciones_totales     NUMERIC(12,2) NOT NULL,
  created_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 16) Override manual del resumen (facturación y suscripciones no comisionables)
CREATE TABLE IF NOT EXISTS resumen_mes_override (
  mes                       CHAR(7) PRIMARY KEY,
  facturacion_total_manual  NUMERIC(12,2),
  suscripciones_manual      NUMERIC(12,2),
  created_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════
-- ÍNDICES
-- ═══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_cierre_cuenta_mes_mes ON cierre_cuenta_mes(mes);
CREATE INDEX IF NOT EXISTS idx_cierre_chatter_cuenta_mes_mes ON cierre_chatter_cuenta_mes(mes);
CREATE INDEX IF NOT EXISTS idx_chatter_pagos_mes_mes ON chatter_pagos_mes(mes);
CREATE INDEX IF NOT EXISTS idx_facturas_entidad ON facturas_emitidas(entidad_tipo, entidad_id);
CREATE INDEX IF NOT EXISTS idx_gastos_mes_mes ON gastos_mes(mes);

-- ═══════════════════════════════════════════════════════════════
-- SEEDS — datos iniciales
-- ═══════════════════════════════════════════════════════════════

-- Planes de servicio
INSERT INTO planes_servicio (id, nombre, porcentaje, servicios_factura_texto, activa) VALUES
  (1, 'Plan Inicial - Solo Gestion', 40, 'Manejo de Chatting OF, Posteos, Publicaciones', TRUE),
  (2, 'Plan Avanzado - Gestion y Trafico', 50, 'Manejo de Chatting OF, Posteos, Publicaciones. Venta de Contenido a traves de la Plataforma. Manejo de Redes Sociales', TRUE),
  (3, 'Plan Premium - Gestion Completa', 60, 'Gestión completa de la cuenta: chatting, tráfico, redes sociales, edición de contenido, soporte 24/7', TRUE)
ON CONFLICT (id) DO NOTHING;

SELECT setval('planes_servicio_id_seq', (SELECT MAX(id) FROM planes_servicio));

-- Equipo fijo
INSERT INTO equipo_fijo (id, nombre, rol, sueldo_mensual_usd, activo) VALUES
  (1, 'Aldi',  'Account Manager', 600, TRUE),
  (2, 'Josue', 'Editor',          400, TRUE)
ON CONFLICT (id) DO NOTHING;

SELECT setval('equipo_fijo_id_seq', (SELECT MAX(id) FROM equipo_fijo));
