// ===================================================================
// /api/lms/admin/stages
// CRUD de etapas (solo admin)
// ===================================================================

const { query } = require('../lib/db');
const { parseCookies, errorResponse, successResponse, validateRequired, isValidUUID } = require('../lib/utils');
const { validateSession } = require('../lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    req.cookies = parseCookies(req);
    const user = await validateSession(req);

    if (!user || user.role !== 'admin') {
      return errorResponse(res, 403, 'Solo administradores pueden gestionar etapas');
    }

    // GET: Listar etapas
    if (req.method === 'GET') {
      const result = await query(`
        SELECT 
          s.id, s.name, s.description, s.order_index,
          s.created_at, s.updated_at,
          COUNT(DISTINCT m.id) as modules_count
        FROM lms_stages s
        LEFT JOIN lms_modules m ON m.stage_id = s.id
        GROUP BY s.id, s.name, s.description, s.order_index, s.created_at, s.updated_at
        ORDER BY s.order_index
      `);
      
      return successResponse(res, { stages: result.rows });
    }

    // POST: Crear etapa
    if (req.method === 'POST') {
      const { name, description, orderIndex } = req.body;
      
      const validation = validateRequired(req.body, ['name', 'orderIndex']);
      if (!validation.valid) {
        return errorResponse(res, 400, 'Campos requeridos faltantes', { missing: validation.missing });
      }
      
      const result = await query(`
        INSERT INTO lms_stages (name, description, order_index)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [name, description || null, orderIndex]);
      
      return successResponse(res, { stage: result.rows[0] }, 201);
    }

    // PUT: Actualizar etapa
    if (req.method === 'PUT') {
      const { id, name, description, orderIndex } = req.body;
      
      if (!id || !isValidUUID(id)) {
        return errorResponse(res, 400, 'ID inválido');
      }
      
      const updates = [];
      const params = [id];
      let paramIndex = 2;
      
      if (name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        params.push(name);
      }
      
      if (description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        params.push(description);
      }
      
      if (orderIndex !== undefined) {
        updates.push(`order_index = $${paramIndex++}`);
        params.push(orderIndex);
      }
      
      if (updates.length === 0) {
        return errorResponse(res, 400, 'No hay campos para actualizar');
      }
      
      const result = await query(`
        UPDATE lms_stages SET ${updates.join(', ')} WHERE id = $1 RETURNING *
      `, params);
      
      if (result.rows.length === 0) {
        return errorResponse(res, 404, 'Etapa no encontrada');
      }
      
      return successResponse(res, { stage: result.rows[0] });
    }

    // DELETE: Eliminar etapa (solo si no tiene módulos)
    if (req.method === 'DELETE') {
      const { id } = req.query;
      
      if (!id || !isValidUUID(id)) {
        return errorResponse(res, 400, 'ID inválido');
      }
      
      // Verificar que no tenga módulos
      const modulesCheck = await query(
        'SELECT COUNT(*) as count FROM lms_modules WHERE stage_id = $1',
        [id]
      );
      
      if (parseInt(modulesCheck.rows[0].count) > 0) {
        return errorResponse(res, 400, 'No se puede eliminar una etapa con módulos asociados');
      }
      
      await query('DELETE FROM lms_stages WHERE id = $1', [id]);
      return successResponse(res, { message: 'Etapa eliminada' });
    }

    return errorResponse(res, 405, 'Método no permitido');

  } catch (error) {
    console.error('Error en /admin/stages:', error);
    return errorResponse(res, 500, 'Error interno del servidor', error.message);
  }
};
