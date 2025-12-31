// api/crm/supervisors.js - CRUD for Supervisors
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
                'SELECT * FROM crm_supervisors ORDER BY nombre ASC'
            );
            return res.status(200).json({ success: true, data: result.rows });
        }
        
        if (req.method === 'POST') {
            const { nombre, scope } = req.body;
            
            if (!nombre) {
                return res.status(400).json({ error: 'Nombre es requerido' });
            }
            
            const result = await pool.query(
                'INSERT INTO crm_supervisors (nombre, scope, created_at) VALUES ($1, $2, NOW()) RETURNING *',
                [nombre, JSON.stringify(scope || { type: 'todos' })]
            );
            
            return res.status(201).json({ success: true, data: result.rows[0] });
        }
        
        return res.status(405).json({ error: 'Method not allowed' });
        
    } catch (error) {
        console.error('CRM Supervisors API Error:', error);
        return res.status(500).json({ 
            error: 'Error en el servidor',
            message: error.message 
        });
    }
};
