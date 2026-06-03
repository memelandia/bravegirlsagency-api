/**
 * /api/automations — Motor de automatización + alertas para BraveGirls.
 *
 * Endpoints:
 *   GET  /api/automations?action=daily-run        (cron 5 AM UTC — auth: Bearer CRON_SECRET)
 *   GET  /api/automations?action=alerts&limit=N   (dashboard pide alertas no resueltas)
 *   POST /api/automations?action=acknowledge      (body: { id, user })
 *   GET  /api/automations?action=weekly-report&week=YYYY-MM-DD (datos comparativa semanal)
 *
 * Tablas requeridas (ver api/supervision/schema-automations.sql):
 *   daily_chatter_account_snapshots
 *   weekly_account_snapshots
 *   weekly_chatter_account_snapshots
 *   chargebacks_log
 *   alerts
 */

const { sql } = require('@vercel/postgres');
const fetch = require('node-fetch');

const ONLYMONSTER_API_KEY =
  process.env.ONLYMONSTER_API_KEY ||
  'om_token_37211a79c42556feab68a2fdfc74c49087008c48b5b81e5b677877fd2c2be9b5';
const OM_BASE = 'https://omapi.onlymonster.ai';

// ═══════════════════════════════════════════════════════════════
// THRESHOLDS — centralizadas para tunear fácil después
// ═══════════════════════════════════════════════════════════════
const THRESHOLDS = {
  WEEKLY_DROP_WARNING:   -0.20,  // -20% revenue semanal vs semana anterior
  WEEKLY_DROP_CRITICAL:  -0.40,
  SUBS_DROP_WARNING:     -0.30,  // -30% subs nuevos semanal vs semana anterior
  D6_REPLY_TIME_MAX:      900,    // segundos (15 min)
  D7_MIN_PPV:             50,     // PPV enviados para considerar "muchos PPV"
  D7_LOW_CONVERSION:      0.05,   // 5%
};

// ═══════════════════════════════════════════════════════════════
// Helpers de fechas (UTC siempre)
// ═══════════════════════════════════════════════════════════════
function yesterdayUTC() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
function dateToYYYYMMDD(d) {
  return d.toISOString().slice(0, 10);
}
function isoStart(d) { return new Date(d).toISOString(); }
function isoEnd(d) {
  const e = new Date(d);
  e.setUTCHours(23, 59, 59, 999);
  return e.toISOString();
}
// Lunes UTC más cercano hacia atrás (inclusive)
function mondayOfWeek(d) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  const dow = x.getUTCDay();              // 0 = dom, 1 = lun, ..., 6 = sáb
  const diff = (dow === 0 ? 6 : dow - 1); // distancia al lunes
  x.setUTCDate(x.getUTCDate() - diff);
  return x;
}
function addDays(d, n) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}
function isMondayUTC(d) { return d.getUTCDay() === 1; }

// ═══════════════════════════════════════════════════════════════
// Helper fetch OM con retry
// ═══════════════════════════════════════════════════════════════
async function omGet(path) {
  const url = `${OM_BASE}${path}`;
  const MAX_TRIES = 3;
  for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'x-om-auth-token': ONLYMONSTER_API_KEY,
          'Accept': 'application/json'
        }
      });
      if (res.ok) return await res.json();
      if (res.status === 429 || res.status >= 500) {
        await new Promise(r => setTimeout(r, attempt * 800));
        continue;
      }
      const body = await res.text();
      throw new Error(`OM ${path} HTTP ${res.status}: ${body.slice(0, 200)}`);
    } catch (e) {
      if (attempt === MAX_TRIES) throw e;
      await new Promise(r => setTimeout(r, attempt * 800));
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// Cálculos sobre items de /users/metrics
// ═══════════════════════════════════════════════════════════════
function revenueNet(item) {
  const sm = item.sold_messages_price_sum || 0;
  const tp = item.tips_amount_sum || 0;
  const sp = item.sold_posts_price_sum || 0;
  return Math.round((sm + tp + sp) * 0.8 * 100) / 100;
}

// ═══════════════════════════════════════════════════════════════
// Snapshots
// ═══════════════════════════════════════════════════════════════
/**
 * Snapshot diario: para cada cuenta, traemos métricas del día anterior
 * filtradas por creator_id, lo que devuelve una fila por chatter activo.
 */
async function runDailySnapshot(targetDate) {
  // Lista de cuentas activas
  const accountsResp = await omGet('/api/v0/accounts?limit=100');
  const accounts = accountsResp.accounts || accountsResp.items || accountsResp.data || [];

  const from = isoStart(targetDate);
  const to = isoEnd(targetDate);

  // Una llamada por cuenta en paralelo
  const results = await Promise.all(
    accounts.map(async (acc) => {
      const path = `/api/v0/users/metrics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&creator_ids=${acc.id}&offset=0&limit=100`;
      try {
        const data = await omGet(path);
        return { accountId: acc.id, items: data.items || [] };
      } catch (e) {
        console.error(`[snapshot] error acc=${acc.id}:`, e.message);
        return { accountId: acc.id, items: [] };
      }
    })
  );

  // Aplanar a filas y bulk insert
  const rows = [];
  for (const { accountId, items } of results) {
    for (const it of items) {
      rows.push({
        snapshot_date: dateToYYYYMMDD(targetDate),
        user_id: Number(it.user_id),
        account_id: Number(accountId),
        revenue_net: revenueNet(it),
        messages_total: it.messages_count || 0,
        paid_messages: it.paid_messages_count || 0,
        sold_messages: it.sold_messages_count || 0,
        reply_time_avg: Math.round((it.reply_time_avg || 0) * 100) / 100
      });
    }
  }

  // UPSERT en transacción
  await sql`BEGIN`;
  try {
    for (const r of rows) {
      await sql`
        INSERT INTO daily_chatter_account_snapshots
          (snapshot_date, user_id, account_id, revenue_net, messages_total, paid_messages, sold_messages, reply_time_avg)
        VALUES (${r.snapshot_date}, ${r.user_id}, ${r.account_id}, ${r.revenue_net}, ${r.messages_total}, ${r.paid_messages}, ${r.sold_messages}, ${r.reply_time_avg})
        ON CONFLICT (snapshot_date, user_id, account_id) DO UPDATE SET
          revenue_net    = EXCLUDED.revenue_net,
          messages_total = EXCLUDED.messages_total,
          paid_messages  = EXCLUDED.paid_messages,
          sold_messages  = EXCLUDED.sold_messages,
          reply_time_avg = EXCLUDED.reply_time_avg
      `;
    }
    await sql`COMMIT`;
  } catch (e) {
    await sql`ROLLBACK`;
    throw e;
  }

  return { accounts: accounts.length, rows: rows.length };
}

/**
 * Snapshot semanal: corre los lunes, mira la semana anterior completa (lun-dom).
 * Llena weekly_account_snapshots y weekly_chatter_account_snapshots.
 * También descarga chargebacks de la semana → chargebacks_log.
 */
async function runWeeklySnapshot(weekStartDate) {
  const accountsResp = await omGet('/api/v0/accounts?limit=100');
  const accounts = accountsResp.accounts || accountsResp.items || accountsResp.data || [];

  const weekEnd = addDays(weekStartDate, 6);
  const from = isoStart(weekStartDate);
  const to = isoEnd(weekEnd);

  // ─── Métricas por chatter+cuenta de la semana ───
  const metricResults = await Promise.all(
    accounts.map(async (acc) => {
      const path = `/api/v0/users/metrics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&creator_ids=${acc.id}&offset=0&limit=100`;
      try {
        const data = await omGet(path);
        return { accountId: acc.id, items: data.items || [] };
      } catch (e) {
        console.error(`[weekly-metrics] error acc=${acc.id}:`, e.message);
        return { accountId: acc.id, items: [] };
      }
    })
  );

  // ─── Transactions para contar new subs por cuenta ───
  // Importante: las URLs /platforms/onlyfans/accounts/{X}/... requieren el platform_account_id (ID de OnlyFans),
  // NO el OM internal id. La columna account_id en DB sí usa el OM internal id para que matchee useOMConfig.
  const subsResults = await Promise.all(
    accounts.map(async (acc) => {
      const pid = acc.platform_account_id || acc.id;
      try {
        let count = 0, cursor = null, pages = 0;
        do {
          const cur = cursor ? `&cursor=${encodeURIComponent(cursor)}` : '';
          const path = `/api/v0/platforms/onlyfans/accounts/${pid}/transactions?start=${encodeURIComponent(from)}&end=${encodeURIComponent(to)}&limit=1000${cur}`;
          const data = await omGet(path);
          const items = data.items || data.transactions || [];
          for (const t of items) {
            const type = String(t.type || t.kind || '').toLowerCase();
            if (type === 'subscription' || type === 'sub' || type === 'new_subscription' || type.includes('subscribe')) {
              count++;
            }
          }
          cursor = data.nextCursor || data.cursor || null;
          pages++;
          if (pages > 5) break; // safety
        } while (cursor);
        return { accountId: acc.id, newSubs: count };
      } catch (e) {
        console.error(`[weekly-subs] error acc=${acc.id} pid=${pid}:`, e.message);
        return { accountId: acc.id, newSubs: 0 };
      }
    })
  );

  // ─── Chargebacks de la semana ───
  const chargebackResults = await Promise.all(
    accounts.map(async (acc) => {
      const pid = acc.platform_account_id || acc.id;
      try {
        const path = `/api/v0/platforms/onlyfans/accounts/${pid}/chargebacks?start=${encodeURIComponent(from)}&end=${encodeURIComponent(to)}&limit=1000`;
        const data = await omGet(path);
        const items = data.items || data.chargebacks || data.data || [];
        return { accountId: acc.id, items };
      } catch (e) {
        console.error(`[weekly-chargebacks] error acc=${acc.id} pid=${pid}:`, e.message);
        return { accountId: acc.id, items: [] };
      }
    })
  );

  // ─── Persistir semanal por chatter+cuenta + por cuenta ───
  const weekStartStr = dateToYYYYMMDD(weekStartDate);
  const accountTotals = new Map(); // accountId -> { revenue }

  await sql`BEGIN`;
  try {
    // Per (chatter, account)
    for (const { accountId, items } of metricResults) {
      let acctRev = 0;
      for (const it of items) {
        const rev = revenueNet(it);
        const paid = it.paid_messages_count || 0;
        const sold = it.sold_messages_count || 0;
        await sql`
          INSERT INTO weekly_chatter_account_snapshots
            (week_start, user_id, account_id, revenue_net, paid_messages, sold_messages)
          VALUES (${weekStartStr}, ${Number(it.user_id)}, ${Number(accountId)}, ${rev}, ${paid}, ${sold})
          ON CONFLICT (week_start, user_id, account_id) DO UPDATE SET
            revenue_net   = EXCLUDED.revenue_net,
            paid_messages = EXCLUDED.paid_messages,
            sold_messages = EXCLUDED.sold_messages
        `;
        acctRev += rev;
      }
      accountTotals.set(Number(accountId), acctRev);
    }

    // Per cuenta (revenue total + new subs)
    for (const { accountId, newSubs } of subsResults) {
      const rev = accountTotals.get(Number(accountId)) || 0;
      await sql`
        INSERT INTO weekly_account_snapshots
          (week_start, account_id, revenue_total, new_subs_count)
        VALUES (${weekStartStr}, ${Number(accountId)}, ${rev}, ${newSubs})
        ON CONFLICT (week_start, account_id) DO UPDATE SET
          revenue_total  = EXCLUDED.revenue_total,
          new_subs_count = EXCLUDED.new_subs_count
      `;
    }

    // Chargebacks — estructura real OM: { id, amount, fan: {id}, type, status, chargeback_timestamp, transaction_timestamp }
    for (const { accountId, items } of chargebackResults) {
      for (const cb of items) {
        const id = String(cb.id || cb.chargeback_id || `${accountId}-${cb.amount}-${cb.chargeback_timestamp || cb.transaction_timestamp}`);
        const amount = Number(cb.amount || cb.price || 0);
        const occurred = cb.chargeback_timestamp || cb.transaction_timestamp || cb.occurred_at || cb.created_at || new Date().toISOString();
        const fanId = cb.fan?.id || cb.fan_id || cb.user_id || cb.subscriber_id || null;
        // En OF el chat URL usa el fan_id como chat_id (cada fan = un chat). Reusamos fanId.
        const chatId = cb.chat_id || cb.chatId || fanId || null;
        const msgIds = JSON.stringify(cb.chargedback_message_ids || cb.message_ids || []);
        await sql`
          INSERT INTO chargebacks_log
            (chargeback_id, account_id, user_id, fan_id, chat_id, amount, occurred_at, message_ids)
          VALUES (${id}, ${Number(accountId)}, ${null}, ${fanId ? String(fanId) : null}, ${chatId ? String(chatId) : null}, ${amount}, ${occurred}, ${msgIds}::jsonb)
          ON CONFLICT (chargeback_id) DO NOTHING
        `;
      }
    }

    await sql`COMMIT`;
  } catch (e) {
    await sql`ROLLBACK`;
    throw e;
  }

  return {
    accounts: accounts.length,
    chargebacks: chargebackResults.reduce((s, r) => s + r.items.length, 0),
    weekStart: weekStartStr
  };
}

// ═══════════════════════════════════════════════════════════════
// Insert alerta con dedupe
// ═══════════════════════════════════════════════════════════════
async function insertAlert(level, category, accountId, userId, title, body, metadata) {
  // Dedupe: no insertar si ya hay una alerta unack del mismo (category, account, user) en las últimas 26h
  const { rows } = await sql`
    SELECT id FROM alerts
    WHERE category = ${category}
      AND account_id IS NOT DISTINCT FROM ${accountId}
      AND user_id IS NOT DISTINCT FROM ${userId}
      AND acknowledged_at IS NULL
      AND created_at > NOW() - INTERVAL '26 hours'
    LIMIT 1
  `;
  if (rows.length > 0) return null;

  const meta = metadata ? JSON.stringify(metadata) : null;
  const inserted = await sql`
    INSERT INTO alerts (level, category, account_id, user_id, title, body, metadata)
    VALUES (${level}, ${category}, ${accountId}, ${userId}, ${title}, ${body}, ${meta}::jsonb)
    RETURNING id
  `;
  return inserted.rows[0]?.id;
}

// ═══════════════════════════════════════════════════════════════
// Detecciones diarias (D5, D6, D7) sobre snapshot del día anterior
// ═══════════════════════════════════════════════════════════════
async function detectDaily(targetDateStr) {
  let inserted = 0;

  // Traer todas las filas del día y los nombres
  const { rows } = await sql`
    SELECT s.user_id, s.account_id, s.revenue_net, s.messages_total, s.paid_messages, s.sold_messages, s.reply_time_avg
    FROM daily_chatter_account_snapshots s
    WHERE s.snapshot_date = ${targetDateStr}
  `;

  // Resolver nombres de cuentas y chatters (1 call OM accounts cacheable)
  // Para v1 simplificado: dejamos el ID, el frontend mapea con useOMConfig
  for (const r of rows) {
    const accountLabel = `acc ${r.account_id}`;
    const userLabel = `user ${r.user_id}`;

    // D5: PPV == 0 (solo alerta si tuvo algo de actividad - evitar ruido de cuentas vacías)
    if (Number(r.paid_messages) === 0 && Number(r.messages_total) > 0) {
      const id = await insertAlert(
        'warning', 'D5',
        Number(r.account_id), Number(r.user_id),
        `Chatter sin PPV enviados`,
        `El chatter no envió ningún PPV en esta cuenta el ${targetDateStr}, pero sí chateó (${r.messages_total} mensajes).`,
        { date: targetDateStr, messages: Number(r.messages_total) }
      );
      if (id) inserted++;
    }

    // D6: reply_time_avg > 900s
    if (Number(r.reply_time_avg) > THRESHOLDS.D6_REPLY_TIME_MAX) {
      const mins = Math.round(Number(r.reply_time_avg) / 60);
      const id = await insertAlert(
        'warning', 'D6',
        Number(r.account_id), Number(r.user_id),
        `Reply time alto: ${mins} min promedio`,
        `El chatter tardó en promedio ${mins} minutos en responder en esta cuenta el ${targetDateStr}. Umbral: 15 min.`,
        { date: targetDateStr, replyTimeSeconds: Number(r.reply_time_avg) }
      );
      if (id) inserted++;
    }

    // D7: muchos PPV pero baja conversión
    const paid = Number(r.paid_messages);
    const sold = Number(r.sold_messages);
    if (paid >= THRESHOLDS.D7_MIN_PPV) {
      const conv = sold / paid;
      if (conv < THRESHOLDS.D7_LOW_CONVERSION) {
        const id = await insertAlert(
          'warning', 'D7',
          Number(r.account_id), Number(r.user_id),
          `Baja conversión: ${(conv * 100).toFixed(1)}% (${sold} de ${paid} PPV)`,
          `El chatter envió ${paid} PPV pero solo se vendieron ${sold} (${(conv * 100).toFixed(1)}%). Umbral: 5% sobre ≥50 PPV.`,
          { date: targetDateStr, paid, sold, conversionRate: conv }
        );
        if (id) inserted++;
      }
    }
  }

  return inserted;
}

// ═══════════════════════════════════════════════════════════════
// Detecciones semanales (S1, S2, S3, S4) sobre snapshot recién insertado
// Compara semana recién cerrada vs la anterior
// ═══════════════════════════════════════════════════════════════
async function detectWeekly(thisMondayStr) {
  let inserted = 0;
  const thisMonday = new Date(thisMondayStr + 'T00:00:00Z');
  const lastMondayStr = dateToYYYYMMDD(addDays(thisMonday, -7));

  // ─── S3: total cuenta semana actual vs anterior ───
  const accRows = await sql`
    SELECT
      a.account_id,
      a.revenue_total AS this_rev,
      a.new_subs_count AS this_subs,
      COALESCE(p.revenue_total, 0) AS prev_rev,
      COALESCE(p.new_subs_count, 0) AS prev_subs
    FROM weekly_account_snapshots a
    LEFT JOIN weekly_account_snapshots p
      ON p.account_id = a.account_id AND p.week_start = ${lastMondayStr}
    WHERE a.week_start = ${thisMondayStr}
  `;

  for (const r of accRows.rows) {
    const accId = Number(r.account_id);
    const thisRev = Number(r.this_rev || 0);
    const prevRev = Number(r.prev_rev || 0);

    // S3: revenue total cuenta
    if (prevRev > 0) {
      const delta = (thisRev - prevRev) / prevRev;
      if (delta <= THRESHOLDS.WEEKLY_DROP_CRITICAL) {
        const id = await insertAlert(
          'critical', 'S3',
          accId, null,
          `Facturación cayó ${(delta * 100).toFixed(1)}% en la semana`,
          `La cuenta pasó de $${prevRev.toFixed(2)} la semana pasada a $${thisRev.toFixed(2)} esta semana.`,
          { weekStart: thisMondayStr, thisRev, prevRev, deltaPct: delta }
        );
        if (id) inserted++;
      } else if (delta <= THRESHOLDS.WEEKLY_DROP_WARNING) {
        const id = await insertAlert(
          'warning', 'S3',
          accId, null,
          `Facturación cayó ${(delta * 100).toFixed(1)}% en la semana`,
          `La cuenta pasó de $${prevRev.toFixed(2)} la semana pasada a $${thisRev.toFixed(2)} esta semana.`,
          { weekStart: thisMondayStr, thisRev, prevRev, deltaPct: delta }
        );
        if (id) inserted++;
      }
    }

    // S2: caída de subs nuevos
    const thisSubs = Number(r.this_subs || 0);
    const prevSubs = Number(r.prev_subs || 0);
    if (prevSubs > 0) {
      const subsDelta = (thisSubs - prevSubs) / prevSubs;
      if (subsDelta <= THRESHOLDS.SUBS_DROP_WARNING) {
        const id = await insertAlert(
          'warning', 'S2',
          accId, null,
          `Subs nuevos cayeron ${(subsDelta * 100).toFixed(1)}%`,
          `La cuenta tuvo ${thisSubs} subs nuevos esta semana vs ${prevSubs} la anterior.`,
          { weekStart: thisMondayStr, thisSubs, prevSubs, deltaPct: subsDelta }
        );
        if (id) inserted++;
      }
    }
  }

  // ─── S1: chatter×cuenta semana actual vs anterior ───
  const chRows = await sql`
    SELECT
      a.user_id,
      a.account_id,
      a.revenue_net AS this_rev,
      COALESCE(p.revenue_net, 0) AS prev_rev
    FROM weekly_chatter_account_snapshots a
    LEFT JOIN weekly_chatter_account_snapshots p
      ON p.user_id = a.user_id AND p.account_id = a.account_id AND p.week_start = ${lastMondayStr}
    WHERE a.week_start = ${thisMondayStr}
  `;

  for (const r of chRows.rows) {
    const userId = Number(r.user_id);
    const accId = Number(r.account_id);
    const thisRev = Number(r.this_rev || 0);
    const prevRev = Number(r.prev_rev || 0);

    if (prevRev > 0 && thisRev < prevRev) {
      const delta = (thisRev - prevRev) / prevRev;
      if (delta <= THRESHOLDS.WEEKLY_DROP_CRITICAL) {
        const id = await insertAlert(
          'critical', 'S1',
          accId, userId,
          `Chatter cayó ${(delta * 100).toFixed(1)}% en esta cuenta`,
          `Facturación del chatter en esta cuenta: $${prevRev.toFixed(2)} → $${thisRev.toFixed(2)}.`,
          { weekStart: thisMondayStr, thisRev, prevRev, deltaPct: delta }
        );
        if (id) inserted++;
      } else if (delta <= THRESHOLDS.WEEKLY_DROP_WARNING) {
        const id = await insertAlert(
          'warning', 'S1',
          accId, userId,
          `Chatter cayó ${(delta * 100).toFixed(1)}% en esta cuenta`,
          `Facturación del chatter en esta cuenta: $${prevRev.toFixed(2)} → $${thisRev.toFixed(2)}.`,
          { weekStart: thisMondayStr, thisRev, prevRev, deltaPct: delta }
        );
        if (id) inserted++;
      }
    }
  }

  // ─── S4: cada chargeback nuevo = alerta crítica ───
  const cbRows = await sql`
    SELECT c.chargeback_id, c.account_id, c.user_id, c.fan_id, c.chat_id, c.amount, c.occurred_at
    FROM chargebacks_log c
    LEFT JOIN alerts a
      ON a.category = 'S4' AND (a.metadata->>'chargebackId') = c.chargeback_id
    WHERE c.occurred_at >= ${thisMondayStr}::date
      AND a.id IS NULL
  `;
  for (const cb of cbRows.rows) {
    const id = await insertAlert(
      'critical', 'S4',
      Number(cb.account_id),
      cb.user_id ? Number(cb.user_id) : null,
      `Chargeback de $${Number(cb.amount).toFixed(2)}`,
      cb.user_id
        ? `Chatter responsable: user ${cb.user_id}. Fan: ${cb.fan_id || 'desconocido'}.`
        : `Chargeback en cuenta ${cb.account_id}. Fan: ${cb.fan_id || 'desconocido'}.`,
      {
        chargebackId: cb.chargeback_id,
        amount: Number(cb.amount),
        occurredAt: cb.occurred_at,
        fanId: cb.fan_id,
        chatId: cb.chat_id
        // Nota: el link se computa en el frontend desde chatId/fanId para no
        // hardcodear el formato de URL en la DB (futuro-proof).
      }
    );
    if (id) inserted++;
  }

  return inserted;
}

// ═══════════════════════════════════════════════════════════════
// HANDLER
// ═══════════════════════════════════════════════════════════════
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action || '';

  try {
    // ─── STATS (chequeo rápido de lo que hay en DB) ───
    if (action === 'stats') {
      const r = await sql`
        SELECT
          (SELECT count(*) FROM daily_chatter_account_snapshots) AS daily_rows,
          (SELECT count(*) FROM weekly_account_snapshots) AS weekly_acc_rows,
          (SELECT count(*) FROM weekly_chatter_account_snapshots) AS weekly_chatter_rows,
          (SELECT count(*) FROM chargebacks_log) AS chargebacks_rows,
          (SELECT count(*) FROM alerts) AS alerts_total,
          (SELECT count(*) FROM alerts WHERE acknowledged_at IS NULL) AS alerts_unack
      `;
      const days = await sql`
        SELECT snapshot_date, count(*) AS rows
        FROM daily_chatter_account_snapshots
        GROUP BY snapshot_date
        ORDER BY snapshot_date DESC
        LIMIT 30
      `;
      const weeks = await sql`
        SELECT week_start, count(*) AS rows
        FROM weekly_account_snapshots
        GROUP BY week_start
        ORDER BY week_start DESC
        LIMIT 12
      `;
      return res.status(200).json({
        success: true,
        counts: r.rows[0],
        daily_dates: days.rows,
        weekly_dates: weeks.rows
      });
    }

    // ─── BACKFILL DAY (poblar un día específico) ───
    if (action === 'backfill-day') {
      const expected = process.env.CRON_SECRET;
      if (expected) {
        const auth = req.headers['authorization'] || '';
        if (auth !== `Bearer ${expected}`) {
          return res.status(401).json({ success: false, error: 'unauthorized' });
        }
      }
      const dateParam = req.query.date;
      if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        return res.status(400).json({ success: false, error: 'date=YYYY-MM-DD requerido' });
      }
      const target = new Date(dateParam + 'T00:00:00Z');
      const daily = await runDailySnapshot(target);
      const alerts = await detectDaily(dateParam);
      return res.status(200).json({ success: true, date: dateParam, daily, alerts });
    }

    // ─── BACKFILL WEEK (poblar una semana específica) ───
    if (action === 'backfill-week') {
      const expected = process.env.CRON_SECRET;
      if (expected) {
        const auth = req.headers['authorization'] || '';
        if (auth !== `Bearer ${expected}`) {
          return res.status(401).json({ success: false, error: 'unauthorized' });
        }
      }
      const mondayParam = req.query.monday;
      if (!mondayParam || !/^\d{4}-\d{2}-\d{2}$/.test(mondayParam)) {
        return res.status(400).json({ success: false, error: 'monday=YYYY-MM-DD requerido' });
      }
      const monday = new Date(mondayParam + 'T00:00:00Z');
      if (monday.getUTCDay() !== 1) {
        return res.status(400).json({ success: false, error: 'el parámetro monday debe ser un lunes UTC' });
      }
      const weekly = await runWeeklySnapshot(monday);
      const detectAlerts = req.query.detect === '1' ? await detectWeekly(mondayParam) : 0;
      return res.status(200).json({ success: true, monday: mondayParam, weekly, alerts: detectAlerts });
    }

    // ─── DAILY RUN (cron) ───
    if (action === 'daily-run') {
      // Validar CRON_SECRET si está configurado
      const expected = process.env.CRON_SECRET;
      if (expected) {
        const auth = req.headers['authorization'] || '';
        if (auth !== `Bearer ${expected}`) {
          return res.status(401).json({ success: false, error: 'unauthorized' });
        }
      }

      const target = yesterdayUTC();
      const targetStr = dateToYYYYMMDD(target);

      const daily = await runDailySnapshot(target);
      const dailyAlerts = await detectDaily(targetStr);

      let weekly = null, weeklyAlerts = 0;
      if (isMondayUTC(new Date())) {
        // El lunes 5 AM, la semana cerrada es la que arrancó hace 7 días
        const lastMonday = mondayOfWeek(addDays(new Date(), -7));
        weekly = await runWeeklySnapshot(lastMonday);
        weeklyAlerts = await detectWeekly(dateToYYYYMMDD(lastMonday));
      }

      return res.status(200).json({
        success: true,
        snapshot_date: targetStr,
        daily,
        daily_alerts: dailyAlerts,
        weekly,
        weekly_alerts: weeklyAlerts,
        timestamp: new Date().toISOString()
      });
    }

    // ─── ALERTS LIST ───
    if (action === 'alerts') {
      const limit = Math.min(parseInt(req.query.limit) || 100, 500);
      const includeAck = req.query.includeAck === '1';

      const result = includeAck
        ? await sql`
            SELECT id, level, category, account_id, user_id, title, body, metadata,
                   acknowledged_at, acknowledged_by, created_at
            FROM alerts
            ORDER BY created_at DESC
            LIMIT ${limit}
          `
        : await sql`
            SELECT id, level, category, account_id, user_id, title, body, metadata,
                   acknowledged_at, acknowledged_by, created_at
            FROM alerts
            WHERE acknowledged_at IS NULL
            ORDER BY
              CASE level WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
              created_at DESC
            LIMIT ${limit}
          `;

      const data = result.rows.map(r => ({
        id: Number(r.id),
        level: r.level,
        category: r.category,
        accountId: r.account_id != null ? Number(r.account_id) : null,
        userId: r.user_id != null ? Number(r.user_id) : null,
        title: r.title,
        body: r.body,
        metadata: r.metadata,
        acknowledgedAt: r.acknowledged_at,
        acknowledgedBy: r.acknowledged_by,
        createdAt: r.created_at
      }));
      return res.status(200).json({ success: true, data });
    }

    // ─── ACKNOWLEDGE ───
    if (action === 'acknowledge') {
      if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'POST required' });
      const { id, user } = req.body || {};
      if (!id) return res.status(400).json({ success: false, error: 'id requerido' });
      const who = user ? String(user).slice(0, 120) : 'unknown';
      await sql`
        UPDATE alerts
        SET acknowledged_at = CURRENT_TIMESTAMP,
            acknowledged_by = ${who}
        WHERE id = ${Number(id)} AND acknowledged_at IS NULL
      `;
      return res.status(200).json({ success: true });
    }

    // ─── WEEKLY REPORT ───
    if (action === 'weekly-report') {
      const weekParam = req.query.week;
      // Si no viene, tomamos el lunes pasado (la semana cerrada más reciente)
      const weekDate = weekParam
        ? new Date(weekParam + 'T00:00:00Z')
        : mondayOfWeek(addDays(new Date(), -7));
      const weekStr = dateToYYYYMMDD(weekDate);
      const prevStr = dateToYYYYMMDD(addDays(weekDate, -7));

      const acc = await sql`
        SELECT
          a.account_id,
          a.revenue_total AS this_rev,
          COALESCE(p.revenue_total, 0) AS prev_rev,
          a.new_subs_count AS this_subs,
          COALESCE(p.new_subs_count, 0) AS prev_subs
        FROM weekly_account_snapshots a
        LEFT JOIN weekly_account_snapshots p
          ON p.account_id = a.account_id AND p.week_start = ${prevStr}
        WHERE a.week_start = ${weekStr}
        ORDER BY a.revenue_total DESC NULLS LAST
      `;

      const chatter = await sql`
        SELECT
          a.user_id, a.account_id,
          a.revenue_net AS this_rev,
          a.paid_messages AS this_paid,
          a.sold_messages AS this_sold,
          COALESCE(p.revenue_net, 0) AS prev_rev
        FROM weekly_chatter_account_snapshots a
        LEFT JOIN weekly_chatter_account_snapshots p
          ON p.user_id = a.user_id AND p.account_id = a.account_id AND p.week_start = ${prevStr}
        WHERE a.week_start = ${weekStr}
        ORDER BY a.revenue_net DESC NULLS LAST
      `;

      const cbs = await sql`
        SELECT chargeback_id, account_id, user_id, fan_id, chat_id, amount, occurred_at
        FROM chargebacks_log
        WHERE occurred_at >= ${weekStr}::date AND occurred_at < (${weekStr}::date + INTERVAL '7 days')
        ORDER BY occurred_at DESC
      `;

      return res.status(200).json({
        success: true,
        weekStart: weekStr,
        previousWeekStart: prevStr,
        accounts: acc.rows.map(r => ({
          accountId: Number(r.account_id),
          thisRevenue: Number(r.this_rev || 0),
          prevRevenue: Number(r.prev_rev || 0),
          thisNewSubs: Number(r.this_subs || 0),
          prevNewSubs: Number(r.prev_subs || 0)
        })),
        chatters: chatter.rows.map(r => ({
          userId: Number(r.user_id),
          accountId: Number(r.account_id),
          thisRevenue: Number(r.this_rev || 0),
          prevRevenue: Number(r.prev_rev || 0),
          thisPaid: Number(r.this_paid || 0),
          thisSold: Number(r.this_sold || 0)
        })),
        chargebacks: cbs.rows.map(r => ({
          id: r.chargeback_id,
          accountId: Number(r.account_id),
          userId: r.user_id != null ? Number(r.user_id) : null,
          fanId: r.fan_id,
          chatId: r.chat_id,
          amount: Number(r.amount),
          occurredAt: r.occurred_at
          // link se computa en frontend desde chatId/fanId
        }))
      });
    }

    return res.status(400).json({ success: false, error: 'unknown action' });

  } catch (error) {
    console.error('automations error:', error);
    return res.status(500).json({
      success: false,
      error: 'internal error',
      details: error.message
    });
  }
};
