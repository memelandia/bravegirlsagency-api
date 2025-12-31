// api/crm/chatters/[id].js - Update/Delete specific chatter
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.CRM_DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const { id } = req.query;
    
    try {
        if (req.method === 'GET') {
            const result = await pool.query('SELECT * FROM crm_chatters WHERE id = $1', [id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Chatter no encontrado' });
            }
            return res.status(200).json({ success: true, data: result.rows[0] });
        }
        
        if (req.method === 'PUT') {
            const { nombre, estado, nivel, pais, disponibilidad } = req.body;
            
            const result = await pool.query(
                'UPDATE crm_chatters SET nombre = $1, estado = $2, nivel = $3, pais = $4, disponibilidad = $5, updated_at = NOW() WHERE id = $6 RETURNING *',
                [nombre, estado, nivel, pais, JSON.stringify(disponibilidad), id]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Chatter no encontrado' });
            }
            
            return res.status(200).json({ success: true, data: result.rows[0] });
        }
        
        if (req.method === 'DELETE') {
            const result = await pool.query('DELETE FROM crm_chatters WHERE id = $1 RETURNING *', [id]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Chatter no encontrado' });
            }
            
            return res.status(200).json({ success: true, message: 'Chatter eliminado' });
        }
        
        return res.status(405).json({ error: 'Method not allowed' });
        
    } catch (error) {
        console.error('CRM Chatter API Error:', error);
        return res.status(500).json({ 
            error: 'Error en el servidor',
            message: error.message 
        });
    }
};
