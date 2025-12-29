/**
 * API Endpoint: /api/supervision/semanal
 * Guarda y carga datos de SUPERVISION_SEMANAL
 * Usa Vercel Postgres como base de datos
 */

import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const { rows } = await sql`
        SELECT id, data
        FROM supervision_semanal
      `;

      // Map rows to just return the data object
      const data = rows.map(row => row.data);

      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'POST') {
      const { data } = req.body;

      if (!Array.isArray(data)) {
        return res.status(400).json({ error: 'Data must be an array' });
      }

      // Borrar todos los registros existentes
      await sql`DELETE FROM supervision_semanal`;

      // Insertar todos los nuevos registros como JSONB
      for (const row of data) {
        await sql`
          INSERT INTO supervision_semanal (id, data)
          VALUES (${row.id}, ${JSON.stringify(row)})
        `;
      }

      return res.status(200).json({ success: true, message: 'Data saved' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in supervision/semanal API:', error);
    return res.status(500).json({ error: error.message });
  }
}
