// api/crm/assignments/[id].js - Update/Delete specific assignment
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
            const result = await pool.query('SELECT * FROM crm_assignments WHERE id = $1', [id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Asignación no encontrada' });
            }
            return res.status(200).json({ success: true, data: result.rows[0] });
        }
        
        if (req.method === 'PUT') {
            const { chatter_id, model_id, horario, estado } = req.body;
            
            const result = await pool.query(
                'UPDATE crm_assignments SET chatter_id = $1, model_id = $2, horario = $3, estado = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
                [chatter_id, model_id, JSON.stringify(horario), estado, id]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Asignación no encontrada' });
            }
            
            return res.status(200).json({ success: true, data: result.rows[0] });
        }
        
        if (req.method === 'DELETE') {
            const result = await pool.query('DELETE FROM crm_assignments WHERE id = $1 RETURNING *', [id]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Asignación no encontrada' });
            }
            
            return res.status(200).json({ success: true, message: 'Asignación eliminada' });
        }
        
        return res.status(405).json({ error: 'Method not allowed' });
        
    } catch (error) {
        console.error('CRM Assignment API Error:', error);
        return res.status(500).json({ 
            error: 'Error en el servidor',
            message: error.message 
        });
    }
};
