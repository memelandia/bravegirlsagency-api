// api/crm/assignments.js - CRUD for Assignments
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
                'SELECT * FROM crm_assignments ORDER BY created_at DESC'
            );
            return res.status(200).json({ success: true, data: result.rows });
        }
        
        if (req.method === 'POST') {
            const { chatter_id, model_id, horario, estado } = req.body;
            
            if (!chatter_id || !model_id) {
                return res.status(400).json({ error: 'chatter_id y model_id son requeridos' });
            }
            
            const result = await pool.query(
                'INSERT INTO crm_assignments (chatter_id, model_id, horario, estado, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
                [chatter_id, model_id, JSON.stringify(horario || {}), estado || 'activa']
            );
            
            return res.status(201).json({ success: true, data: result.rows[0] });
        }
        
        return res.status(405).json({ error: 'Method not allowed' });
        
    } catch (error) {
        console.error('CRM Assignments API Error:', error);
        return res.status(500).json({ 
            error: 'Error en el servidor',
            message: error.message 
        });
    }
};
