// ===================================================================
// /api/lms/admin/questions
// CRUD de preguntas de quiz (admin/supervisor)
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

    // GET: Listar preguntas
    if (req.method === 'GET') {
      const { quizId, moduleId } = req.query;
      
      let sql = `
        SELECT 
          q.id, q.quiz_id, q.prompt, q.options, q.correct_option_index, q.order_index,
          q.created_at, q.updated_at,
          qz.module_id,
          m.title as module_title
        FROM lms_questions q
        JOIN lms_quizzes qz ON qz.id = q.quiz_id
        JOIN lms_modules m ON m.id = qz.module_id
        WHERE 1=1
      `;
      const params = [];
      
      if (quizId) {
        params.push(quizId);
        sql += ` AND q.quiz_id = $${params.length}`;
      }
      
      if (moduleId) {
        params.push(moduleId);
        sql += ` AND qz.module_id = $${params.length}`;
      }
      
      sql += ' ORDER BY q.order_index';
      
      const result = await query(sql, params);
      return successResponse(res, { questions: result.rows });
    }

    // POST: Crear pregunta
    if (req.method === 'POST' && user.role === 'admin') {
      const { quizId, prompt, options, correctOptionIndex, orderIndex } = req.body;
      
      const validation = validateRequired(req.body, ['quizId', 'prompt', 'options', 'correctOptionIndex', 'orderIndex']);
      if (!validation.valid) {
        return errorResponse(res, 400, 'Campos requeridos faltantes', { missing: validation.missing });
      }
      
      if (!Array.isArray(options) || options.length < 2) {
        return errorResponse(res, 400, 'Debe haber al menos 2 opciones');
      }
      
      if (correctOptionIndex < 0 || correctOptionIndex >= options.length) {
        return errorResponse(res, 400, 'correctOptionIndex fuera de rango');
      }
      
      const result = await query(`
        INSERT INTO lms_questions (quiz_id, prompt, options, correct_option_index, order_index)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [quizId, prompt, JSON.stringify(options), correctOptionIndex, orderIndex]);
      
      return successResponse(res, { question: result.rows[0] }, 201);
    }

    // PUT: Actualizar pregunta
    if (req.method === 'PUT' && user.role === 'admin') {
      const { id, prompt, options, correctOptionIndex, orderIndex } = req.body;
      
      if (!id || !isValidUUID(id)) {
        return errorResponse(res, 400, 'ID inválido');
      }
      
      const updates = [];
      const params = [id];
      let paramIndex = 2;
      
      if (prompt !== undefined) {
        updates.push(`prompt = $${paramIndex++}`);
        params.push(prompt);
      }
      
      if (options !== undefined) {
        if (!Array.isArray(options) || options.length < 2) {
          return errorResponse(res, 400, 'Debe haber al menos 2 opciones');
        }
        updates.push(`options = $${paramIndex++}`);
        params.push(JSON.stringify(options));
      }
      
      if (correctOptionIndex !== undefined) {
        updates.push(`correct_option_index = $${paramIndex++}`);
        params.push(correctOptionIndex);
      }
      
      if (orderIndex !== undefined) {
        updates.push(`order_index = $${paramIndex++}`);
        params.push(orderIndex);
      }
      
      if (updates.length === 0) {
        return errorResponse(res, 400, 'No hay campos para actualizar');
      }
      
      const result = await query(`
        UPDATE lms_questions SET ${updates.join(', ')} WHERE id = $1 RETURNING *
      `, params);
      
      if (result.rows.length === 0) {
        return errorResponse(res, 404, 'Pregunta no encontrada');
      }
      
      return successResponse(res, { question: result.rows[0] });
    }

    // DELETE: Eliminar pregunta
    if (req.method === 'DELETE' && user.role === 'admin') {
      const { id } = req.query;
      
      if (!id || !isValidUUID(id)) {
        return errorResponse(res, 400, 'ID inválido');
      }
      
      await query('DELETE FROM lms_questions WHERE id = $1', [id]);
      return successResponse(res, { message: 'Pregunta eliminada' });
    }

    return errorResponse(res, 405, 'Método no permitido');

  } catch (error) {
    console.error('Error en /admin/questions:', error);
    return errorResponse(res, 500, 'Error interno del servidor', error.message);
  }
};
