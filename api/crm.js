// api/crm.js - CRM API consolidada en una sola función
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.CRM_DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        const { path } = req.query;
        
        // ============================================
        // MODELS
        // ============================================
        if (path === 'models') {
            if (req.method === 'GET') {
                const result = await pool.query('SELECT * FROM crm_models ORDER BY prioridad DESC, handle ASC');
                return res.status(200).json({ success: true, data: result.rows });
            }
            if (req.method === 'POST') {
                const { handle, estimado_facturacion_mensual, prioridad } = req.body;
                if (!handle) return res.status(400).json({ error: 'Handle es requerido' });
                const result = await pool.query(
                    'INSERT INTO crm_models (handle, estimado_facturacion_mensual, prioridad, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
                    [handle, estimado_facturacion_mensual || 0, prioridad || 3]
                );
                return res.status(201).json({ success: true, data: result.rows[0] });
            }
        }
        
        if (path && path.startsWith('models/')) {
            const id = path.split('/')[1];
            if (req.method === 'GET') {
                const result = await pool.query('SELECT * FROM crm_models WHERE id = $1', [id]);
                if (result.rows.length === 0) return res.status(404).json({ error: 'Modelo no encontrado' });
                return res.status(200).json({ success: true, data: result.rows[0] });
            }
            if (req.method == 'PUT') {
                const { handle, estimado_facturacion_mensual, prioridad, flow_position_x, flow_position_y } = req.body;
                
                // Construir query dinámicamente
                const updates = [];
                const values = [];
                let paramCount = 1;
                
                if (handle !== undefined) { updates.push(`handle = $${paramCount++}`); values.push(handle); }
                if (estimado_facturacion_mensual !== undefined) { updates.push(`estimado_facturacion_mensual = $${paramCount++}`); values.push(estimado_facturacion_mensual); }
                if (prioridad !== undefined) { updates.push(`prioridad = $${paramCount++}`); values.push(prioridad); }
                if (flow_position_x !== undefined) { updates.push(`flow_position_x = $${paramCount++}`); values.push(flow_position_x); }
                if (flow_position_y !== undefined) { updates.push(`flow_position_y = $${paramCount++}`); values.push(flow_position_y); }
                
                updates.push(`updated_at = NOW()`);
                values.push(id);
                
                const query = `UPDATE crm_models SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
                const result = await pool.query(query, values);
                
                if (result.rows.length === 0) return res.status(404).json({ error: 'Modelo no encontrado' });
                return res.status(200).json({ success: true, data: result.rows[0] });
            }
            if (req.method === 'DELETE') {
                const result = await pool.query('DELETE FROM crm_models WHERE id = $1 RETURNING *', [id]);
                if (result.rows.length === 0) return res.status(404).json({ error: 'Modelo no encontrado' });
                return res.status(200).json({ success: true, message: 'Modelo eliminado' });
            }
        }
        
        // ============================================
        // CHATTERS
        // ============================================
        if (path === 'chatters') {
            if (req.method === 'GET') {
                const result = await pool.query('SELECT * FROM crm_chatters ORDER BY nombre ASC');
                return res.status(200).json({ success: true, data: result.rows });
            }
            if (req.method === 'POST') {
                const { nombre, estado, nivel, pais, disponibilidad } = req.body;
                if (!nombre) return res.status(400).json({ error: 'Nombre es requerido' });
                const result = await pool.query(
                    'INSERT INTO crm_chatters (nombre, estado, nivel, pais, disponibilidad, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *',
                    [nombre, estado || 'activo', nivel || 'junior', pais, JSON.stringify(disponibilidad || {})]
                );
                return res.status(201).json({ success: true, data: result.rows[0] });
            }
        }
        
        if (path && path.startsWith('chatters/')) {
            const id = path.split('/')[1];
            if (req.method === 'GET') {
                const result = await pool.query('SELECT * FROM crm_chatters WHERE id = $1', [id]);
                if (result.rows.length === 0) return res.status(404).json({ error: 'Chatter no encontrado' });
                return res.status(200).json({ success: true, data: result.rows[0] });
            }
            if (req.method === 'PUT') {
                const { nombre, estado, nivel, pais, disponibilidad, flow_position_x, flow_position_y } = req.body;
                
                // Construir query dinámicamente
                const updates = [];
                const values = [];
                let paramCount = 1;
                
                if (nombre !== undefined) { updates.push(`nombre = $${paramCount++}`); values.push(nombre); }
                if (estado !== undefined) { updates.push(`estado = $${paramCount++}`); values.push(estado); }
                if (nivel !== undefined) { updates.push(`nivel = $${paramCount++}`); values.push(nivel); }
                if (pais !== undefined) { updates.push(`pais = $${paramCount++}`); values.push(pais); }
                if (disponibilidad !== undefined) { updates.push(`disponibilidad = $${paramCount++}`); values.push(JSON.stringify(disponibilidad)); }
                if (flow_position_x !== undefined) { updates.push(`flow_position_x = $${paramCount++}`); values.push(flow_position_x); }
                if (flow_position_y !== undefined) { updates.push(`flow_position_y = $${paramCount++}`); values.push(flow_position_y); }
                
                updates.push(`updated_at = NOW()`);
                values.push(id);
                
                const query = `UPDATE crm_chatters SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
                const result = await pool.query(query, values);
                
                if (result.rows.length === 0) return res.status(404).json({ error: 'Chatter no encontrado' });
                return res.status(200).json({ success: true, data: result.rows[0] });
            }
            if (req.method === 'DELETE') {
                const result = await pool.query('DELETE FROM crm_chatters WHERE id = $1 RETURNING *', [id]);
                if (result.rows.length === 0) return res.status(404).json({ error: 'Chatter no encontrado' });
                return res.status(200).json({ success: true, message: 'Chatter eliminado' });
            }
        }
        
        // ============================================
        // ASSIGNMENTS
        // ============================================
        if (path === 'assignments') {
            if (req.method === 'GET') {
                const result = await pool.query('SELECT * FROM crm_assignments ORDER BY created_at DESC');
                return res.status(200).json({ success: true, data: result.rows });
            }
            if (req.method === 'POST') {
                const { chatter_id, model_id, horario, estado } = req.body;
                if (!chatter_id || !model_id) return res.status(400).json({ error: 'chatter_id y model_id son requeridos' });
                const result = await pool.query(
                    'INSERT INTO crm_assignments (chatter_id, model_id, horario, estado, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
                    [chatter_id, model_id, JSON.stringify(horario || {}), estado || 'activa']
                );
                return res.status(201).json({ success: true, data: result.rows[0] });
            }
        }
        
        if (path && path.startsWith('assignments/')) {
            const id = path.split('/')[1];
            if (req.method === 'GET') {
                const result = await pool.query('SELECT * FROM crm_assignments WHERE id = $1', [id]);
                if (result.rows.length === 0) return res.status(404).json({ error: 'Asignación no encontrada' });
                return res.status(200).json({ success: true, data: result.rows[0] });
            }
            if (req.method === 'PUT') {
                const { chatter_id, model_id, horario, estado } = req.body;
                const result = await pool.query(
                    'UPDATE crm_assignments SET chatter_id = $1, model_id = $2, horario = $3, estado = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
                    [chatter_id, model_id, JSON.stringify(horario), estado, id]
                );
                if (result.rows.length === 0) return res.status(404).json({ error: 'Asignación no encontrada' });
                return res.status(200).json({ success: true, data: result.rows[0] });
            }
            if (req.method === 'DELETE') {
                const result = await pool.query('DELETE FROM crm_assignments WHERE id = $1 RETURNING *', [id]);
                if (result.rows.length === 0) return res.status(404).json({ error: 'Asignación no encontrada' });
                return res.status(200).json({ success: true, message: 'Asignación eliminada' });
            }
        }
        
        // ============================================
        // SOCIAL ACCOUNTS
        // ============================================
        if (path === 'social-accounts') {
            if (req.method === 'GET') {
                const result = await pool.query('SELECT * FROM crm_social_accounts ORDER BY model_id, plataforma');
                return res.status(200).json({ success: true, data: result.rows });
            }
            if (req.method === 'POST') {
                const { model_id, plataforma, handle, idioma, nicho, verticales, estado, link_principal } = req.body;
                if (!model_id || !plataforma || !handle) return res.status(400).json({ error: 'model_id, plataforma y handle son requeridos' });
                const result = await pool.query(
                    'INSERT INTO crm_social_accounts (model_id, plataforma, handle, idioma, nicho, verticales, estado, link_principal, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *',
                    [model_id, plataforma, handle, idioma, nicho, JSON.stringify(verticales || []), estado || 'activa', link_principal]
                );
                return res.status(201).json({ success: true, data: result.rows[0] });
            }
        }
        
        if (path && path.startsWith('social-accounts/')) {
            const id = path.split('/')[1];
            if (req.method === 'GET') {
                const result = await pool.query('SELECT * FROM crm_social_accounts WHERE id = $1', [id]);
                if (result.rows.length === 0) return res.status(404).json({ error: 'Cuenta social no encontrada' });
                return res.status(200).json({ success: true, data: result.rows[0] });
            }
            if (req.method === 'PUT') {
                const { model_id, plataforma, handle, idioma, nicho, verticales, estado, link_principal } = req.body;
                const result = await pool.query(
                    'UPDATE crm_social_accounts SET model_id = $1, plataforma = $2, handle = $3, idioma = $4, nicho = $5, verticales = $6, estado = $7, link_principal = $8, updated_at = NOW() WHERE id = $9 RETURNING *',
                    [model_id, plataforma, handle, idioma, nicho, JSON.stringify(verticales), estado, link_principal, id]
                );
                if (result.rows.length === 0) return res.status(404).json({ error: 'Cuenta social no encontrada' });
                return res.status(200).json({ success: true, data: result.rows[0] });
            }
            if (req.method === 'DELETE') {
                const result = await pool.query('DELETE FROM crm_social_accounts WHERE id = $1 RETURNING *', [id]);
                if (result.rows.length === 0) return res.status(404).json({ error: 'Cuenta social no encontrada' });
                return res.status(200).json({ success: true, message: 'Cuenta social eliminada' });
            }
        }
        
        // ============================================
        // SUPERVISORS
        // ============================================
        if (path === 'supervisors') {
            if (req.method === 'GET') {
                const result = await pool.query('SELECT * FROM crm_supervisors ORDER BY nombre ASC');
                return res.status(200).json({ success: true, data: result.rows });
            }
            if (req.method === 'POST') {
                const { nombre, scope } = req.body;
                if (!nombre) return res.status(400).json({ error: 'Nombre es requerido' });
                const result = await pool.query(
                    'INSERT INTO crm_supervisors (nombre, scope, created_at) VALUES ($1, $2, NOW()) RETURNING *',
                    [nombre, JSON.stringify(scope || { type: 'todos' })]
                );
                return res.status(201).json({ success: true, data: result.rows[0] });
            }
        }
        
        if (path && path.startsWith('supervisors/')) {
            const id = path.split('/')[1];
            if (req.method === 'GET') {
                const result = await pool.query('SELECT * FROM crm_supervisors WHERE id = $1', [id]);
                if (result.rows.length === 0) return res.status(404).json({ error: 'Supervisor no encontrado' });
                return res.status(200).json({ success: true, data: result.rows[0] });
            }
            if (req.method === 'PUT') {
                const { nombre, scope, flow_position_x, flow_position_y } = req.body;
                
                // Construir query dinámicamente
                const updates = [];
                const values = [];
                let paramCount = 1;
                
                if (nombre !== undefined) { updates.push(`nombre = $${paramCount++}`); values.push(nombre); }
                if (scope !== undefined) { updates.push(`scope = $${paramCount++}`); values.push(JSON.stringify(scope)); }
                if (flow_position_x !== undefined) { updates.push(`flow_position_x = $${paramCount++}`); values.push(flow_position_x); }
                if (flow_position_y !== undefined) { updates.push(`flow_position_y = $${paramCount++}`); values.push(flow_position_y); }
                
                updates.push(`updated_at = NOW()`);
                values.push(id);
                
                const query = `UPDATE crm_supervisors SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
                const result = await pool.query(query, values);
                
                if (result.rows.length === 0) return res.status(404).json({ error: 'Supervisor no encontrado' });
                return res.status(200).json({ success: true, data: result.rows[0] });
            }
            if (req.method === 'DELETE') {
                const result = await pool.query('DELETE FROM crm_supervisors WHERE id = $1 RETURNING *', [id]);
                if (result.rows.length === 0) return res.status(404).json({ error: 'Supervisor no encontrado' });
                return res.status(200).json({ success: true, message: 'Supervisor eliminado' });
            }
        }
        
        // ============================================
        // STAFF
        // ============================================
        if (path === 'staff') {
            if (req.method === 'GET') {
                const result = await pool.query('SELECT * FROM crm_staff ORDER BY rol, nombre ASC');
                // Parsear modelos_asignados de JSON string a array
                const data = result.rows.map(row => ({
                    ...row,
                    modelos_asignados: typeof row.modelos_asignados === 'string' 
                        ? JSON.parse(row.modelos_asignados) 
                        : (row.modelos_asignados || [])
                }));
                return res.status(200).json({ success: true, data });
            }
            if (req.method === 'POST') {
                const { nombre, rol, estado, modelos_asignados } = req.body;
                if (!nombre || !rol) return res.status(400).json({ error: 'Nombre y rol son requeridos' });
                const validRoles = ['EDITOR_REELS', 'PROGRAMADOR_PPV', 'AM_UPLOAD', 'CD', 'VA_EDITOR'];
                if (!validRoles.includes(rol)) return res.status(400).json({ error: 'Rol inválido' });
                
                // Asegurar que modelos_asignados sea un array válido
                const modelosArray = Array.isArray(modelos_asignados) ? modelos_asignados : [];
                
                const result = await pool.query(
                    'INSERT INTO crm_staff (nombre, rol, estado, modelos_asignados, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
                    [nombre, rol, estado || 'activo', JSON.stringify(modelosArray)]
                );
                
                // Parsear respuesta
                const newStaff = result.rows[0];
                newStaff.modelos_asignados = modelosArray;
                return res.status(201).json({ success: true, data: newStaff });
            }
        }
        
        if (path && path.startsWith('staff/')) {
            const id = path.split('/')[1];
            if (req.method === 'GET') {
                const result = await pool.query('SELECT * FROM crm_staff WHERE id = $1', [id]);
                if (result.rows.length === 0) return res.status(404).json({ error: 'Staff no encontrado' });
                // Parsear modelos_asignados
                const staff = result.rows[0];
                staff.modelos_asignados = typeof staff.modelos_asignados === 'string' 
                    ? JSON.parse(staff.modelos_asignados) 
                    : (staff.modelos_asignados || []);
                return res.status(200).json({ success: true, data: staff });
            }
            if (req.method === 'PUT') {
                const { nombre, rol, estado, modelos_asignados } = req.body;
                if (rol) {
                    const validRoles = ['EDITOR_REELS', 'PROGRAMADOR_PPV', 'AM_UPLOAD', 'CD', 'VA_EDITOR'];
                    if (!validRoles.includes(rol)) return res.status(400).json({ error: 'Rol inválido' });
                }
                
                // Asegurar que modelos_asignados sea un array válido
                const modelosArray = Array.isArray(modelos_asignados) ? modelos_asignados : [];
                
                const result = await pool.query(
                    'UPDATE crm_staff SET nombre = $1, rol = $2, estado = $3, modelos_asignados = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
                    [nombre, rol, estado, JSON.stringify(modelosArray), id]
                );
                if (result.rows.length === 0) return res.status(404).json({ error: 'Staff no encontrado' });
                
                // Parsear respuesta
                const updatedStaff = result.rows[0];
                updatedStaff.modelos_asignados = modelosArray;
                return res.status(200).json({ success: true, data: updatedStaff });
            }
            if (req.method === 'DELETE') {
                const result = await pool.query('DELETE FROM crm_staff WHERE id = $1 RETURNING *', [id]);
                if (result.rows.length === 0) return res.status(404).json({ error: 'Staff no encontrado' });
                return res.status(200).json({ success: true, message: 'Staff eliminado' });
            }
        }
        
        // ============================================
        // FLOW POSITIONS (Resetear posiciones)
        // ============================================
        if (path === 'flow-positions') {
            const { action } = req.query;
            if (action === 'reset' && req.method === 'POST') {
                // Resetear todas las posiciones a NULL para forzar layout automático
                await pool.query('UPDATE crm_models SET flow_position_x = NULL, flow_position_y = NULL');
                await pool.query('UPDATE crm_chatters SET flow_position_x = NULL, flow_position_y = NULL');
                await pool.query('UPDATE crm_supervisors SET flow_position_x = NULL, flow_position_y = NULL');
                return res.status(200).json({ success: true, message: 'Todas las posiciones reseteadas' });
            }
        }
        
        return res.status(404).json({ error: 'Ruta no encontrada' });
        
    } catch (error) {
        console.error('CRM API Error:', error);
        return res.status(500).json({ error: 'Error en el servidor', message: error.message });
    }
};
