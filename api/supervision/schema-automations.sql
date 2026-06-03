-- ═══════════════════════════════════════════════════════════════
-- Esquema de tablas para el sistema de automatización y alertas.
-- Ejecutar UNA STATEMENT A LA VEZ en Neon SQL Editor.
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Snapshot diario por (chatter × cuenta) ───
CREATE TABLE IF NOT EXISTS daily_chatter_account_snapshots (
  snapshot_date     DATE         NOT NULL,
  user_id           INTEGER      NOT NULL,
  account_id        INTEGER      NOT NULL,
  revenue_net       NUMERIC(12,2),
  messages_total    INTEGER,
  paid_messages     INTEGER,
  sold_messages     INTEGER,
  reply_time_avg    NUMERIC(8,2),
  PRIMARY KEY (snapshot_date, user_id, account_id)
);

-- ─── 2. Snapshot semanal por cuenta ───
CREATE TABLE IF NOT EXISTS weekly_account_snapshots (
  week_start        DATE         NOT NULL,
  account_id        INTEGER      NOT NULL,
  revenue_total     NUMERIC(12,2),
  new_subs_count    INTEGER,
  PRIMARY KEY (week_start, account_id)
);

-- ─── 3. Snapshot semanal por (chatter × cuenta) ───
CREATE TABLE IF NOT EXISTS weekly_chatter_account_snapshots (
  week_start        DATE         NOT NULL,
  user_id           INTEGER      NOT NULL,
  account_id        INTEGER      NOT NULL,
  revenue_net       NUMERIC(12,2),
  paid_messages     INTEGER,
  sold_messages     INTEGER,
  PRIMARY KEY (week_start, user_id, account_id)
);

-- ─── 4. Log de chargebacks ───
CREATE TABLE IF NOT EXISTS chargebacks_log (
  chargeback_id     VARCHAR(160) PRIMARY KEY,
  account_id        INTEGER      NOT NULL,
  user_id           INTEGER,
  fan_id            VARCHAR(120),
  chat_id           VARCHAR(120),
  amount            NUMERIC(12,2),
  occurred_at       TIMESTAMP    NOT NULL,
  message_ids       JSONB,
  detected_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ─── 5. Tabla de alertas ───
CREATE TABLE IF NOT EXISTS alerts (
  id              BIGSERIAL PRIMARY KEY,
  level           VARCHAR(20)  NOT NULL,
  category        VARCHAR(40)  NOT NULL,
  account_id      INTEGER,
  user_id         INTEGER,
  title           VARCHAR(200) NOT NULL,
  body            TEXT,
  metadata        JSONB,
  acknowledged_at TIMESTAMP,
  acknowledged_by VARCHAR(120),
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── 6. Índices ───
CREATE INDEX IF NOT EXISTS idx_alerts_unack
  ON alerts(created_at DESC) WHERE acknowledged_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_alerts_account
  ON alerts(account_id);
CREATE INDEX IF NOT EXISTS idx_chargebacks_occurred
  ON chargebacks_log(occurred_at DESC);
