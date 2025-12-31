// api/crm/models.js - CRUD for Models
const { Pool } = require('pg');

// Database connection (will use Vercel Postgres or configure your DB)
const pool = new Pool({
    connectionString: process.env.CRM_DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

module.exports = async (req, res) => {
    // CORS headers (same pattern as existing endpoints)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        if (req.method === 'GET') {
            // List all models
            const result = await pool.query(
                'SELECT * FROM crm_models ORDER BY prioridad DESC, handle ASC'
            );
            return res.status(200).json({ success: true, data: result.rows });
        }
        
        if (req.method === 'POST') {
            // Create new model
            const { handle, estimado_facturacion_mensual, prioridad } = req.body;
            
            // Validation
            if (!handle) {
                return res.status(400).json({ error: 'Handle es requerido' });
            }
            
            const result = await pool.query(
                'INSERT INTO crm_models (handle, estimado_facturacion_mensual, prioridad, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
                [handle, estimado_facturacion_mensual || 0, prioridad || 3]
            );
            
            return res.status(201).json({ success: true, data: result.rows[0] });
        }
        
        return res.status(405).json({ error: 'Method not allowed' });
        
    } catch (error) {
        console.error('CRM Models API Error:', error);
        return res.status(500).json({ 
            error: 'Error en el servidor',
            message: error.message 
        });
    }
};
