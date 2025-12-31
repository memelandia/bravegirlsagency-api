// api/crm/chatters.js - CRUD for Chatters
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
    
    try {
        if (req.method === 'GET') {
            const result = await pool.query(
                'SELECT * FROM crm_chatters ORDER BY nombre ASC'
            );
            return res.status(200).json({ success: true, data: result.rows });
        }
        
        if (req.method === 'POST') {
            const { nombre, estado, nivel, pais, disponibilidad } = req.body;
            
            if (!nombre) {
                return res.status(400).json({ error: 'Nombre es requerido' });
            }
            
            const result = await pool.query(
                'INSERT INTO crm_chatters (nombre, estado, nivel, pais, disponibilidad, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *',
                [nombre, estado || 'activo', nivel || 'junior', pais, JSON.stringify(disponibilidad || {})]
            );
            
            return res.status(201).json({ success: true, data: result.rows[0] });
        }
        
        return res.status(405).json({ error: 'Method not allowed' });
        
    } catch (error) {
        console.error('CRM Chatters API Error:', error);
        return res.status(500).json({ 
            error: 'Error en el servidor',
            message: error.message 
        });
    }
};
