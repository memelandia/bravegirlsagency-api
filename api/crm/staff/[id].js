// api/crm/staff/[id].js - Update/Delete specific staff member
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
            const result = await pool.query('SELECT * FROM crm_staff WHERE id = $1', [id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Staff no encontrado' });
            }
            return res.status(200).json({ success: true, data: result.rows[0] });
        }
        
        if (req.method === 'PUT') {
            const { nombre, rol, estado, modelos_asignados } = req.body;
            
            // Validate rol if provided
            if (rol) {
                const validRoles = ['VA_EDITOR', 'AM_UPLOAD', 'CD'];
                if (!validRoles.includes(rol)) {
                    return res.status(400).json({ error: 'Rol inválido. Debe ser: VA_EDITOR, AM_UPLOAD o CD' });
                }
            }
            
            const result = await pool.query(
                'UPDATE crm_staff SET nombre = $1, rol = $2, estado = $3, modelos_asignados = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
                [nombre, rol, estado, JSON.stringify(modelos_asignados), id]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Staff no encontrado' });
            }
            
            return res.status(200).json({ success: true, data: result.rows[0] });
        }
        
        if (req.method === 'DELETE') {
            const result = await pool.query('DELETE FROM crm_staff WHERE id = $1 RETURNING *', [id]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Staff no encontrado' });
            }
            
            return res.status(200).json({ success: true, message: 'Staff eliminado' });
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
