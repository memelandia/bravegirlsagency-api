/**
 * API Endpoint: /api/supervision/vip-repaso
 * Guarda y carga datos del VIP_REPASO_MES (tracker ballenas/VIPs)
 * Usa Vercel Postgres como base de datos
 */

const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  // CORS Headers explícitos
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const { rows } = await sql`SELECT key, status FROM vip_repaso`;
      
      const data = {};
      rows.forEach(row => {
        data[row.key] = row.status;
      });

      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'POST') {
      const { data } = req.body;

      if (!data || typeof data !== 'object') {
        return res.status(400).json({ error: 'Invalid data format' });
      }

      const jsonPayload = JSON.stringify(data);
      
      // Upsert masivo optimizado
      await sql`
        INSERT INTO vip_repaso (key, status, updated_at)
        SELECT key, value, CURRENT_TIMESTAMP
        FROM jsonb_each_text(${jsonPayload}::jsonb)
        ON CONFLICT (key) 
        DO UPDATE SET status = EXCLUDED.status, updated_at = CURRENT_TIMESTAMP
      `;

      return res.status(200).json({ success: true, message: 'Data saved' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error in vip-repaso:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Database error', 
      details: error.message 
    });
  }
};
