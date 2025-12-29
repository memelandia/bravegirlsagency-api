import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  // CORS Headers explícitos
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const { rows } = await sql`SELECT * FROM vip_fans ORDER BY created_at DESC`;
      
      // Convertir snake_case a camelCase para el frontend
      const data = rows.map(row => ({
        id: row.id,
        name: row.name,
        account: row.account,
        type: row.type,
        chatLink: row.chat_link
      }));

      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'POST') {
      const { id, name, account, type, chatLink } = req.body;

      if (!id || !name || !account) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      await sql`
        INSERT INTO vip_fans (id, name, account, type, chat_link)
        VALUES (${id}, ${name}, ${account}, ${type}, ${chatLink || ''})
        ON CONFLICT (id) DO UPDATE 
        SET name = ${name}, account = ${account}, type = ${type}, chat_link = ${chatLink || ''}
      `;

      return res.status(200).json({ success: true, message: 'Fan saved' });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Missing ID' });
      }

      await sql`DELETE FROM vip_fans WHERE id = ${id}`;

      return res.status(200).json({ success: true, message: 'Fan deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error in vip-fans:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Database error', 
      details: error.message 
    });
  }
}