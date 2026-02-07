/**
 * API Endpoint: Inspección de Datos
 * GET: /api/supervision/inspect-data
 * Muestra todos los datos guardados para verificar integridad
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

  const inspeccion = {
    timestamp: new Date().toISOString(),
    tablas: {}
  };

  try {
    // 1. CHECKLIST_MES (Supervisión Diaria)
    try {
      const { rows: checklist } = await sql`SELECT * FROM checklist_mes ORDER BY key LIMIT 50`;
      inspeccion.tablas.checklist_mes = {
        total: checklist.length,
        muestra: checklist.slice(0, 10),
        ultimaActualizacion: checklist.length > 0 ? checklist[0].updated_at : null
      };
    } catch (error) {
      inspeccion.tablas.checklist_mes = { error: error.message };
    }

    // 2. VIP_REPASO (Tracker VIP - Estados Diarios)
    try {
      const { rows: vipRepaso } = await sql`SELECT * FROM vip_repaso ORDER BY updated_at DESC LIMIT 50`;
      inspeccion.tablas.vip_repaso = {
        total: vipRepaso.length,
        muestra: vipRepaso.slice(0, 10),
        ultimaActualizacion: vipRepaso.length > 0 ? vipRepaso[0].updated_at : null
      };
    } catch (error) {
      inspeccion.tablas.vip_repaso = { error: error.message };
    }

    // 3. VIP_FANS (Lista de VIPs)
    try {
      const { rows: vipFans } = await sql`SELECT * FROM vip_fans ORDER BY created_at DESC`;
      inspeccion.tablas.vip_fans = {
        total: vipFans.length,
        datos: vipFans,
        porCuenta: vipFans.reduce((acc, fan) => {
          acc[fan.account] = (acc[fan.account] || 0) + 1;
          return acc;
        }, {}),
        porTipo: vipFans.reduce((acc, fan) => {
          acc[fan.type] = (acc[fan.type] || 0) + 1;
          return acc;
        }, {})
      };
    } catch (error) {
      inspeccion.tablas.vip_fans = { error: error.message };
    }

    // 4. SUPERVISION_SEMANAL (Supervisión Semanal)
    try {
      const { rows: semanal } = await sql`SELECT * FROM supervision_semanal ORDER BY week_index, chatter, cuenta`;
      
      // Agrupar por semana
      const porSemana = semanal.reduce((acc, row) => {
        const key = row.semana || 'Sin Semana';
        if (!acc[key]) acc[key] = [];
        acc[key].push({
          chatter: row.chatter,
          cuenta: row.cuenta,
          facturacion: row.facturacion,
          nuevos_fans: row.nuevos_fans,
          estadoObjetivo: row.estado_objetivo
        });
        return acc;
      }, {});

      inspeccion.tablas.supervision_semanal = {
        total: semanal.length,
        porSemana: Object.keys(porSemana).map(semana => ({
          semana,
          registros: porSemana[semana].length,
          datos: porSemana[semana]
        })),
        ultimaActualizacion: semanal.length > 0 ? semanal[0].updated_at : null,
        muestraCompleta: semanal.slice(0, 20)
      };
    } catch (error) {
      inspeccion.tablas.supervision_semanal = { error: error.message };
    }

    // 5. REGISTRO_ERRORES
    try {
      const { rows: errores } = await sql`SELECT * FROM registro_errores ORDER BY fecha DESC`;
      inspeccion.tablas.registro_errores = {
        total: errores.length,
        datos: errores
      };
    } catch (error) {
      inspeccion.tablas.registro_errores = { error: error.message };
    }

    // 6. Resumen General
    inspeccion.resumen = {
      totalRegistros: 
        (inspeccion.tablas.checklist_mes.total || 0) +
        (inspeccion.tablas.vip_repaso.total || 0) +
        (inspeccion.tablas.vip_fans.total || 0) +
        (inspeccion.tablas.supervision_semanal.total || 0) +
        (inspeccion.tablas.registro_errores.total || 0),
      tablasActivas: Object.keys(inspeccion.tablas).filter(t => 
        inspeccion.tablas[t].total > 0 || inspeccion.tablas[t].datos?.length > 0
      ).length,
      tablasSinDatos: Object.keys(inspeccion.tablas).filter(t => 
        (inspeccion.tablas[t].total === 0) || 
        (inspeccion.tablas[t].datos?.length === 0)
      )
    };

    return res.status(200).json({
      success: true,
      inspeccion
    });

  } catch (error) {
    console.error('❌ Error en inspección:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
};
