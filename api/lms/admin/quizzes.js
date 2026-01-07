// ===================================================================
// /api/lms/admin/quizzes
// CRUD de quizzes (admin/supervisor)
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

    if (!user || !['admin', 'supervisor'].includes(user.role)) {
      return errorResponse(res, 403, 'Acceso denegado');
    }

    // GET: Listar quizzes
    if (req.method === 'GET') {
      const { moduleId } = req.query;
      
      let sql = `
        SELECT 
          q.id, q.module_id, q.passing_score, q.max_attempts, q.cooldown_minutes,
          q.created_at, q.updated_at,
          m.title as module_title,
          s.name as stage_name,
          COUNT(DISTINCT qst.id) as questions_count
        FROM lms_quizzes q
        JOIN lms_modules m ON m.id = q.module_id
        JOIN lms_stages s ON s.id = m.stage_id
        LEFT JOIN lms_questions qst ON qst.quiz_id = q.id
        WHERE 1=1
      `;
      const params = [];
      
      if (moduleId) {
        params.push(moduleId);
        sql += ` AND q.module_id = $${params.length}`;
      }
      
      sql += ' GROUP BY q.id, q.module_id, q.passing_score, q.max_attempts, q.cooldown_minutes, q.created_at, q.updated_at, m.title, s.name ORDER BY m.order_index';
      
      const result = await query(sql, params);
      return successResponse(res, { quizzes: result.rows });
    }

    // POST: Crear quiz
    if (req.method === 'POST' && user.role === 'admin') {
      const { moduleId, passingScore, maxAttempts, cooldownMinutes } = req.body;
      
      const validation = validateRequired(req.body, ['moduleId']);
      if (!validation.valid) {
        return errorResponse(res, 400, 'Campos requeridos faltantes', { missing: validation.missing });
      }
      
      // Verificar que no exista quiz para este módulo
      const existingQuiz = await query(
        'SELECT id FROM lms_quizzes WHERE module_id = $1',
        [moduleId]
      );
      
      if (existingQuiz.rows.length > 0) {
        return errorResponse(res, 400, 'Este módulo ya tiene un quiz configurado');
      }
      
      const result = await query(`
        INSERT INTO lms_quizzes (module_id, passing_score, max_attempts, cooldown_minutes)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [
        moduleId,
        passingScore || 80,
        maxAttempts || 3,
        cooldownMinutes || 60
      ]);
      
      return successResponse(res, { quiz: result.rows[0] }, 201);
    }

    // PUT: Actualizar quiz
    if (req.method === 'PUT' && user.role === 'admin') {
      const { id, passingScore, maxAttempts, cooldownMinutes } = req.body;
      
      if (!id || !isValidUUID(id)) {
        return errorResponse(res, 400, 'ID inválido');
      }
      
      const updates = [];
      const params = [id];
      let paramIndex = 2;
      
      if (passingScore !== undefined) {
        if (passingScore < 0 || passingScore > 100) {
          return errorResponse(res, 400, 'Passing score debe estar entre 0 y 100');
        }
        updates.push(`passing_score = $${paramIndex++}`);
        params.push(passingScore);
      }
      
      if (maxAttempts !== undefined) {
        if (maxAttempts < 1) {
          return errorResponse(res, 400, 'Max attempts debe ser al menos 1');
        }
        updates.push(`max_attempts = $${paramIndex++}`);
        params.push(maxAttempts);
      }
      
      if (cooldownMinutes !== undefined) {
        if (cooldownMinutes < 0) {
          return errorResponse(res, 400, 'Cooldown no puede ser negativo');
        }
        updates.push(`cooldown_minutes = $${paramIndex++}`);
        params.push(cooldownMinutes);
      }
      
      if (updates.length === 0) {
        return errorResponse(res, 400, 'No hay campos para actualizar');
      }
      
      const result = await query(`
        UPDATE lms_quizzes SET ${updates.join(', ')} WHERE id = $1 RETURNING *
      `, params);
      
      if (result.rows.length === 0) {
        return errorResponse(res, 404, 'Quiz no encontrado');
      }
      
      return successResponse(res, { quiz: result.rows[0] });
    }

    // DELETE: Eliminar quiz (también elimina preguntas por CASCADE)
    if (req.method === 'DELETE' && user.role === 'admin') {
      const { id } = req.query;
      
      if (!id || !isValidUUID(id)) {
        return errorResponse(res, 400, 'ID inválido');
      }
      
      await query('DELETE FROM lms_quizzes WHERE id = $1', [id]);
      return successResponse(res, { message: 'Quiz eliminado (y sus preguntas)' });
    }

    return errorResponse(res, 405, 'Método no permitido');

  } catch (error) {
    console.error('Error en /admin/quizzes:', error);
    return errorResponse(res, 500, 'Error interno del servidor', error.message);
  }
};
