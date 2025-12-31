// api/crm/social-accounts.js - CRUD for Social Accounts
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
                'SELECT * FROM crm_social_accounts ORDER BY model_id, plataforma'
            );
            return res.status(200).json({ success: true, data: result.rows });
        }
        
        if (req.method === 'POST') {
            const { model_id, plataforma, handle, idioma, nicho, verticales, estado, link_principal } = req.body;
            
            if (!model_id || !plataforma || !handle) {
                return res.status(400).json({ error: 'model_id, plataforma y handle son requeridos' });
            }
            
            const result = await pool.query(
                'INSERT INTO crm_social_accounts (model_id, plataforma, handle, idioma, nicho, verticales, estado, link_principal, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *',
                [model_id, plataforma, handle, idioma, nicho, JSON.stringify(verticales || []), estado || 'activa', link_principal]
            );
            
            return res.status(201).json({ success: true, data: result.rows[0] });
        }
        
        return res.status(405).json({ error: 'Method not allowed' });
        
    } catch (error) {
        console.error('CRM Social Accounts API Error:', error);
        return res.status(500).json({ 
            error: 'Error en el servidor',
            message: error.message 
        });
    }
};
