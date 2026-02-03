/**
 * Script de Verificación de Esquema de Base de Datos
 * Ejecutar este endpoint para verificar/crear todas las tablas necesarias
 * GET: /api/supervision/verify-schema
 */

const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const results = {
    tablesChecked: [],
    tablesCreated: [],
    errors: []
  };

  try {
    // 1. Verificar/Crear tabla checklist_mes
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS checklist_mes (
          id SERIAL PRIMARY KEY,
          key TEXT UNIQUE NOT NULL,
          status TEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS idx_checklist_key ON checklist_mes(key)`;
      results.tablesChecked.push('checklist_mes');
    } catch (e) {
      results.errors.push({ table: 'checklist_mes', error: e.message });
    }

    // 2. Verificar/Crear tabla vip_repaso
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS vip_repaso (
          id SERIAL PRIMARY KEY,
          key TEXT UNIQUE NOT NULL,
          status TEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS idx_vip_key ON vip_repaso(key)`;
      results.tablesChecked.push('vip_repaso');
    } catch (e) {
      results.errors.push({ table: 'vip_repaso', error: e.message });
    }

    // 3. Verificar/Crear tabla vip_fans
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS vip_fans (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          account TEXT NOT NULL,
          type TEXT NOT NULL,
          chat_link TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      results.tablesChecked.push('vip_fans');
    } catch (e) {
      results.errors.push({ table: 'vip_fans', error: e.message });
    }

    // 4. Verificar/Crear tabla registro_errores
    try {
      await sql`
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
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS idx_errores_fecha ON registro_errores(fecha)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_errores_chatter ON registro_errores(chatter)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_errores_estado ON registro_errores(estado)`;
      results.tablesChecked.push('registro_errores');
    } catch (e) {
      results.errors.push({ table: 'registro_errores', error: e.message });
    }

    // 5. Verificar/Crear tabla supervision_semanal
    try {
      await sql`
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
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS idx_semanal_chatter ON supervision_semanal(chatter)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_semanal_semana ON supervision_semanal(semana)`;
      results.tablesChecked.push('supervision_semanal');
    } catch (e) {
      results.errors.push({ table: 'supervision_semanal', error: e.message });
    }

    // 6. Verificar conteos actuales
    const counts = {};
    try {
      const { rows: checklistCount } = await sql`SELECT COUNT(*) as count FROM checklist_mes`;
      counts.checklist_mes = parseInt(checklistCount[0].count);
    } catch (e) { counts.checklist_mes = 'error'; }

    try {
      const { rows: vipRepasoCount } = await sql`SELECT COUNT(*) as count FROM vip_repaso`;
      counts.vip_repaso = parseInt(vipRepasoCount[0].count);
    } catch (e) { counts.vip_repaso = 'error'; }

    try {
      const { rows: vipFansCount } = await sql`SELECT COUNT(*) as count FROM vip_fans`;
      counts.vip_fans = parseInt(vipFansCount[0].count);
    } catch (e) { counts.vip_fans = 'error'; }

    try {
      const { rows: erroresCount } = await sql`SELECT COUNT(*) as count FROM registro_errores`;
      counts.registro_errores = parseInt(erroresCount[0].count);
    } catch (e) { counts.registro_errores = 'error'; }

    try {
      const { rows: semanalCount } = await sql`SELECT COUNT(*) as count FROM supervision_semanal`;
      counts.supervision_semanal = parseInt(semanalCount[0].count);
    } catch (e) { counts.supervision_semanal = 'error'; }

    return res.status(200).json({
      success: true,
      message: 'Schema verification completed',
      results: {
        ...results,
        recordCounts: counts
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Schema verification error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      results
    });
  }
};
