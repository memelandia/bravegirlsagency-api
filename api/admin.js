/**
 * /api/admin — Dashboard administrativo BraveGirls (Fase 1: Catálogo)
 *
 * Endpoints (todos POST/GET via ?action=...):
 *   POST ?action=login                    body: { password }
 *   GET  ?action=verify                   header: X-Admin-Token
 *
 *   GET  ?action=catalog&entity=ENT       lista todas las filas activas
 *   GET  ?action=catalog&entity=ENT&id=N  trae una fila por id
 *   POST ?action=catalog&entity=ENT       body con los campos → crea
 *   POST ?action=catalog&entity=ENT&id=N  body con los campos → actualiza
 *   POST ?action=catalog&entity=ENT&id=N&op=delete  → soft delete (activa=FALSE)
 *
 *   ENT puede ser: planes | modelos | cuentas | chatters | equipo
 *
 * Auth: todos los endpoints (excepto login) requieren header
 *   `X-Admin-Token: ${ADMIN_PASSWORD}` configurada en env vars de Vercel.
 */

const { sql } = require('@vercel/postgres');

// ═══════════════════════════════════════════════════════════
// Lazy table creation (sin migracion manual)
// ═══════════════════════════════════════════════════════════
let _ensuredAsignTable = false;
async function ensureAsignTable() {
  if (_ensuredAsignTable) return;
  await sql`
    CREATE TABLE IF NOT EXISTS chatter_cuenta_asignacion (
      id SERIAL PRIMARY KEY,
      chatter_id INTEGER NOT NULL REFERENCES chatters_admin(id) ON DELETE CASCADE,
      cuenta_id  INTEGER NOT NULL REFERENCES cuentas(id) ON DELETE CASCADE,
      activo BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (chatter_id, cuenta_id)
    )
  `;
  _ensuredAsignTable = true;
}

let _ensuredSupervisorSubsTable = false;
async function ensureSupervisorSubsTable() {
  if (_ensuredSupervisorSubsTable) return;
  await sql`
    CREATE TABLE IF NOT EXISTS supervisor_suscripciones_mes (
      mes CHAR(7) PRIMARY KEY,
      suscripciones_totales NUMERIC(12,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  _ensuredSupervisorSubsTable = true;
}

let _ensuredResumenOverridesTable = false;
async function ensureResumenOverridesTable() {
  if (_ensuredResumenOverridesTable) return;
  await sql`
    CREATE TABLE IF NOT EXISTS resumen_mes_override (
      mes CHAR(7) PRIMARY KEY,
      facturacion_total_manual NUMERIC(12,2),
      suscripciones_manual NUMERIC(12,2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  _ensuredResumenOverridesTable = true;
}

function getRecentMonths(baseMes, count) {
  const [yy, mm] = String(baseMes).split('-').map(Number);
  if (!yy || !mm) return [];
  const out = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(yy, mm - 1, 1));
    d.setUTCMonth(d.getUTCMonth() - i);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    out.push(`${y}-${m}`);
  }
  return out;
}

const FACT_MANUAL_CUTOFF_MES = '2026-05';
function isMesBefore(a, b) {
  if (!a || !b) return false;
  return String(a) < String(b);
}

function getPreviousMes(baseMes) {
  const [yy, mm] = String(baseMes).split('-').map(Number);
  if (!yy || !mm) return null;
  const d = new Date(Date.UTC(yy, mm - 1, 1));
  d.setUTCMonth(d.getUTCMonth() - 1);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// ═══════════════════════════════════════════════════════════
// Auth
// ═══════════════════════════════════════════════════════════
function checkAuth(req) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return { ok: false, status: 500, msg: 'ADMIN_PASSWORD no configurada en Vercel' };
  }
  const token = req.headers['x-admin-token'];
  if (!token || token !== expected) {
    return { ok: false, status: 401, msg: 'unauthorized' };
  }
  return { ok: true };
}

// ═══════════════════════════════════════════════════════════
// Helpers de tabla por entidad
// ═══════════════════════════════════════════════════════════
const ENTITY_CONFIG = {
  planes: {
    table: 'planes_servicio',
    activeColumn: 'activa',
    listColumns: ['id', 'nombre', 'porcentaje', 'servicios_factura_texto', 'activa'],
    upsertColumns: ['nombre', 'porcentaje', 'servicios_factura_texto', 'activa']
  },
  modelos: {
    table: 'modelos',
    activeColumn: 'activa',
    listColumns: [
      'id', 'nombre', 'nombre_fiscal', 'identificador', 'direccion', 'email',
      'fecha_inicio', 'plan_id', 'porcentaje', 'moneda_default', 'medio_pago_default',
      'factura_numero_actual', 'gasto_om_modelo_default', 'gasto_om_agencia_default',
      'servicios_factura_texto', 'activa'
    ],
    upsertColumns: [
      'nombre', 'nombre_fiscal', 'identificador', 'direccion', 'email',
      'fecha_inicio', 'plan_id', 'porcentaje', 'moneda_default', 'medio_pago_default',
      'factura_numero_actual', 'gasto_om_modelo_default', 'gasto_om_agencia_default',
      'servicios_factura_texto', 'activa'
    ]
  },
  cuentas: {
    table: 'cuentas',
    activeColumn: 'activa',
    listColumns: ['id', 'modelo_id', 'nombre_cuenta', 'tipo', 'of_username', 'of_password', 'activa'],
    upsertColumns: ['modelo_id', 'nombre_cuenta', 'tipo', 'of_username', 'of_password', 'activa']
  },
  chatters: {
    table: 'chatters_admin',
    activeColumn: 'activo',
    listColumns: [
      'id', 'nombre', 'nombre_fiscal', 'identificador', 'direccion', 'email',
      'fecha_inicio', 'porcentaje_default', 'porcentaje_supervisor',
      'rol', 'es_team_leader', 'activo'
    ],
    upsertColumns: [
      'nombre', 'nombre_fiscal', 'identificador', 'direccion', 'email',
      'fecha_inicio', 'porcentaje_default', 'porcentaje_supervisor',
      'rol', 'es_team_leader', 'activo'
    ]
  },
  equipo: {
    table: 'equipo_fijo',
    activeColumn: 'activo',
    listColumns: ['id', 'nombre', 'rol', 'sueldo_mensual_usd', 'fecha_inicio', 'activo'],
    upsertColumns: ['nombre', 'rol', 'sueldo_mensual_usd', 'fecha_inicio', 'activo']
  }
};

// ═══════════════════════════════════════════════════════════
// CRUD genérico por entidad
// Como @vercel/postgres no soporta queries con tabla dinámica
// vía template tag, usamos sql.query() para construir SQL crudo
// validando las columnas contra el whitelist de ENTITY_CONFIG.
// ═══════════════════════════════════════════════════════════
async function listEntity(entity) {
  const cfg = ENTITY_CONFIG[entity];
  // Listado: todas las filas (no filtramos por activa para que el catálogo muestre inactivas
  // con un badge "inactivo" — el frontend decide qué mostrar).
  const cols = cfg.listColumns.join(', ');
  // sql es template tag, pero la tabla y cols vienen de un whitelist controlado, no de input
  const result = await sql.query(`SELECT ${cols} FROM ${cfg.table} ORDER BY id ASC`);
  return result.rows;
}

async function getEntity(entity, id) {
  const cfg = ENTITY_CONFIG[entity];
  const cols = cfg.listColumns.join(', ');
  const result = await sql.query(`SELECT ${cols} FROM ${cfg.table} WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

async function createEntity(entity, body) {
  const cfg = ENTITY_CONFIG[entity];
  const filtered = {};
  for (const col of cfg.upsertColumns) {
    if (Object.prototype.hasOwnProperty.call(body, col)) {
      filtered[col] = body[col];
    }
  }
  const cols = Object.keys(filtered);
  if (cols.length === 0) throw new Error('No hay campos válidos para insertar');

  const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
  const values = cols.map(c => filtered[c]);
  const result = await sql.query(
    `INSERT INTO ${cfg.table} (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`,
    values
  );
  return result.rows[0];
}

async function updateEntity(entity, id, body) {
  const cfg = ENTITY_CONFIG[entity];
  const filtered = {};
  for (const col of cfg.upsertColumns) {
    if (Object.prototype.hasOwnProperty.call(body, col)) {
      filtered[col] = body[col];
    }
  }
  const cols = Object.keys(filtered);
  if (cols.length === 0) throw new Error('No hay campos para actualizar');

  const setClause = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
  const values = cols.map(c => filtered[c]);
  values.push(id);
  const result = await sql.query(
    `UPDATE ${cfg.table} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`,
    values
  ).catch(async (err) => {
    // Si la tabla no tiene updated_at, reintentar sin él
    if (err.message && err.message.includes('updated_at')) {
      const result2 = await sql.query(
        `UPDATE ${cfg.table} SET ${setClause} WHERE id = $${values.length} RETURNING *`,
        values
      );
      return result2;
    }
    throw err;
  });
  return result.rows[0];
}

async function deleteEntity(entity, id) {
  const cfg = ENTITY_CONFIG[entity];
  // Soft delete: setea la columna activa/activo a FALSE
  const result = await sql.query(
    `UPDATE ${cfg.table} SET ${cfg.activeColumn} = FALSE WHERE id = $1 RETURNING id`,
    [id]
  );
  return result.rows[0];
}

// ═══════════════════════════════════════════════════════════
// HANDLER
// ═══════════════════════════════════════════════════════════
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action || '';

  try {
    // ─── LOGIN ───────────────────────────────────────────
    if (action === 'login') {
      if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'POST required' });
      const expected = process.env.ADMIN_PASSWORD;
      if (!expected) return res.status(500).json({ success: false, error: 'ADMIN_PASSWORD no configurada' });
      const { password } = req.body || {};
      if (!password) return res.status(400).json({ success: false, error: 'password requerido' });
      if (password !== expected) return res.status(401).json({ success: false, error: 'password incorrecta' });
      // Token es la misma password (estilo quiz admin) — el frontend la guarda en sessionStorage
      return res.status(200).json({ success: true, token: password });
    }

    // ─── VERIFY ──────────────────────────────────────────
    if (action === 'verify') {
      const auth = checkAuth(req);
      if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.msg });
      return res.status(200).json({ success: true });
    }

    // ─── CATALOG (CRUD genérico) ────────────────────────
    if (action === 'catalog') {
      const auth = checkAuth(req);
      if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.msg });

      const entity = req.query.entity;
      if (!entity || !ENTITY_CONFIG[entity]) {
        return res.status(400).json({
          success: false,
          error: 'entity inválida o ausente',
          allowed: Object.keys(ENTITY_CONFIG)
        });
      }

      const id = req.query.id ? Number(req.query.id) : null;
      const op = req.query.op || null;

      // GET: list o get one
      if (req.method === 'GET') {
        if (id) {
          const row = await getEntity(entity, id);
          if (!row) return res.status(404).json({ success: false, error: 'not found' });
          return res.status(200).json({ success: true, data: row });
        }
        const data = await listEntity(entity);
        return res.status(200).json({ success: true, data });
      }

      // POST: create, update, delete
      if (req.method === 'POST') {
        if (op === 'delete') {
          if (!id) return res.status(400).json({ success: false, error: 'id requerido para delete' });
          const deleted = await deleteEntity(entity, id);
          return res.status(200).json({ success: true, deleted: !!deleted });
        }
        if (id) {
          const updated = await updateEntity(entity, id, req.body || {});
          return res.status(200).json({ success: true, data: updated });
        }
        const created = await createEntity(entity, req.body || {});
        return res.status(201).json({ success: true, data: created });
      }

      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    // ═══════════════════════════════════════════════════════
    // FASE 2: Cierre mensual + Facturas
    // ═══════════════════════════════════════════════════════

    // ─── CIERRE de una modelo en un mes (joined con cuentas) ────
    // GET ?action=cierre-modelo&modelo_id=N&mes=YYYY-MM
    if (action === 'cierre-modelo') {
      const auth = checkAuth(req);
      if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.msg });

      const modeloId = Number(req.query.modelo_id);
      const mes = req.query.mes;
      if (!modeloId || !mes) {
        return res.status(400).json({ success: false, error: 'modelo_id y mes requeridos' });
      }

      // Trae datos de la modelo + plan
      const modeloRes = await sql`
        SELECT m.*, p.porcentaje AS plan_porcentaje, p.servicios_factura_texto AS plan_servicios
        FROM modelos m
        LEFT JOIN planes_servicio p ON p.id = m.plan_id
        WHERE m.id = ${modeloId}
      `;
      if (modeloRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'modelo no encontrada' });
      }
      const modelo = modeloRes.rows[0];

      // Trae cuentas activas de la modelo
      const cuentasRes = await sql`
        SELECT id, nombre_cuenta, tipo, of_username
        FROM cuentas
        WHERE modelo_id = ${modeloId} AND activa = TRUE
        ORDER BY nombre_cuenta
      `;
      const cuentas = cuentasRes.rows;

      // Trae cierres existentes del mes
      const cierresRes = await sql`
        SELECT *
        FROM cierre_cuenta_mes
        WHERE mes = ${mes}
          AND cuenta_id IN (SELECT id FROM cuentas WHERE modelo_id = ${modeloId})
      `;
      const cierresByCuentaId = {};
      cierresRes.rows.forEach(c => { cierresByCuentaId[c.cuenta_id] = c; });

      // Para cada cuenta, devuelve el cierre existente o un template vacío
      const cuentasConCierre = cuentas.map(c => {
        const existing = cierresByCuentaId[c.id];
        if (existing) return { cuenta: c, cierre: existing };
        return {
          cuenta: c,
          cierre: {
            mes, cuenta_id: c.id,
            fact_total: 0, suscripciones: 0, masivos: 0,
            ventas_por_fuera: 0, observ_ventas_por_fuera: null,
            porcentaje_aplicado: Number(modelo.porcentaje || modelo.plan_porcentaje || 0),
            software_om_fee: Number(modelo.gasto_om_modelo_default || 0),
            pago_verificado_ig: 0,
            otros_extras: null,
            moneda: modelo.moneda_default,
            medio_pago: modelo.medio_pago_default,
            estado_resumen: 'pendiente',
            pago_recibido: 0,
            observaciones: null
          }
        };
      });

      const mesAnterior = getPreviousMes(mes);
      let ultimoMesAnterior = null;
      if (mesAnterior) {
        const lastPrev = await sql`
          SELECT numero
          FROM facturas_emitidas
          WHERE tipo = 'factura_modelo'
            AND entidad_tipo = 'modelo'
            AND entidad_id = ${modeloId}
            AND mes = ${mesAnterior}
          ORDER BY numero DESC
          LIMIT 1
        `;
        ultimoMesAnterior = lastPrev.rows[0]?.numero != null ? Number(lastPrev.rows[0].numero) : null;
      }

      return res.status(200).json({
        success: true,
        modelo,
        cuentas: cuentasConCierre,
        factura_ref: {
          mes_anterior: mesAnterior,
          ultimo_numero_mes_anterior: ultimoMesAnterior,
          ultimo_numero_global: Number(modelo.factura_numero_actual || 0)
        }
      });
    }

    // ─── UPSERT de cierres (un array por cuenta) ────
    // POST ?action=cierre-save body: { mes, cierres: [{cuenta_id, ...}] }
    if (action === 'cierre-save') {
      const auth = checkAuth(req);
      if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.msg });

      if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'POST required' });
      const { mes, cierres } = req.body || {};
      if (!mes || !Array.isArray(cierres)) {
        return res.status(400).json({ success: false, error: 'mes y cierres[] requeridos' });
      }

      const results = [];
      for (const c of cierres) {
        const cuentaId = Number(c.cuenta_id);
        if (!cuentaId) continue;
        const factTotal = Number(c.fact_total || 0);
        const suscripciones = Number(c.suscripciones || 0);
        const masivos = Number(c.masivos || 0);
        const ventasPorFuera = Number(c.ventas_por_fuera || 0);
        const observ = c.observ_ventas_por_fuera || null;
        const porcentaje = Number(c.porcentaje_aplicado || 0);
        const softwareOm = Number(c.software_om_fee || 0);
        const ig = Number(c.pago_verificado_ig || 0);
        const otrosExtras = c.otros_extras ? JSON.stringify(c.otros_extras) : null;
        const moneda = c.moneda || 'USD';
        const cotEur = c.cotizacion_eur != null ? Number(c.cotizacion_eur) : null;
        const medioPago = c.medio_pago || null;
        const estado = c.estado_resumen || 'pendiente';
        const pagoRecibido = Number(c.pago_recibido || 0);
        const observaciones = c.observaciones || null;

        // Calcular total_a_cobrar (facturación: base sobre fact_total)
        const baseComision = factTotal;
        const gananciaAgencia = baseComision * porcentaje / 100;
        const totalACobrar = gananciaAgencia + softwareOm + ventasPorFuera + ig
          + (c.otros_extras || []).reduce((s, x) => s + Number(x.monto || 0), 0);

        const r = await sql`
          INSERT INTO cierre_cuenta_mes (
            mes, cuenta_id, fact_total, suscripciones, masivos,
            ventas_por_fuera, observ_ventas_por_fuera,
            porcentaje_aplicado, software_om_fee, pago_verificado_ig,
            otros_extras, total_a_cobrar, moneda, cotizacion_eur,
            medio_pago, estado_resumen, pago_recibido, observaciones,
            updated_at
          ) VALUES (
            ${mes}, ${cuentaId}, ${factTotal}, ${suscripciones}, ${masivos},
            ${ventasPorFuera}, ${observ},
            ${porcentaje}, ${softwareOm}, ${ig},
            ${otrosExtras}::jsonb, ${totalACobrar}, ${moneda}, ${cotEur},
            ${medioPago}, ${estado}, ${pagoRecibido}, ${observaciones},
            CURRENT_TIMESTAMP
          )
          ON CONFLICT (mes, cuenta_id) DO UPDATE SET
            fact_total = EXCLUDED.fact_total,
            suscripciones = EXCLUDED.suscripciones,
            masivos = EXCLUDED.masivos,
            ventas_por_fuera = EXCLUDED.ventas_por_fuera,
            observ_ventas_por_fuera = EXCLUDED.observ_ventas_por_fuera,
            porcentaje_aplicado = EXCLUDED.porcentaje_aplicado,
            software_om_fee = EXCLUDED.software_om_fee,
            pago_verificado_ig = EXCLUDED.pago_verificado_ig,
            otros_extras = EXCLUDED.otros_extras,
            total_a_cobrar = EXCLUDED.total_a_cobrar,
            moneda = EXCLUDED.moneda,
            cotizacion_eur = EXCLUDED.cotizacion_eur,
            medio_pago = EXCLUDED.medio_pago,
            estado_resumen = EXCLUDED.estado_resumen,
            pago_recibido = EXCLUDED.pago_recibido,
            observaciones = EXCLUDED.observaciones,
            updated_at = CURRENT_TIMESTAMP
          RETURNING *
        `;
        results.push(r.rows[0]);
      }

      return res.status(200).json({ success: true, count: results.length, data: results });
    }

    // ─── CREAR FACTURA (snapshot inmutable) ────
    // POST ?action=factura-create body: { modelo_id, mes, items, ...metadatos }
    if (action === 'factura-create') {
      const auth = checkAuth(req);
      if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.msg });

      if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'POST required' });
      const b = req.body || {};
      const modeloId = Number(b.modelo_id);
      if (!modeloId) return res.status(400).json({ success: false, error: 'modelo_id requerido' });

      const numeroManualRaw = b.numero;
      const usaManual = numeroManualRaw !== undefined && numeroManualRaw !== null && numeroManualRaw !== '';

      let numeroManual = null;
      if (usaManual) {
        numeroManual = Number(numeroManualRaw);
        if (!Number.isInteger(numeroManual) || numeroManual <= 0) {
          return res.status(400).json({ success: false, error: 'numero manual inválido' });
        }
      }

      // Número de factura: manual (si viene) o autoincremental
      await sql`BEGIN`;
      try {
        const upd = usaManual
          ? await sql`
            UPDATE modelos
            SET factura_numero_actual = GREATEST(COALESCE(factura_numero_actual, 0), ${numeroManual}),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ${modeloId}
            RETURNING factura_numero_actual
          `
          : await sql`
            UPDATE modelos
            SET factura_numero_actual = COALESCE(factura_numero_actual, 0) + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ${modeloId}
            RETURNING factura_numero_actual
          `;
        if (upd.rows.length === 0) {
          await sql`ROLLBACK`;
          return res.status(404).json({ success: false, error: 'modelo no encontrada' });
        }
        const numero = usaManual ? numeroManual : Number(upd.rows[0].factura_numero_actual);

        const ins = await sql`
          INSERT INTO facturas_emitidas (
            numero, tipo, entidad_tipo, entidad_id, mes,
            fecha_emision, fecha_vencimiento, pago_por,
            concepto, porcentaje_concepto, items,
            subtotal, iva, total, moneda, cotizacion_eur,
            servicios_pie, estado, pdf_html_snapshot
          ) VALUES (
            ${numero}, 'factura_modelo', 'modelo', ${modeloId}, ${b.mes || null},
            ${b.fecha_emision || null}, ${b.fecha_vencimiento || null}, ${b.pago_por || null},
            ${b.concepto || null}, ${b.porcentaje_concepto || null},
            ${JSON.stringify(b.items || [])}::jsonb,
            ${b.subtotal || 0}, ${b.iva || 0}, ${b.total || 0},
            ${b.moneda || 'USD'}, ${b.cotizacion_eur || null},
            ${b.servicios_pie || null}, 'emitida',
            ${b.pdf_html_snapshot || null}
          )
          RETURNING *
        `;
        await sql`COMMIT`;
        return res.status(200).json({ success: true, data: ins.rows[0] });
      } catch (e) {
        await sql`ROLLBACK`;
        if (e && e.code === '23505') {
          return res.status(409).json({ success: false, error: 'Ese número de factura ya existe para esta modelo' });
        }
        throw e;
      }
    }

    // ─── LISTAR FACTURAS (con filtros) ────
    // GET ?action=facturas-list[&modelo_id=N&mes=YYYY-MM]
    if (action === 'facturas-list') {
      const auth = checkAuth(req);
      if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.msg });

      const modeloId = req.query.modelo_id ? Number(req.query.modelo_id) : null;
      const mes = req.query.mes || null;

      let query = `
        SELECT f.id, f.numero, f.tipo, f.entidad_tipo, f.entidad_id, f.mes,
               f.fecha_emision, f.fecha_vencimiento, f.pago_por,
               f.concepto, f.subtotal, f.iva, f.total, f.moneda, f.estado,
               f.created_at,
               m.nombre AS modelo_nombre
        FROM facturas_emitidas f
        LEFT JOIN modelos m ON m.id = f.entidad_id AND f.entidad_tipo = 'modelo'
        WHERE f.tipo = 'factura_modelo'
      `;
      const params = [];
      if (modeloId) { params.push(modeloId); query += ` AND f.entidad_id = $${params.length}`; }
      if (mes)      { params.push(mes);      query += ` AND f.mes = $${params.length}`; }
      query += ` ORDER BY f.created_at DESC LIMIT 200`;

      const r = await sql.query(query, params);
      return res.status(200).json({ success: true, data: r.rows });
    }

    // ─── OBTENER UNA FACTURA (con su HTML snapshot para reimprimir PDF) ────
    if (action === 'factura-get') {
      const auth = checkAuth(req);
      if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.msg });

      const id = Number(req.query.id);
      if (!id) return res.status(400).json({ success: false, error: 'id requerido' });
      const r = await sql`SELECT * FROM facturas_emitidas WHERE id = ${id}`;
      if (r.rows.length === 0) return res.status(404).json({ success: false, error: 'not found' });
      return res.status(200).json({ success: true, data: r.rows[0] });
    }

    // ─── OVERRIDES DEL RESUMEN (manual por mes) ────
    // GET  ?action=resumen-override&mes=YYYY-MM
    // POST ?action=resumen-override body: { mes, facturacion_total_manual, suscripciones_manual }
    if (action === 'resumen-override') {
      const auth = checkAuth(req);
      if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.msg });
      await ensureResumenOverridesTable();

      if (req.method === 'GET') {
        const mes = req.query.mes;
        if (!mes) return res.status(400).json({ success: false, error: 'mes requerido' });
        const r = await sql`
          SELECT mes, facturacion_total_manual, suscripciones_manual
          FROM resumen_mes_override
          WHERE mes = ${mes}
          LIMIT 1
        `;
        const detalle = await sql`
          SELECT
            c.id AS cuenta_id,
            c.nombre_cuenta,
            m.nombre AS modelo,
            COALESCE(cm.suscripciones, 0) AS suscripciones
          FROM cuentas c
          JOIN modelos m ON m.id = c.modelo_id
          LEFT JOIN cierre_cuenta_mes cm ON cm.cuenta_id = c.id AND cm.mes = ${mes}
          WHERE c.activa = TRUE AND m.activa = TRUE
          ORDER BY m.nombre ASC, c.nombre_cuenta ASC
        `;
        const row = r.rows[0] || null;
        return res.status(200).json({
          success: true,
          data: {
            mes,
            facturacion_manual_habilitada: isMesBefore(mes, FACT_MANUAL_CUTOFF_MES),
            facturacion_total_manual: row?.facturacion_total_manual != null ? Number(row.facturacion_total_manual) : null,
            suscripciones_manual: row?.suscripciones_manual != null ? Number(row.suscripciones_manual) : null,
            suscripciones_por_cuenta: detalle.rows.map(d => ({
              cuenta_id: d.cuenta_id,
              cuenta: d.nombre_cuenta,
              modelo: d.modelo,
              suscripciones: Number(d.suscripciones || 0)
            }))
          }
        });
      }

      if (req.method === 'POST') {
        const b = req.body || {};
        const mes = String(b.mes || '').trim();
        if (!/^\d{4}-\d{2}$/.test(mes)) {
          return res.status(400).json({ success: false, error: 'mes inválido (YYYY-MM)' });
        }

        const factRaw = b.facturacion_total_manual;
        const subsRaw = b.suscripciones_manual;
        const fact = (factRaw === '' || factRaw == null) ? null : Number(factRaw);
        const subs = (subsRaw === '' || subsRaw == null) ? null : Number(subsRaw);

        if (fact != null && (!Number.isFinite(fact) || fact < 0)) {
          return res.status(400).json({ success: false, error: 'facturacion_total_manual inválido' });
        }
        if (subs != null && (!Number.isFinite(subs) || subs < 0)) {
          return res.status(400).json({ success: false, error: 'suscripciones_manual inválido' });
        }

        if (fact != null && !isMesBefore(mes, FACT_MANUAL_CUTOFF_MES)) {
          return res.status(400).json({
            success: false,
            error: `facturacion_total_manual solo se permite para meses anteriores a ${FACT_MANUAL_CUTOFF_MES}`
          });
        }

        await sql`
          INSERT INTO resumen_mes_override (mes, facturacion_total_manual, suscripciones_manual, updated_at)
          VALUES (${mes}, ${fact}, ${subs}, CURRENT_TIMESTAMP)
          ON CONFLICT (mes) DO UPDATE SET
            facturacion_total_manual = EXCLUDED.facturacion_total_manual,
            suscripciones_manual = EXCLUDED.suscripciones_manual,
            updated_at = CURRENT_TIMESTAMP
        `;

        return res.status(200).json({
          success: true,
          mes,
          facturacion_total_manual: fact,
          suscripciones_manual: subs
        });
      }

      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    // ─── RESUMEN DEL MES (para vista Resumen del dashboard) ────
    // GET ?action=resumen-mes&mes=YYYY-MM
    if (action === 'resumen-mes') {
      const auth = checkAuth(req);
      if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.msg });
      await ensureResumenOverridesTable();

      const mes = req.query.mes;
      if (!mes) return res.status(400).json({ success: false, error: 'mes requerido' });

      // Totales del mes desde cierre_cuenta_mes
      const tot = await sql`
        SELECT
          COALESCE(SUM(fact_total), 0)            AS fact_total,
          COALESCE(SUM(suscripciones), 0)         AS suscripciones,
          COALESCE(SUM(fact_total - suscripciones - masivos), 0) AS fact_sin_subs,
          COALESCE(SUM((fact_total - suscripciones - masivos) * porcentaje_aplicado / 100), 0) AS ganancia_bruta,
          COALESCE(SUM(total_a_cobrar), 0)        AS total_a_cobrar,
          COALESCE(SUM(pago_recibido), 0)         AS pago_recibido,
          COALESCE(SUM(total_a_cobrar - pago_recibido), 0) AS pago_pendiente,
          count(*)                                 AS cuentas_con_cierre
        FROM cierre_cuenta_mes
        WHERE mes = ${mes}
      `;

      // Gastos del mes
      const gas = await sql`
        SELECT COALESCE(SUM(monto), 0) AS gastos_total, count(*) AS gastos_count
        FROM gastos_mes WHERE mes = ${mes}
      `;

      // Cobros por modelo
      const cobros = await sql`
        SELECT
          m.id AS modelo_id, m.nombre AS modelo,
          COALESCE(SUM(c.total_a_cobrar), 0) AS total_a_cobrar,
          COALESCE(SUM(c.pago_recibido), 0)  AS pago_recibido,
          COALESCE(SUM(c.total_a_cobrar - c.pago_recibido), 0) AS pendiente,
          string_agg(DISTINCT c.estado_resumen, ', ') AS estados,
          string_agg(DISTINCT c.medio_pago, ', ')     AS medios_pago,
          m.moneda_default AS moneda
        FROM modelos m
        LEFT JOIN cuentas cu ON cu.modelo_id = m.id AND cu.activa = TRUE
        LEFT JOIN cierre_cuenta_mes c ON c.cuenta_id = cu.id AND c.mes = ${mes}
        WHERE m.activa = TRUE
        GROUP BY m.id, m.nombre, m.moneda_default
        ORDER BY total_a_cobrar DESC NULLS LAST
      `;

      // Lista de gastos
      const gastosLista = await sql`
        SELECT id, descripcion, categoria, monto, paga
        FROM gastos_mes WHERE mes = ${mes}
        ORDER BY monto DESC NULLS LAST
      `;

      // Overrides manuales (si existen)
      const ov = await sql`
        SELECT facturacion_total_manual, suscripciones_manual
        FROM resumen_mes_override
        WHERE mes = ${mes}
        LIMIT 1
      `;
      const ovRow = ov.rows[0] || {};

      // Conteos generales
      const cnt = await sql`
        SELECT
          (SELECT count(*) FROM modelos WHERE activa = TRUE)         AS modelos_activos,
          (SELECT count(*) FROM chatters_admin WHERE activo = TRUE)  AS chatters_activos,
          (SELECT count(*) FROM facturas_emitidas WHERE mes = ${mes} AND tipo='factura_modelo') AS facturas_mes
      `;

      // Pagos a chatters, supervisor, equipo (mismas queries del P&L)
      const pagosChat = await sql`SELECT COALESCE(SUM(neto_a_pagar), 0) AS pagos FROM chatter_pagos_mes WHERE mes = ${mes}`;
      const pagosSup  = await sql`SELECT COALESCE(SUM(neto_a_pagar), 0) AS pagos FROM supervisor_comision_mes WHERE mes = ${mes}`;
      const equipo    = await sql`SELECT COALESCE(SUM(sueldo_mensual_usd), 0) AS sueldos FROM equipo_fijo WHERE activo = TRUE`;

      const totals = tot.rows[0];
        const autoTotalCobrar = Number(totals.total_a_cobrar || 0);
        const autoSubs = Number(totals.suscripciones || 0);
        const manualTotalCobrarRaw = ovRow.facturacion_total_manual != null ? Number(ovRow.facturacion_total_manual) : null;
        const manualSubs = ovRow.suscripciones_manual != null ? Number(ovRow.suscripciones_manual) : null;

        const manualTotalCobrar = isMesBefore(mes, FACT_MANUAL_CUTOFF_MES) ? manualTotalCobrarRaw : null;
        const ingresoBruto = manualTotalCobrar != null ? manualTotalCobrar : autoTotalCobrar;
        const suscripcionesMes = manualSubs != null ? manualSubs : autoSubs;
      const gastosOtros = Number(gas.rows[0].gastos_total || 0);
      // Desde este punto, el OM agencia se carga manualmente en "gastos_mes".
      const omAgencia = 0;
      const pChatters = Number(pagosChat.rows[0].pagos);
      const pSupervisor = Number(pagosSup.rows[0].pagos);
      const pEquipo = Number(equipo.rows[0].sueldos);
      // Gastos fijos = TODO lo que sale antes de quedarse con el neto
      const gastosFijos = gastosOtros + omAgencia + pChatters + pSupervisor + pEquipo;
      const netoOwner = ingresoBruto - gastosFijos;

      // Historial real de facturación emitida (últimos 12 meses desde el mes actual)
      const now = new Date();
      const mesActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const mesesHist = getRecentMonths(mesActual, 12);
      const histFactRes = await sql`
        SELECT mes, COALESCE(SUM(fact_total), 0) AS total
        FROM cierre_cuenta_mes
        GROUP BY mes
      `;
      const histManualRes = await sql`
        SELECT mes, facturacion_total_manual
        FROM resumen_mes_override
        WHERE facturacion_total_manual IS NOT NULL
      `;
      const factMap = new Map(histFactRes.rows.map(rw => [String(rw.mes), Number(rw.total || 0)]));
      const manualMap = new Map(histManualRes.rows.map(rw => [String(rw.mes), Number(rw.facturacion_total_manual || 0)]));

      const factEmitidasHistorial = mesesHist.map(m => ({
        mes: m,
        total: (factMap.get(m) || 0) > 0
          ? (factMap.get(m) || 0)
          : (isMesBefore(m, FACT_MANUAL_CUTOFF_MES) ? (manualMap.get(m) || 0) : 0)
      }));

      return res.status(200).json({
        success: true,
        mes,
        kpis: {
          fact_total:     Number(totals.fact_total),
          suscripciones:  suscripcionesMes,
          fact_sin_subs:  Number(totals.fact_sin_subs),
          ganancia_bruta: Number(totals.ganancia_bruta),
          total_a_cobrar: ingresoBruto,
          total_a_cobrar_auto: autoTotalCobrar,
          total_a_cobrar_manual: manualTotalCobrar,
          total_a_cobrar_origen: manualTotalCobrar != null ? 'manual' : 'auto',
          suscripciones_auto: autoSubs,
          suscripciones_manual: manualSubs,
          suscripciones_origen: manualSubs != null ? 'manual' : 'auto',
          pago_recibido:  Number(totals.pago_recibido),
          pago_pendiente: Number(totals.pago_pendiente),
          gastos_fijos:   gastosFijos,
          gastos_otros:   gastosOtros,
          om_agencia:     omAgencia,
          pagos_chatters: pChatters,
          pagos_supervisor: pSupervisor,
          pagos_equipo:   pEquipo,
          neto_owner:     netoOwner,
          modelos_activos:  Number(cnt.rows[0].modelos_activos),
          chatters_activos: Number(cnt.rows[0].chatters_activos),
          facturas_mes:     Number(cnt.rows[0].facturas_mes),
          cuentas_con_cierre: Number(totals.cuentas_con_cierre)
        },
        cobros: cobros.rows,
        gastos: gastosLista.rows,
        fact_emitidas_historial: factEmitidasHistorial
      });
    }

    // ─── GASTOS CRUD ────
    // GET ?action=gastos&mes=YYYY-MM
    // POST ?action=gastos body: { mes, descripcion, categoria, monto, paga }
    // POST ?action=gastos&id=N&op=delete
    if (action === 'gastos') {
      const auth = checkAuth(req);
      if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.msg });

      const mes = req.query.mes;

      if (req.method === 'GET') {
        if (!mes) return res.status(400).json({ success: false, error: 'mes requerido' });
        const r = await sql`SELECT * FROM gastos_mes WHERE mes = ${mes} ORDER BY id DESC`;
        return res.status(200).json({ success: true, data: r.rows });
      }
      if (req.method === 'POST') {
        const id = req.query.id ? Number(req.query.id) : null;
        const op = req.query.op || null;
        if (op === 'delete' && id) {
          await sql`DELETE FROM gastos_mes WHERE id = ${id}`;
          return res.status(200).json({ success: true });
        }
        const b = req.body || {};
        if (id) {
          await sql`
            UPDATE gastos_mes
            SET descripcion = ${b.descripcion},
                categoria   = ${b.categoria},
                monto       = ${b.monto},
                paga        = ${b.paga || 'AGENCIA'},
                observaciones = ${b.observaciones || null}
            WHERE id = ${id}
          `;
          return res.status(200).json({ success: true });
        } else {
          if (!b.mes) return res.status(400).json({ success: false, error: 'mes requerido en body' });
          const r = await sql`
            INSERT INTO gastos_mes (mes, descripcion, categoria, monto, paga, observaciones)
            VALUES (${b.mes}, ${b.descripcion || ''}, ${b.categoria || null},
                    ${b.monto || 0}, ${b.paga || 'AGENCIA'}, ${b.observaciones || null})
            RETURNING *
          `;
          return res.status(201).json({ success: true, data: r.rows[0] });
        }
      }
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    // ═══════════════════════════════════════════════════════
    // FASE 3: Liquidación chatters · Cobros · Supervisor · P&L · Incentivos
    // ═══════════════════════════════════════════════════════

    // ─── TRANSACTION FEE del mes ───────────────────────────
    // GET/POST ?action=tx-fee&mes=YYYY-MM
    if (action === 'tx-fee') {
      const auth = checkAuth(req);
      if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.msg });
      const mes = req.query.mes;
      if (!mes) return res.status(400).json({ success: false, error: 'mes requerido' });

      if (req.method === 'GET') {
        const r = await sql`SELECT porcentaje FROM transaction_fee_mes WHERE mes = ${mes}`;
        // Fallback: último valor conocido
        let pct = r.rows[0]?.porcentaje;
        if (pct == null) {
          const last = await sql`SELECT porcentaje FROM transaction_fee_mes ORDER BY mes DESC LIMIT 1`;
          pct = last.rows[0]?.porcentaje ?? 4;
        }
        return res.status(200).json({ success: true, porcentaje: Number(pct) });
      }
      if (req.method === 'POST') {
        const pct = Number((req.body || {}).porcentaje || 0);
        await sql`
          INSERT INTO transaction_fee_mes (mes, porcentaje) VALUES (${mes}, ${pct})
          ON CONFLICT (mes) DO UPDATE SET porcentaje = EXCLUDED.porcentaje
        `;
        return res.status(200).json({ success: true });
      }
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    // ─── TX FEE HISTORY (lista todos los meses configurados) ───
    if (action === 'tx-fee-history') {
      const auth = checkAuth(req);
      if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.msg });
      const r = await sql`SELECT mes, porcentaje FROM transaction_fee_mes ORDER BY mes DESC LIMIT 36`;
      return res.status(200).json({ success: true, data: r.rows });
    }

    // ─── ASIGNACIONES chatter ↔ cuentas ──────────────────
    // GET  ?action=chatter-cuentas[&chatter_id=N]  → lista todas o filtra por chatter
    // POST ?action=chatter-cuentas  body: {chatter_id, cuenta_ids: [1,2,3]}  → reemplaza set
    if (action === 'chatter-cuentas') {
      const auth = checkAuth(req);
      if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.msg });
      await ensureAsignTable();

      if (req.method === 'GET') {
        const chatterId = req.query.chatter_id ? Number(req.query.chatter_id) : null;
        const r = chatterId
          ? await sql`SELECT * FROM chatter_cuenta_asignacion WHERE chatter_id = ${chatterId} AND activo = TRUE`
          : await sql`SELECT * FROM chatter_cuenta_asignacion WHERE activo = TRUE`;
        return res.status(200).json({ success: true, data: r.rows });
      }
      if (req.method === 'POST') {
        const b = req.body || {};
        const chatterId = Number(b.chatter_id);
        const cuentaIds = Array.isArray(b.cuenta_ids) ? b.cuenta_ids.map(Number).filter(Boolean) : [];
        if (!chatterId) return res.status(400).json({ success: false, error: 'chatter_id requerido' });

        await sql`BEGIN`;
        try {
          // Desactivar todas las asignaciones actuales
          await sql`UPDATE chatter_cuenta_asignacion SET activo = FALSE WHERE chatter_id = ${chatterId}`;
          // Reactivar/insertar las nuevas
          for (const cuentaId of cuentaIds) {
            await sql`
              INSERT INTO chatter_cuenta_asignacion (chatter_id, cuenta_id, activo)
              VALUES (${chatterId}, ${cuentaId}, TRUE)
              ON CONFLICT (chatter_id, cuenta_id) DO UPDATE SET activo = TRUE
            `;
          }
          await sql`COMMIT`;
          return res.status(200).json({ success: true, count: cuentaIds.length });
        } catch (e) {
          await sql`ROLLBACK`;
          throw e;
        }
      }
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    // ─── LIQUIDACIÓN del mes (todos los chatters) ──────────
    // GET ?action=liquidacion-mes&mes=YYYY-MM
    if (action === 'liquidacion-mes') {
      const auth = checkAuth(req);
      if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.msg });
      const mes = req.query.mes;
      if (!mes) return res.status(400).json({ success: false, error: 'mes requerido' });
      await ensureAsignTable();

      const chatters = await sql`
        SELECT id, nombre, porcentaje_default, porcentaje_supervisor, rol, es_team_leader
        FROM chatters_admin
        WHERE activo = TRUE AND COALESCE(rol, 'chatter') <> 'supervisor'
        ORDER BY nombre
      `;

      const cuentas = await sql`
        SELECT cu.id, cu.nombre_cuenta, cu.tipo, m.nombre AS modelo_nombre, m.id AS modelo_id
        FROM cuentas cu
        JOIN modelos m ON m.id = cu.modelo_id
        WHERE cu.activa = TRUE
        ORDER BY m.nombre, cu.nombre_cuenta
      `;

      // Mapa de asignaciones: chatter_id → Set<cuenta_id>
      const asign = await sql`SELECT chatter_id, cuenta_id FROM chatter_cuenta_asignacion WHERE activo = TRUE`;
      const asignByChatter = {};
      asign.rows.forEach(a => {
        if (!asignByChatter[a.chatter_id]) asignByChatter[a.chatter_id] = [];
        asignByChatter[a.chatter_id].push(a.cuenta_id);
      });

      // Detalle por chatter × cuenta del mes (comision se calcula inline)
      const detalle = await sql`
        SELECT chatter_id, cuenta_id, fact_chatter, porcentaje_comision,
               (COALESCE(fact_chatter,0) * COALESCE(porcentaje_comision,0) / 100) AS comision_calculada,
               observaciones
        FROM cierre_chatter_cuenta_mes WHERE mes = ${mes}
      `;
      const detByChatter = {};
      detalle.rows.forEach(d => {
        if (!detByChatter[d.chatter_id]) detByChatter[d.chatter_id] = [];
        detByChatter[d.chatter_id].push(d);
      });

      // Pagos del mes
      const pagos = await sql`SELECT * FROM chatter_pagos_mes WHERE mes = ${mes}`;
      const pagosByChatter = {};
      pagos.rows.forEach(p => { pagosByChatter[p.chatter_id] = p; });

      // Tx fee
      const feeRow = await sql`SELECT porcentaje FROM transaction_fee_mes WHERE mes = ${mes}`;
      let fee = feeRow.rows[0]?.porcentaje;
      if (fee == null) {
        const last = await sql`SELECT porcentaje FROM transaction_fee_mes ORDER BY mes DESC LIMIT 1`;
        fee = last.rows[0]?.porcentaje ?? 4;
      }

      // Incentivo del mes (ganador)
      const inc = await sql`SELECT * FROM incentivos_historico WHERE mes = ${mes}`;
      const incRow = inc.rows[0] || null;

      return res.status(200).json({
        success: true,
        mes,
        transaction_fee_pct: Number(fee),
        chatters: chatters.rows,
        cuentas: cuentas.rows,
        asignaciones_by_chatter: asignByChatter,
        detalle_by_chatter: detByChatter,
        pagos_by_chatter: pagosByChatter,
        incentivo_mes: incRow
      });
    }

    // ─── GUARDAR LIQUIDACIÓN de un chatter ─────────────────
    // POST ?action=liquidacion-save
    // body: { mes, chatter_id, detalles: [{cuenta_id, fact_chatter, porcentaje_comision, observaciones}],
    //         team_leader_bonus, incentivos_individuales, incentivo_mes_ganado, incentivo_mes_monto,
    //         envio_1, envio_2, envio_3, fecha_envio_1..3, observaciones }
    if (action === 'liquidacion-save') {
      const auth = checkAuth(req);
      if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.msg });
      if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'POST required' });

      const b = req.body || {};
      const mes = b.mes;
      const chatterId = Number(b.chatter_id);
      if (!mes || !chatterId) return res.status(400).json({ success: false, error: 'mes y chatter_id requeridos' });

      await sql`BEGIN`;
      try {
        // 1) borrar el detalle previo y reinsertar (más simple que upsert N filas)
        await sql`DELETE FROM cierre_chatter_cuenta_mes WHERE mes = ${mes} AND chatter_id = ${chatterId}`;
        let comisionesTotal = 0;
        for (const d of (b.detalles || [])) {
          const cuentaId = Number(d.cuenta_id);
          const fact = Number(d.fact_chatter || 0);
          const pct = Number(d.porcentaje_comision || 0);
          if (!cuentaId || fact <= 0) continue;
          const comision = fact * pct / 100;
          comisionesTotal += comision;
          await sql`
            INSERT INTO cierre_chatter_cuenta_mes (mes, chatter_id, cuenta_id, fact_chatter, porcentaje_comision, observaciones)
            VALUES (${mes}, ${chatterId}, ${cuentaId}, ${fact}, ${pct}, ${d.observaciones || null})
          `;
        }

        // 2) calcular bruto + neto
        const teamLeader = Number(b.team_leader_bonus || 0);
        const incIndiv = Array.isArray(b.incentivos_individuales) ? b.incentivos_individuales : [];
        const incIndivTotal = incIndiv.reduce((s, x) => s + Number(x.monto || 0), 0);
        const incMesGanado = !!b.incentivo_mes_ganado;
        const incMesMonto = Number(b.incentivo_mes_monto || 50);
        const totalBruto = comisionesTotal + teamLeader + incIndivTotal + (incMesGanado ? incMesMonto : 0);

        const feeRow = await sql`SELECT porcentaje FROM transaction_fee_mes WHERE mes = ${mes}`;
        let fee = feeRow.rows[0]?.porcentaje;
        if (fee == null) {
          const last = await sql`SELECT porcentaje FROM transaction_fee_mes ORDER BY mes DESC LIMIT 1`;
          fee = Number(last.rows[0]?.porcentaje ?? 4);
        }
        fee = Number(fee);
        const neto = totalBruto * (1 - fee / 100);

        const e1 = Number(b.envio_1 || 0), e2 = Number(b.envio_2 || 0), e3 = Number(b.envio_3 || 0);
        const falta = neto - e1 - e2 - e3;

        await sql`
          INSERT INTO chatter_pagos_mes (
            mes, chatter_id, comisiones_total, team_leader_bonus,
            incentivos_individuales, incentivo_mes_ganado, incentivo_mes_monto,
            total_bruto, transaction_fee_pct, neto_a_pagar,
            envio_1, envio_2, envio_3,
            fecha_envio_1, fecha_envio_2, fecha_envio_3,
            falta_pagar, observaciones
          ) VALUES (
            ${mes}, ${chatterId}, ${comisionesTotal}, ${teamLeader},
            ${JSON.stringify(incIndiv)}::jsonb, ${incMesGanado}, ${incMesMonto},
            ${totalBruto}, ${fee}, ${neto},
            ${e1}, ${e2}, ${e3},
            ${b.fecha_envio_1 || null}, ${b.fecha_envio_2 || null}, ${b.fecha_envio_3 || null},
            ${falta}, ${b.observaciones || null}
          )
          ON CONFLICT (mes, chatter_id) DO UPDATE SET
            comisiones_total = EXCLUDED.comisiones_total,
            team_leader_bonus = EXCLUDED.team_leader_bonus,
            incentivos_individuales = EXCLUDED.incentivos_individuales,
            incentivo_mes_ganado = EXCLUDED.incentivo_mes_ganado,
            incentivo_mes_monto = EXCLUDED.incentivo_mes_monto,
            total_bruto = EXCLUDED.total_bruto,
            transaction_fee_pct = EXCLUDED.transaction_fee_pct,
            neto_a_pagar = EXCLUDED.neto_a_pagar,
            envio_1 = EXCLUDED.envio_1, envio_2 = EXCLUDED.envio_2, envio_3 = EXCLUDED.envio_3,
            fecha_envio_1 = EXCLUDED.fecha_envio_1, fecha_envio_2 = EXCLUDED.fecha_envio_2, fecha_envio_3 = EXCLUDED.fecha_envio_3,
            falta_pagar = EXCLUDED.falta_pagar,
            observaciones = EXCLUDED.observaciones
        `;

        await sql`COMMIT`;
        return res.status(200).json({
          success: true,
          totales: { comisionesTotal, teamLeader, incIndivTotal, incMesMonto: incMesGanado ? incMesMonto : 0, totalBruto, fee, neto, falta }
        });
      } catch (e) {
        await sql`ROLLBACK`;
        throw e;
      }
    }

    // ─── COBROS A MODELOS (detalle del mes) ────────────────
    // GET ?action=cobros-mes&mes=YYYY-MM
    if (action === 'cobros-mes') {
      const auth = checkAuth(req);
      if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.msg });
      const mes = req.query.mes;
      if (!mes) return res.status(400).json({ success: false, error: 'mes requerido' });

      const r = await sql`
        SELECT c.id, c.mes, c.cuenta_id, c.total_a_cobrar, c.pago_recibido,
               (COALESCE(c.total_a_cobrar, 0) - COALESCE(c.pago_recibido, 0)) AS pago_pendiente,
               c.estado_resumen, c.medio_pago, c.moneda, c.observaciones,
               cu.nombre_cuenta, cu.tipo,
               m.id AS modelo_id, m.nombre AS modelo_nombre, m.moneda_default
        FROM cierre_cuenta_mes c
        JOIN cuentas cu ON cu.id = c.cuenta_id
        JOIN modelos m  ON m.id = cu.modelo_id
        WHERE c.mes = ${mes}
        ORDER BY m.nombre, cu.nombre_cuenta
      `;
      return res.status(200).json({ success: true, data: r.rows });
    }

    // ─── ACTUALIZAR pago de un cierre (cobros) ─────────────
    // POST ?action=cobros-update body: { cierre_id, estado_resumen, pago_recibido, medio_pago, observaciones }
    if (action === 'cobros-update') {
      const auth = checkAuth(req);
      if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.msg });
      if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'POST required' });

      const b = req.body || {};
      const id = Number(b.cierre_id);
      if (!id) return res.status(400).json({ success: false, error: 'cierre_id requerido' });

      await sql`
        UPDATE cierre_cuenta_mes
        SET estado_resumen = COALESCE(${b.estado_resumen || null}, estado_resumen),
            pago_recibido  = COALESCE(${b.pago_recibido != null ? Number(b.pago_recibido) : null}, pago_recibido),
            medio_pago     = COALESCE(${b.medio_pago || null}, medio_pago),
            observaciones  = COALESCE(${b.observaciones || null}, observaciones),
            updated_at     = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `;
      return res.status(200).json({ success: true });
    }

    // ─── SUPERVISOR (Jony) — cálculo del mes ───────────────
    // GET  ?action=supervisor-mes&mes=YYYY-MM
    // POST ?action=supervisor-mes body: { mes, suscripciones_totales }
    if (action === 'supervisor-mes') {
      const auth = checkAuth(req);
      if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.msg });
      await ensureSupervisorSubsTable();

      if (req.method === 'POST') {
        const b = req.body || {};
        const mesBody = b.mes || req.query.mes;
        const subsRaw = b.suscripciones_totales;
        if (!mesBody) return res.status(400).json({ success: false, error: 'mes requerido' });
        if (subsRaw === undefined || subsRaw === null || subsRaw === '') {
          return res.status(400).json({ success: false, error: 'suscripciones_totales requerido' });
        }
        const subs = Number(subsRaw);
        if (Number.isNaN(subs) || subs < 0) {
          return res.status(400).json({ success: false, error: 'suscripciones_totales inválido' });
        }

        await sql`
          INSERT INTO supervisor_suscripciones_mes (mes, suscripciones_totales, updated_at)
          VALUES (${mesBody}, ${subs}, CURRENT_TIMESTAMP)
          ON CONFLICT (mes) DO UPDATE SET
            suscripciones_totales = EXCLUDED.suscripciones_totales,
            updated_at = CURRENT_TIMESTAMP
        `;
        return res.status(200).json({ success: true, mes: mesBody, suscripciones_totales: subs });
      }

      const mes = req.query.mes;
      if (!mes) return res.status(400).json({ success: false, error: 'mes requerido' });

      // Quién es el supervisor
      const sup = await sql`
        SELECT id, nombre FROM chatters_admin
        WHERE activo = TRUE AND rol = 'supervisor'
        ORDER BY id LIMIT 1
      `;
      const supervisor = sup.rows[0] || null;

      // Suscripciones totales del mes (manual si existe, si no automático desde cierres)
      const subs = await sql`SELECT COALESCE(SUM(suscripciones), 0) AS subs FROM cierre_cuenta_mes WHERE mes = ${mes}`;
      const subsManualRes = await sql`
        SELECT suscripciones_totales
        FROM supervisor_suscripciones_mes
        WHERE mes = ${mes}
      `;
      const subsManual = subsManualRes.rows[0]?.suscripciones_totales;
      const suscripcionesTotales = subsManual != null
        ? Number(subsManual)
        : Number(subs.rows[0].subs);

      // Comisión sobre ventas de chatters: SUM(fact_chatter × pct_supervisor del chatter)
      const ventas = await sql`
        SELECT ch.id, ch.nombre, ch.porcentaje_supervisor,
               COALESCE(SUM(cm.fact_chatter), 0) AS fact_total
        FROM chatters_admin ch
        LEFT JOIN cierre_chatter_cuenta_mes cm
          ON cm.chatter_id = ch.id AND cm.mes = ${mes}
        WHERE ch.activo = TRUE AND COALESCE(ch.rol, 'chatter') <> 'supervisor'
        GROUP BY ch.id, ch.nombre, ch.porcentaje_supervisor
        ORDER BY ch.nombre
      `;
      let comisionVentas = 0;
      const ventasDetail = ventas.rows.map(v => {
        const fact = Number(v.fact_total);
        const pct = Number(v.porcentaje_supervisor || 5);
        const com = fact * pct / 100;
        comisionVentas += com;
        return { chatter_id: v.id, chatter: v.nombre, fact_chatter: fact, porcentaje_supervisor: pct, comision: com };
      });

      const sfsControl = 100;
      const comisionSubs = suscripcionesTotales * 0.05;
      const totalBruto = sfsControl + comisionSubs + comisionVentas;

      // Tx fee del mes
      const feeRow = await sql`SELECT porcentaje FROM transaction_fee_mes WHERE mes = ${mes}`;
      let fee = feeRow.rows[0]?.porcentaje;
      if (fee == null) {
        const last = await sql`SELECT porcentaje FROM transaction_fee_mes ORDER BY mes DESC LIMIT 1`;
        fee = Number(last.rows[0]?.porcentaje ?? 4);
      }
      fee = Number(fee);
      const neto = totalBruto * (1 - fee / 100);

      // Persistir snapshot
      if (supervisor) {
        await sql`
          INSERT INTO supervisor_comision_mes (
            mes, chatter_supervisor_id, sfs_control, comision_suscripciones,
            comision_ventas_chatters, total_bruto, transaction_fee_pct, neto_a_pagar
          ) VALUES (
            ${mes}, ${supervisor.id}, ${sfsControl}, ${comisionSubs},
            ${comisionVentas}, ${totalBruto}, ${fee}, ${neto}
          )
          ON CONFLICT (mes) DO UPDATE SET
            chatter_supervisor_id = EXCLUDED.chatter_supervisor_id,
            sfs_control = EXCLUDED.sfs_control,
            comision_suscripciones = EXCLUDED.comision_suscripciones,
            comision_ventas_chatters = EXCLUDED.comision_ventas_chatters,
            total_bruto = EXCLUDED.total_bruto,
            transaction_fee_pct = EXCLUDED.transaction_fee_pct,
            neto_a_pagar = EXCLUDED.neto_a_pagar
        `;
      }

      return res.status(200).json({
        success: true,
        mes,
        supervisor,
        sfs_control: sfsControl,
        suscripciones_totales: suscripcionesTotales,
        suscripciones_totales_manual: subsManual != null ? Number(subsManual) : null,
        suscripciones_origen: subsManual != null ? 'manual' : 'auto',
        comision_suscripciones: comisionSubs,
        ventas_detalle: ventasDetail,
        comision_ventas_chatters: comisionVentas,
        total_bruto: totalBruto,
        transaction_fee_pct: fee,
        neto_a_pagar: neto
      });
    }

    // ─── INCENTIVOS — histórico + setter del mes ───────────
    // GET ?action=incentivos
    // POST ?action=incentivos body: { mes, chatter_id, monto, motivo }   (upsert)
    // POST ?action=incentivos&op=delete&mes=YYYY-MM
    if (action === 'incentivos') {
      const auth = checkAuth(req);
      if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.msg });

      if (req.method === 'GET') {
        const r = await sql`
          SELECT i.id, i.mes, i.chatter_id, i.monto, i.motivo,
                 ch.nombre AS chatter
          FROM incentivos_historico i
          LEFT JOIN chatters_admin ch ON ch.id = i.chatter_id
          ORDER BY i.mes DESC
        `;
        return res.status(200).json({ success: true, data: r.rows });
      }

      if (req.method === 'POST') {
        const op = req.query.op || null;
        if (op === 'delete') {
          const mesDel = req.query.mes || (req.body || {}).mes;
          if (!mesDel) return res.status(400).json({ success: false, error: 'mes requerido' });
          await sql`DELETE FROM incentivos_historico WHERE mes = ${mesDel}`;
          return res.status(200).json({ success: true });
        }
        const b = req.body || {};
        const mes = b.mes;
        const chatterId = Number(b.chatter_id);
        const monto = Number(b.monto || 50);
        if (!mes || !chatterId) return res.status(400).json({ success: false, error: 'mes y chatter_id requeridos' });

        await sql`
          INSERT INTO incentivos_historico (mes, chatter_id, monto, motivo)
          VALUES (${mes}, ${chatterId}, ${monto}, ${b.motivo || null})
          ON CONFLICT (mes) DO UPDATE SET
            chatter_id = EXCLUDED.chatter_id,
            monto = EXCLUDED.monto,
            motivo = EXCLUDED.motivo
        `;
        return res.status(200).json({ success: true });
      }
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    // ─── P&L MENSUAL ───────────────────────────────────────
    // GET ?action=pnl&mes=YYYY-MM
    if (action === 'pnl') {
      const auth = checkAuth(req);
      if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.msg });
      const mes = req.query.mes;
      if (!mes) return res.status(400).json({ success: false, error: 'mes requerido' });

      const cierres = await sql`
        SELECT
          COALESCE(SUM(fact_total), 0) AS fact_total,
          COALESCE(SUM(suscripciones), 0) AS suscripciones,
          COALESCE(SUM(fact_total - suscripciones - masivos), 0) AS fact_sin_subs,
          COALESCE(SUM((fact_total - suscripciones - masivos) * porcentaje_aplicado / 100), 0) AS ganancia_bruta,
          COALESCE(SUM(total_a_cobrar), 0) AS ingreso_bruto
        FROM cierre_cuenta_mes WHERE mes = ${mes}
      `;
      const pagosChat = await sql`SELECT COALESCE(SUM(neto_a_pagar), 0) AS pagos FROM chatter_pagos_mes WHERE mes = ${mes}`;
      const pagosSup = await sql`SELECT COALESCE(SUM(neto_a_pagar), 0) AS pagos FROM supervisor_comision_mes WHERE mes = ${mes}`;
      const equipo = await sql`SELECT COALESCE(SUM(sueldo_mensual_usd), 0) AS sueldos FROM equipo_fijo WHERE activo = TRUE`;
      const gastos = await sql`SELECT COALESCE(SUM(monto), 0) AS otros FROM gastos_mes WHERE mes = ${mes}`;

      const c = cierres.rows[0];
      const ingreso = Number(c.ingreso_bruto);
      const pChat = Number(pagosChat.rows[0].pagos);
      const pSup = Number(pagosSup.rows[0].pagos);
      const pEq = Number(equipo.rows[0].sueldos);
      // Desde este punto, el OM agencia se carga manualmente en "gastos_mes".
      const pOm = 0;
      const pGas = Number(gastos.rows[0].otros);
      const netoOwner = ingreso - pChat - pSup - pEq - pOm - pGas;

      return res.status(200).json({
        success: true,
        mes,
        fact_total: Number(c.fact_total),
        suscripciones: Number(c.suscripciones),
        fact_sin_subs: Number(c.fact_sin_subs),
        ganancia_bruta_agencia: Number(c.ganancia_bruta),
        ingreso_bruto: ingreso,
        pagos_chatters: pChat,
        pagos_supervisor: pSup,
        pagos_equipo_fijo: pEq,
        gasto_om_agencia: pOm,
        gastos_otros: pGas,
        neto_owner: netoOwner
      });
    }

    // ─── DB STATS (chequeo rápido para debug) ──────────
    if (action === 'stats') {
      const auth = checkAuth(req);
      if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.msg });

      const r = await sql`
        SELECT
          (SELECT count(*) FROM planes_servicio)  AS planes,
          (SELECT count(*) FROM modelos)          AS modelos,
          (SELECT count(*) FROM cuentas)          AS cuentas,
          (SELECT count(*) FROM chatters_admin)   AS chatters,
          (SELECT count(*) FROM equipo_fijo)      AS equipo,
          (SELECT count(*) FROM facturas_emitidas) AS facturas
      `;
      return res.status(200).json({ success: true, counts: r.rows[0] });
    }

    return res.status(400).json({
      success: false,
      error: 'unknown action',
      hint: 'usa ?action=login | verify | catalog | stats | cierre-modelo | cierre-save | factura-create | facturas-list | factura-get | resumen-override | resumen-mes | gastos | tx-fee | tx-fee-history | chatter-cuentas | liquidacion-mes | liquidacion-save | cobros-mes | cobros-update | supervisor-mes | incentivos | pnl'
    });

  } catch (error) {
    console.error('admin error:', error);
    return res.status(500).json({
      success: false,
      error: 'internal error',
      details: error.message
    });
  }
};
