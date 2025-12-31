// api/crm/staff.js - CRUD for Staff (Marketing team)
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
                'SELECT * FROM crm_staff ORDER BY rol, nombre ASC'
            );
            return res.status(200).json({ success: true, data: result.rows });
        }
        
        if (req.method === 'POST') {
            const { nombre, rol, estado, modelos_asignados } = req.body;
            
            if (!nombre || !rol) {
                return res.status(400).json({ error: 'Nombre y rol son requeridos' });
            }
            
            // Validate rol
            const validRoles = ['VA_EDITOR', 'AM_UPLOAD', 'CD'];
            if (!validRoles.includes(rol)) {
                return res.status(400).json({ error: 'Rol inválido. Debe ser: VA_EDITOR, AM_UPLOAD o CD' });
            }
            
            const result = await pool.query(
                'INSERT INTO crm_staff (nombre, rol, estado, modelos_asignados, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
                [nombre, rol, estado || 'activo', JSON.stringify(modelos_asignados || [])]
            );
            
            return res.status(201).json({ success: true, data: result.rows[0] });
        }
        
        return res.status(405).json({ error: 'Method not allowed' });
        
    } catch (error) {
        console.error('CRM Staff API Error:', error);
        return res.status(500).json({ 
            error: 'Error en el servidor',
            message: error.message 
        });
    }
};
