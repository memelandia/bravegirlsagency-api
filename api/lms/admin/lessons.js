// ===================================================================
// /api/lms/admin/lessons
// CRUD de lecciones (admin/supervisor)
// ===================================================================

const { query } = require('../lib/db');
const { parseCookies, errorResponse, successResponse, validateRequired, isValidUUID, normalizeLoomUrl } = require('../lib/utils');
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

    // GET: Listar lecciones
    if (req.method === 'GET') {
      const { moduleId } = req.query;
      
      let sql = `
        SELECT 
          l.id, l.module_id, l.title, l.type, l.order_index, l.loom_url, l.text_content,
          l.created_at, l.updated_at,
          m.title as module_title
        FROM lms_lessons l
        JOIN lms_modules m ON m.id = l.module_id
        WHERE 1=1
      `;
      const params = [];
      
      if (moduleId) {
        params.push(moduleId);
        sql += ` AND l.module_id = $${params.length}`;
      }
      
      sql += ' ORDER BY l.order_index';
      
      const result = await query(sql, params);
      return successResponse(res, { lessons: result.rows });
    }

    // POST: Crear lección
    if (req.method === 'POST' && user.role === 'admin') {
      const { moduleId, title, type, orderIndex, loomUrl, textContent } = req.body;
      
      const validation = validateRequired(req.body, ['moduleId', 'title', 'type', 'orderIndex']);
      if (!validation.valid) {
        return errorResponse(res, 400, 'Campos requeridos faltantes', { missing: validation.missing });
      }
      
      if (!['video', 'text'].includes(type)) {
        return errorResponse(res, 400, 'Tipo debe ser "video" o "text"');
      }
      
      if (type === 'video' && !loomUrl) {
        return errorResponse(res, 400, 'loomUrl es requerido para lecciones de video');
      }
      
      if (type === 'text' && !textContent) {
        return errorResponse(res, 400, 'textContent es requerido para lecciones de texto');
      }
      
      const finalLoomUrl = type === 'video' ? normalizeLoomUrl(loomUrl) : null;
      
      const result = await query(`
        INSERT INTO lms_lessons (module_id, title, type, order_index, loom_url, text_content)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [moduleId, title, type, orderIndex, finalLoomUrl, type === 'text' ? textContent : null]);
      
      return successResponse(res, { lesson: result.rows[0] }, 201);
    }

    // PUT: Actualizar lección
    if (req.method === 'PUT' && user.role === 'admin') {
      const { id, title, type, orderIndex, loomUrl, textContent } = req.body;
      
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
      
      if (type !== undefined) {
        if (!['video', 'text'].includes(type)) {
          return errorResponse(res, 400, 'Tipo debe ser "video" o "text"');
        }
        updates.push(`type = $${paramIndex++}`);
        params.push(type);
      }
      
      if (orderIndex !== undefined) {
        updates.push(`order_index = $${paramIndex++}`);
        params.push(orderIndex);
      }
      
      if (loomUrl !== undefined) {
        updates.push(`loom_url = $${paramIndex++}`);
        params.push(normalizeLoomUrl(loomUrl));
      }
      
      if (textContent !== undefined) {
        updates.push(`text_content = $${paramIndex++}`);
        params.push(textContent);
      }
      
      if (updates.length === 0) {
        return errorResponse(res, 400, 'No hay campos para actualizar');
      }
      
      const result = await query(`
        UPDATE lms_lessons SET ${updates.join(', ')} WHERE id = $1 RETURNING *
      `, params);
      
      if (result.rows.length === 0) {
        return errorResponse(res, 404, 'Lección no encontrada');
      }
      
      return successResponse(res, { lesson: result.rows[0] });
    }

    // DELETE: Eliminar lección
    if (req.method === 'DELETE' && user.role === 'admin') {
      const { id } = req.query;
      
      if (!id || !isValidUUID(id)) {
        return errorResponse(res, 400, 'ID inválido');
      }
      
      await query('DELETE FROM lms_lessons WHERE id = $1', [id]);
      return successResponse(res, { message: 'Lección eliminada' });
    }

    return errorResponse(res, 405, 'Método no permitido');

  } catch (error) {
    console.error('Error en /admin/lessons:', error);
    return errorResponse(res, 500, 'Error interno del servidor', error.message);
  }
};
