/**
 * API Endpoint: /api/supervision/semanal
 * Guarda y carga datos de SUPERVISION_SEMANAL
 * Usa Vercel Postgres con esquema Relacional (Columnas)
 */

const { sql } = require('@vercel/postgres');

// Helper to map DB snake_case to Frontend camelCase
const toCamel = (row) => ({
  id: row.id,
  mes: row.mes,
  semana: row.semana,
  weekIndex: row.week_index,
  chatter: row.chatter,
  cuenta: row.cuenta,
  facturacion: row.facturacion,
  nuevosFans: row.nuevos_fans,
  metaSemanal: row.meta_semanal,
  metaMensual: row.meta_mensual,
  metaFacturacion: row.meta_facturacion,
  facturacionMensualObjetivo: row.facturacion_mensual_objetivo,
  posteos: row.posteos,
  historias: row.historias,
  pendientes: row.pendientes,
  resueltos: row.resueltos,
  impacto: row.impacto,
  tiempoRespuesta: row.tiempo_respuesta,
  estadoObjetivo: row.estado_objetivo
});

// Helper to map Frontend camelCase to DB snake_case
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
  // CORS Headers explícitos (Respaldo a vercel.json)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  // Manejo inmediato de OPTIONS para evitar errores de CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // Select all columns
      const { rows } = await sql`SELECT * FROM supervision_semanal ORDER BY week_index ASC, id ASC`;
      const data = rows.map(toCamel);
      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'POST') {
      const { data } = req.body;

      console.log('📥 Received POST request to /semanal');
      console.log('📦 Data length:', data ? data.length : 'undefined');

      if (!Array.isArray(data)) {
        console.error('❌ Data is not an array:', typeof data);
        return res.status(400).json({ error: 'Data must be an array', received: typeof data });
      }

      // Map to snake_case for DB
      const mappedData = data.map(toSnake);
      const jsonPayload = JSON.stringify(mappedData);
      
      console.log('🔄 Mapped data length:', mappedData.length);
      console.log('📝 First record sample:', mappedData[0] ? JSON.stringify(mappedData[0]) : 'empty');

      // Transaction: Delete all and Bulk Insert using jsonb_populate_recordset
      // This is extremely efficient and atomic
      await sql`BEGIN`;
      try {
        console.log('🗑️ Deleting old records...');
        await sql`DELETE FROM supervision_semanal`;
        
        if (mappedData.length > 0) {
          console.log('💾 Inserting new records...');
          await sql`
            INSERT INTO supervision_semanal 
            SELECT * FROM jsonb_populate_recordset(null::supervision_semanal, ${jsonPayload}::jsonb)
          `;
          console.log('✅ Insert successful');
        }
        
        await sql`COMMIT`;
        console.log('✅ Transaction committed');
      } catch (err) {
        console.error('❌ Transaction error:', err);
        await sql`ROLLBACK`;
        console.log('🔄 Transaction rolled back');
        throw err;
      }

      return res.status(200).json({ success: true, message: 'Data saved successfully', count: mappedData.length });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('CRITICAL API ERROR:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Database connection failed', 
      details: error.message,
      hint: 'Ensure Vercel Project is linked to Postgres Storage'
    });
  }
};
