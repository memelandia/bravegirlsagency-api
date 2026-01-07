// ===================================================================
// /api/lms/admin/modules
// CRUD de módulos (admin/supervisor)
// ===================================================================

const { query } = require('../lib/db');
const { parseCookies, errorResponse, successResponse, validateRequired, isValidUUID } = require('../lib/utils');
const { validateSession } = require('../lib/auth');

module.exports = async (req, res) => {
  // CORS headers
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

    if (!user || !['admin', 'supervisor'].includes(user.role)) {
      return errorResponse(res, 403, 'Acceso denegado');
    }

    // GET: Listar módulos
    if (req.method === 'GET') {
      const { stageId } = req.query;
      
      let sql = `
        SELECT 
          m.id, m.stage_id, m.title, m.description, m.order_index, m.published, m.created_at, m.updated_at,
          s.name as stage_name,
          (SELECT COUNT(*) FROM lms_lessons WHERE module_id = m.id) as lessons_count,
          (SELECT COUNT(*) FROM lms_quizzes WHERE module_id = m.id) as has_quiz
        FROM lms_modules m
        JOIN lms_stages s ON s.id = m.stage_id
        WHERE 1=1
      `;
      const params = [];
      
      if (stageId) {
        params.push(stageId);
        sql += ` AND m.stage_id = $${params.length}`;
      }
      
      sql += ' ORDER BY m.order_index';
      
      const result = await query(sql, params);
      return successResponse(res, { modules: result.rows });
    }

    // POST: Crear módulo
    if (req.method === 'POST' && user.role === 'admin') {
      const { stageId, title, description, orderIndex, published } = req.body;
      
      const validation = validateRequired(req.body, ['stageId', 'title', 'orderIndex']);
      if (!validation.valid) {
        return errorResponse(res, 400, 'Campos requeridos faltantes', { missing: validation.missing });
      }
      
      const result = await query(`
        INSERT INTO lms_modules (stage_id, title, description, order_index, published)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [stageId, title, description || null, orderIndex, published !== false]);
      
      return successResponse(res, { module: result.rows[0] }, 201);
    }

    // PUT: Actualizar módulo
    if (req.method === 'PUT' && user.role === 'admin') {
      const { id, title, description, orderIndex, published } = req.body;
      
      if (!id || !isValidUUID(id)) {
        return errorResponse(res, 400, 'ID inválido');
      }
      
      const updates = [];
      const params = [id];
      let paramIndex = 2;
      
      if (title !== undefined) {
        updates.push(`title = $${paramIndex++}`);
        params.push(title);
      }
      
      if (description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        params.push(description);
      }
      
      if (orderIndex !== undefined) {
        updates.push(`order_index = $${paramIndex++}`);
        params.push(orderIndex);
      }
      
      if (published !== undefined) {
        updates.push(`published = $${paramIndex++}`);
        params.push(published);
      }
      
      if (updates.length === 0) {
        return errorResponse(res, 400, 'No hay campos para actualizar');
      }
      
      const result = await query(`
        UPDATE lms_modules SET ${updates.join(', ')} WHERE id = $1 RETURNING *
      `, params);
      
      if (result.rows.length === 0) {
        return errorResponse(res, 404, 'Módulo no encontrado');
      }
      
      return successResponse(res, { module: result.rows[0] });
    }

    // DELETE: Eliminar módulo
    if (req.method === 'DELETE' && user.role === 'admin') {
      const { id } = req.query;
      
      if (!id || !isValidUUID(id)) {
        return errorResponse(res, 400, 'ID inválido');
      }
      
      await query('DELETE FROM lms_modules WHERE id = $1', [id]);
      return successResponse(res, { message: 'Módulo eliminado' });
    }

    return errorResponse(res, 405, 'Método no permitido');

  } catch (error) {
    console.error('Error en /admin/modules:', error);
    return errorResponse(res, 500, 'Error interno del servidor', error.message);
  }
};
