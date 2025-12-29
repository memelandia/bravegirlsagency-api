/**
 * API Endpoint: /api/supervision/semanal
 * Guarda y carga datos de SUPERVISION_SEMANAL
 * Usa Vercel Postgres como base de datos
 */

import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
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
      const { rows } = await sql`SELECT id, data FROM supervision_semanal`;
      const data = rows.map(row => row.data);
      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'POST') {
      const { data } = req.body;

      if (!Array.isArray(data)) {
        return res.status(400).json({ error: 'Data must be an array' });
      }

      // Transacción simple: Borrar y Reinsertar
      // Nota: En producción idealmente usaríamos una transacción BEGIN/COMMIT, 
      // pero @vercel/postgres lo maneja por query.
      
      await sql`DELETE FROM supervision_semanal`;

      // Insertar registros
      for (const row of data) {
        // Aseguramos que data sea un string JSON válido y lo casteamos a jsonb
        await sql`
          INSERT INTO supervision_semanal (id, data)
          VALUES (${row.id}, ${JSON.stringify(row)}::jsonb)
        `;
      }

      return res.status(200).json({ success: true, message: 'Data saved successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('CRITICAL API ERROR:', error);
    // Devolvemos JSON incluso en error 500 para evitar "Unexpected token A" en el cliente
    return res.status(500).json({ 
      success: false, 
      error: 'Database connection failed', 
      details: error.message,
      hint: 'Ensure Vercel Project is linked to Postgres Storage'
    });
  }
}
