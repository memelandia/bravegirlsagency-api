/**
 * API Endpoint consolidado: /api/supervision
 *
 * Sub-routing por ?type= o por rewrite desde URLs viejas (back-compat):
 *
 *   /api/supervision?type=checklist     (GET / POST)
 *   /api/supervision?type=clear         (POST)
 *   /api/supervision?type=errores       (GET / POST)
 *   /api/supervision?type=organigrama   (GET / POST)
 *   /api/supervision?type=semanal       (GET / POST)
 *   /api/supervision?type=chatter-goal  (GET / POST)
 *     GET  ?chatter_id=X&year=YYYY&month=M   -> meta personal de un chatter (mes/año)
 *     GET  ?year=YYYY&month=M                -> lista de metas de todos los chatters
 *     POST { chatter_id, year, month, target_amount } -> upsert
 *
 * Las URLs viejas (/api/supervision/checklist, etc) siguen funcionando
 * gracias a rewrites en vercel.json.
 *
 * Esta consolidación libera 4 slots serverless en Vercel Hobby (de 5 a 1).
 */

const { sql } = require('@vercel/postgres');

const VALID_SHIFTS = new Set(['MORNING', 'AFTERNOON', 'NIGHT']);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Resolver el tipo: query param tiene prioridad, fallback a path matching
  let type = req.query.type;
  if (!type && req.url) {
    if (req.url.includes('/checklist'))   type = 'checklist';
    else if (req.url.includes('/clear'))   type = 'clear';
    else if (req.url.includes('/errores')) type = 'errores';
    else if (req.url.includes('/organigrama')) type = 'organigrama';
    else if (req.url.includes('/semanal')) type = 'semanal';
    else if (req.url.includes('/chatter-goal')) type = 'chatter-goal';
  }

  try {
    switch (type) {
      case 'checklist':   return await handleChecklist(req, res);
      case 'clear':       return await handleClear(req, res);
      case 'errores':     return await handleErrores(req, res);
      case 'organigrama': return await handleOrganigrama(req, res);
      case 'semanal':     return await handleSemanal(req, res);
      case 'chatter-goal': return await handleChatterGoal(req, res);
      default:
        return res.status(400).json({
          success: false,
          error: 'unknown type',
          hint: 'usa ?type=checklist|clear|errores|organigrama|semanal'
        });
    }
  } catch (error) {
    console.error(`supervision[${type}] error:`, error);
    return res.status(500).json({
      success: false,
      error: 'Database error',
      details: error.message
    });
  }
};

// ═══════════════════════════════════════════════════════════
// CHECKLIST_MES
// ═══════════════════════════════════════════════════════════
async function handleChecklist(req, res) {
  if (req.method === 'GET') {
    const { rows } = await sql`SELECT key, status FROM checklist_mes`;
    const data = {};
    rows.forEach(row => { data[row.key] = row.status; });
    return res.status(200).json({ success: true, data });
  }

  if (req.method === 'POST') {
    const { data } = req.body;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Invalid data format' });
    }
    const jsonPayload = JSON.stringify(data);
    await sql`
      INSERT INTO checklist_mes (key, status, updated_at)
      SELECT key, value, CURRENT_TIMESTAMP
      FROM jsonb_each_text(${jsonPayload}::jsonb)
      ON CONFLICT (key)
      DO UPDATE SET status = EXCLUDED.status, updated_at = CURRENT_TIMESTAMP
    `;
    return res.status(200).json({ success: true, message: 'Checklist saved' });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

// ═══════════════════════════════════════════════════════════
// CLEAR (limpieza del mes)
// ═══════════════════════════════════════════════════════════
async function handleClear(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  await sql`DELETE FROM checklist_mes`;
  await sql`DELETE FROM supervision_semanal`;
  try { await sql`DELETE FROM vip_repaso`; } catch (_) { /* tabla pudo haberse eliminado */ }
  try { await sql`DELETE FROM registro_errores WHERE estado = 'Corregido'`; } catch (_) { /* idem */ }
  return res.status(200).json({
    success: true,
    message: 'All supervision data cleared successfully',
    timestamp: new Date().toISOString()
  });
}

// ═══════════════════════════════════════════════════════════
// REGISTRO_ERRORES
// ═══════════════════════════════════════════════════════════
async function handleErrores(req, res) {
  if (req.method === 'GET') {
    const { rows } = await sql`
      SELECT id, fecha, cuenta, chatter, tipo, gravedad, detalle, traslado, estado, link
      FROM registro_errores
      ORDER BY created_at DESC
    `;
    return res.status(200).json({ success: true, data: rows });
  }

  if (req.method === 'POST') {
    const { data } = req.body;
    if (!Array.isArray(data)) return res.status(400).json({ error: 'Data must be an array' });

    await sql`DELETE FROM registro_errores`;
    await Promise.all(data.map(async (entry) => {
      await sql`
        INSERT INTO registro_errores (
          id, fecha, cuenta, chatter, tipo, gravedad, detalle, traslado, estado, link
        ) VALUES (
          ${entry.id}, ${entry.fecha}, ${entry.cuenta || ''}, ${entry.chatter || ''},
          ${entry.tipo || ''}, ${entry.gravedad || ''}, ${entry.detalle || ''},
          ${entry.traslado || ''}, ${entry.estado || ''}, ${entry.link || ''}
        )
      `;
    }));
    return res.status(200).json({ success: true, message: 'Data saved' });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

// ═══════════════════════════════════════════════════════════
// ORGANIGRAMA
// ═══════════════════════════════════════════════════════════
async function handleOrganigrama(req, res) {
  if (req.method === 'GET') {
    const { rows } = await sql`
      SELECT shift_id, account_id, chatter_id
      FROM organigrama_assignments
      ORDER BY shift_id, account_id, chatter_id
    `;
    const data = rows.map(r => ({
      shift: r.shift_id,
      accountId: Number(r.account_id),
      chatterId: Number(r.chatter_id)
    }));
    return res.status(200).json({ success: true, data });
  }

  if (req.method === 'POST') {
    const { data } = req.body;
    if (!Array.isArray(data)) return res.status(400).json({ success: false, error: 'data must be an array' });

    const clean = [];
    for (const a of data) {
      const shift = String(a.shift || '').toUpperCase();
      const accountId = Number(a.accountId);
      const chatterId = Number(a.chatterId);
      if (!VALID_SHIFTS.has(shift) || !Number.isFinite(accountId) || !Number.isFinite(chatterId)) {
        return res.status(400).json({ success: false, error: 'Invalid assignment', offending: a });
      }
      clean.push({ shift, accountId, chatterId });
    }

    const seen = new Set();
    const deduped = clean.filter(a => {
      const k = `${a.shift}|${a.accountId}|${a.chatterId}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    await sql`BEGIN`;
    try {
      await sql`DELETE FROM organigrama_assignments`;
      for (const a of deduped) {
        await sql`
          INSERT INTO organigrama_assignments (shift_id, account_id, chatter_id, updated_at)
          VALUES (${a.shift}, ${a.accountId}, ${a.chatterId}, CURRENT_TIMESTAMP)
        `;
      }
      await sql`COMMIT`;
    } catch (err) {
      await sql`ROLLBACK`;
      throw err;
    }
    return res.status(200).json({ success: true, count: deduped.length });
  }
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

// ═══════════════════════════════════════════════════════════
// SUPERVISION_SEMANAL
// ═══════════════════════════════════════════════════════════
const semanalToCamel = (row) => ({
  id: row.id, mes: row.mes, semana: row.semana, weekIndex: row.week_index,
  chatter: row.chatter, cuenta: row.cuenta,
  facturacion: row.facturacion, nuevosFans: row.nuevos_fans,
  metaSemanal: row.meta_semanal, metaMensual: row.meta_mensual,
  metaFacturacion: row.meta_facturacion,
  facturacionMensualObjetivo: row.facturacion_mensual_objetivo,
  posteos: row.posteos, historias: row.historias,
  pendientes: row.pendientes, resueltos: row.resueltos,
  impacto: row.impacto, tiempoRespuesta: row.tiempo_respuesta,
  estadoObjetivo: row.estado_objetivo
});

const semanalToSnake = (row) => ({
  id: row.id, mes: row.mes, semana: row.semana, week_index: row.weekIndex,
  chatter: row.chatter, cuenta: row.cuenta,
  facturacion: row.facturacion, nuevos_fans: row.nuevosFans,
  meta_semanal: row.metaSemanal, meta_mensual: row.metaMensual,
  meta_facturacion: row.metaFacturacion,
  facturacion_mensual_objetivo: row.facturacionMensualObjetivo,
  posteos: row.posteos, historias: row.historias,
  pendientes: row.pendientes, resueltos: row.resueltos,
  impacto: row.impacto, tiempo_respuesta: row.tiempoRespuesta,
  estado_objetivo: row.estadoObjetivo
});

async function handleSemanal(req, res) {
  if (req.method === 'GET') {
    const { rows } = await sql`SELECT * FROM supervision_semanal ORDER BY week_index ASC, id ASC`;
    return res.status(200).json({ success: true, data: rows.map(semanalToCamel) });
  }

  if (req.method === 'POST') {
    const { data } = req.body;
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: 'Data must be an array', received: typeof data });
    }
    const mapped = data.map(semanalToSnake);

    await sql`BEGIN`;
    try {
      for (const row of mapped) {
        await sql`
          INSERT INTO supervision_semanal (
            id, mes, semana, week_index, chatter, cuenta,
            facturacion, nuevos_fans, meta_semanal, meta_mensual,
            meta_facturacion, facturacion_mensual_objetivo,
            posteos, historias, pendientes, resueltos,
            impacto, tiempo_respuesta, estado_objetivo, updated_at
          ) VALUES (
            ${row.id}, ${row.mes}, ${row.semana}, ${row.week_index},
            ${row.chatter}, ${row.cuenta}, ${row.facturacion}, ${row.nuevos_fans},
            ${row.meta_semanal}, ${row.meta_mensual}, ${row.meta_facturacion},
            ${row.facturacion_mensual_objetivo}, ${row.posteos}, ${row.historias},
            ${row.pendientes}, ${row.resueltos}, ${row.impacto},
            ${row.tiempo_respuesta}, ${row.estado_objetivo}, CURRENT_TIMESTAMP
          )
          ON CONFLICT (id) DO UPDATE SET
            mes = EXCLUDED.mes, semana = EXCLUDED.semana, week_index = EXCLUDED.week_index,
            chatter = EXCLUDED.chatter, cuenta = EXCLUDED.cuenta,
            facturacion = EXCLUDED.facturacion, nuevos_fans = EXCLUDED.nuevos_fans,
            meta_semanal = EXCLUDED.meta_semanal, meta_mensual = EXCLUDED.meta_mensual,
            meta_facturacion = EXCLUDED.meta_facturacion,
            facturacion_mensual_objetivo = EXCLUDED.facturacion_mensual_objetivo,
            posteos = EXCLUDED.posteos, historias = EXCLUDED.historias,
            pendientes = EXCLUDED.pendientes, resueltos = EXCLUDED.resueltos,
            impacto = EXCLUDED.impacto, tiempo_respuesta = EXCLUDED.tiempo_respuesta,
            estado_objetivo = EXCLUDED.estado_objetivo,
            updated_at = CURRENT_TIMESTAMP
        `;
      }
      await sql`COMMIT`;
    } catch (err) {
      await sql`ROLLBACK`;
      throw err;
    }
    return res.status(200).json({ success: true, message: 'Data saved successfully', count: mapped.length });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

// ═══════════════════════════════════════════════════════════
// CHATTER_META_PERSONAL — meta mensual personal de cada chatter
// ═══════════════════════════════════════════════════════════
async function handleChatterGoal(req, res) {
  // Tabla idempotente: se crea en el primer hit si no existe.
  await sql`
    CREATE TABLE IF NOT EXISTS chatter_meta_personal (
      id SERIAL PRIMARY KEY,
      chatter_id TEXT NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      target_amount NUMERIC(12,2) NOT NULL CHECK (target_amount >= 0),
      set_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (chatter_id, year, month)
    )
  `;

  if (req.method === 'GET') {
    const y = parseInt(req.query.year, 10);
    const m = parseInt(req.query.month, 10);
    const chatterId = req.query.chatter_id;

    if (!y || !m || m < 1 || m > 12) {
      return res.status(400).json({ success: false, error: 'year and month (1-12) required' });
    }

    if (chatterId) {
      const { rows } = await sql`
        SELECT chatter_id, year, month, target_amount, set_at, updated_at
        FROM chatter_meta_personal
        WHERE chatter_id = ${chatterId} AND year = ${y} AND month = ${m}
        LIMIT 1
      `;
      const r = rows[0];
      return res.status(200).json({
        success: true,
        data: r ? {
          chatter_id: r.chatter_id,
          year: r.year,
          month: r.month,
          target_amount: parseFloat(r.target_amount),
          set_at: r.set_at,
          updated_at: r.updated_at
        } : null
      });
    }

    const { rows } = await sql`
      SELECT chatter_id, year, month, target_amount, set_at, updated_at
      FROM chatter_meta_personal
      WHERE year = ${y} AND month = ${m}
      ORDER BY chatter_id ASC
    `;
    return res.status(200).json({
      success: true,
      data: rows.map(r => ({
        chatter_id: r.chatter_id,
        year: r.year,
        month: r.month,
        target_amount: parseFloat(r.target_amount),
        set_at: r.set_at,
        updated_at: r.updated_at
      }))
    });
  }

  if (req.method === 'POST') {
    const { chatter_id, year, month, target_amount } = req.body || {};
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const amount = parseFloat(target_amount);

    if (!chatter_id || !y || !m || m < 1 || m > 12 || !Number.isFinite(amount) || amount < 0) {
      return res.status(400).json({
        success: false,
        error: 'Required: chatter_id, year, month (1-12), target_amount (>=0)'
      });
    }

    await sql`
      INSERT INTO chatter_meta_personal (chatter_id, year, month, target_amount, set_at, updated_at)
      VALUES (${chatter_id}, ${y}, ${m}, ${amount}, NOW(), NOW())
      ON CONFLICT (chatter_id, year, month)
      DO UPDATE SET
        target_amount = EXCLUDED.target_amount,
        updated_at = NOW()
    `;

    return res.status(200).json({
      success: true,
      message: 'Goal saved',
      data: { chatter_id, year, month: m, target_amount: amount }
    });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
