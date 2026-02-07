/**
 * API Endpoint: Test de guardado de supervision semanal
 * POST: /api/supervision/test-semanal
 * Muestra exactamente qué datos llegan y cómo se procesan SIN guardar
 */

const { sql } = require('@vercel/postgres');

// Helper to map Frontend camelCase to DB snake_case (COPIA DEL ORIGINAL)
const toSnake = (row) => ({
  id: row.id,
  mes: row.mes,
  semana: row.semana,
  week_index: row.weekIndex,
  chatter: row.chatter,
  cuenta: row.cuenta,
  facturacion: row.facturacion,
  nuevos_fans: row.nuevosFans,
  meta_semanal: row.metaSemanal,
  meta_mensual: row.metaMensual,
  meta_facturacion: row.metaFacturacion,
  facturacion_mensual_objetivo: row.facturacionMensualObjetivo,
  posteos: row.posteos,
  historias: row.historias,
  pendientes: row.pendientes,
  resueltos: row.resueltos,
  impacto: row.impacto,
  tiempo_respuesta: row.tiempoRespuesta,
  estado_objetivo: row.estadoObjetivo
});

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data } = req.body;

    const debug = {
      timestamp: new Date().toISOString(),
      recibido: {
        esArray: Array.isArray(data),
        cantidad: data ? data.length : 0,
        tipoData: typeof data,
        primeros3: data ? data.slice(0, 3) : []
      },
      procesado: null,
      errores: []
    };

    if (!Array.isArray(data)) {
      debug.errores.push('Data no es un array');
      return res.status(400).json(debug);
    }

    // Mapear datos
    try {
      const mappedData = data.map(toSnake);
      debug.procesado = {
        cantidad: mappedData.length,
        primeros3Mapeados: mappedData.slice(0, 3),
        camposVacios: mappedData.slice(0, 10).map(row => ({
          id: row.id,
          chatter: row.chatter,
          cuenta: row.cuenta,
          facturacion: row.facturacion || 'VACÍO',
          nuevos_fans: row.nuevos_fans || 'VACÍO',
          semana: row.semana
        }))
      };
    } catch (error) {
      debug.errores.push(`Error al mapear: ${error.message}`);
    }

    return res.status(200).json({
      success: true,
      debug,
      mensaje: 'Datos recibidos y procesados (NO GUARDADOS - solo test)'
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
};
