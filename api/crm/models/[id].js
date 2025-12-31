// api/crm/models/[id].js - Update/Delete specific model
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.CRM_DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const { id } = req.query;
    
    try {
        if (req.method === 'GET') {
            // Get specific model
            const result = await pool.query('SELECT * FROM crm_models WHERE id = $1', [id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Modelo no encontrado' });
            }
            return res.status(200).json({ success: true, data: result.rows[0] });
        }
        
        if (req.method === 'PUT') {
            // Update model
            const { handle, estimado_facturacion_mensual, prioridad } = req.body;
            
            const result = await pool.query(
                'UPDATE crm_models SET handle = $1, estimado_facturacion_mensual = $2, prioridad = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
                [handle, estimado_facturacion_mensual, prioridad, id]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Modelo no encontrado' });
            }
            
            return res.status(200).json({ success: true, data: result.rows[0] });
        }
        
        if (req.method === 'DELETE') {
            // Delete model
            const result = await pool.query('DELETE FROM crm_models WHERE id = $1 RETURNING *', [id]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Modelo no encontrado' });
            }
            
            return res.status(200).json({ success: true, message: 'Modelo eliminado' });
        }
        
        return res.status(405).json({ error: 'Method not allowed' });
        
    } catch (error) {
        console.error('CRM Model API Error:', error);
        return res.status(500).json({ 
            error: 'Error en el servidor',
            message: error.message 
        });
    }
};
