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
        SELECT 
          id, mes, semana, week_index, chatter, cuenta,
          facturacion, nuevos_fans, meta_semanal, meta_mensual,
          posteos, historias, pendientes, resueltos, impacto,
          tiempo_respuesta, estado_objetivo
        FROM supervision_semanal
        ORDER BY week_index, chatter, cuenta
      `;

      // Convertir snake_case a camelCase para el frontend
      const data = rows.map(row => ({
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
        posteos: row.posteos,
        historias: row.historias,
        pendientes: row.pendientes,
        resueltos: row.resueltos,
        impacto: row.impacto,
        tiempoRespuesta: row.tiempo_respuesta,
        estadoObjetivo: row.estado_objetivo
      }));

      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'POST') {
      const { data } = req.body;

      if (!Array.isArray(data)) {
        return res.status(400).json({ error: 'Data must be an array' });
      }

      // Borrar todos los registros existentes
      await sql`DELETE FROM supervision_semanal`;

      // Insertar todos los nuevos registros
      for (const row of data) {
        await sql`
          INSERT INTO supervision_semanal (
            id, mes, semana, week_index, chatter, cuenta,
            facturacion, nuevos_fans, meta_semanal, meta_mensual,
            posteos, historias, pendientes, resueltos, impacto,
            tiempo_respuesta, estado_objetivo
          ) VALUES (
            ${row.id}, ${row.mes || ''}, ${row.semana}, ${row.weekIndex},
            ${row.chatter}, ${row.cuenta}, ${row.facturacion || ''},
            ${row.nuevosFans || ''}, ${row.metaSemanal || ''}, ${row.metaMensual || ''},
            ${row.posteos || ''}, ${row.historias || ''}, ${row.pendientes || ''},
            ${row.resueltos || ''}, ${row.impacto || ''}, ${row.tiempoRespuesta || ''},
            ${row.estadoObjetivo || ''}
          )
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
