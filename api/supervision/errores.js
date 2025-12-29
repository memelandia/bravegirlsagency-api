/**
 * API Endpoint: /api/supervision/errores
 * Guarda y carga datos del REGISTRO_ERRORES
 * Usa Vercel Postgres como base de datos
 */

import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
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

      if (!Array.isArray(data)) {
        return res.status(400).json({ error: 'Data must be an array' });
      }

      // Borrar todos los registros existentes
      await sql`DELETE FROM registro_errores`;

      // Insertar todos los nuevos registros
      for (const entry of data) {
        await sql`
          INSERT INTO registro_errores (
            id, fecha, cuenta, chatter, tipo, gravedad, detalle, traslado, estado, link
          ) VALUES (
            ${entry.id}, ${entry.fecha}, ${entry.cuenta || ''}, ${entry.chatter || ''},
            ${entry.tipo || ''}, ${entry.gravedad || ''}, ${entry.detalle || ''},
            ${entry.traslado || ''}, ${entry.estado || ''}, ${entry.link || ''}
          )
        `;
      }

      return res.status(200).json({ success: true, message: 'Data saved' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in supervision/errores API:', error);
    return res.status(500).json({ error: error.message });
  }
}
