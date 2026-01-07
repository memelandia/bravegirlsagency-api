// ===================================================================
// GET /api/lms/quiz/[moduleId]
// Obtener preguntas del quiz de un módulo
// ===================================================================

const { query } = require('../lib/db');
const { parseCookies, errorResponse, successResponse, isValidUUID } = require('../lib/utils');
const { validateSession } = require('../lib/auth');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return errorResponse(res, 405, 'Método no permitido');
  }

  try {
    // Parsear cookies y validar sesión
    req.cookies = parseCookies(req);
    const user = await validateSession(req);

    if (!user) {
      return errorResponse(res, 401, 'No autorizado');
    }

    // Obtener module ID de la URL
    const moduleId = req.query.moduleId || req.url.split('/').filter(Boolean).pop().split('?')[0];

    if (!isValidUUID(moduleId)) {
      return errorResponse(res, 400, 'ID de módulo inválido');
    }

    // Verificar que el usuario puede acceder al módulo
    const canAccessResult = await query(
      'SELECT lms_can_access_module($1, $2) as can_access',
      [user.id, moduleId]
    );

    const canAccess = canAccessResult.rows[0]?.can_access;

    if (!canAccess && user.role === 'chatter') {
      return errorResponse(res, 403, 'No tienes acceso a este módulo aún.');
    }

    // Verificar que todas las lecciones estén completadas
    const lessonsProgressResult = await query(`
      SELECT 
        COUNT(DISTINCT l.id) as total_lessons,
        COUNT(DISTINCT pl.lesson_id) as completed_lessons
      FROM lms_lessons l
      LEFT JOIN lms_progress_lessons pl ON pl.lesson_id = l.id AND pl.user_id = $1
      WHERE l.module_id = $2
    `, [user.id, moduleId]);

    const lessonsProgress = lessonsProgressResult.rows[0];
    const allLessonsCompleted = parseInt(lessonsProgress.total_lessons) === parseInt(lessonsProgress.completed_lessons);

    if (!allLessonsCompleted && user.role === 'chatter') {
      return errorResponse(res, 403, 'Debes completar todas las lecciones antes de tomar el quiz.');
    }

    // Obtener quiz del módulo
    const quizResult = await query(`
      SELECT 
        q.id,
        q.module_id,
        q.passing_score,
        q.max_attempts,
        q.cooldown_minutes,
        COUNT(qa.id) as user_attempts,
        MAX(qa.created_at) as last_attempt
      FROM lms_quizzes q
      LEFT JOIN lms_quiz_attempts qa ON qa.quiz_id = q.id AND qa.user_id = $1
      WHERE q.module_id = $2
      GROUP BY q.id, q.module_id, q.passing_score, q.max_attempts, q.cooldown_minutes
    `, [user.id, moduleId]);

    if (quizResult.rows.length === 0) {
      return errorResponse(res, 404, 'Quiz no encontrado para este módulo');
    }

    const quiz = quizResult.rows[0];

    // Verificar cooldown
    if (quiz.last_attempt && quiz.cooldown_minutes > 0) {
      const lastAttemptTime = new Date(quiz.last_attempt).getTime();
      const cooldownMs = quiz.cooldown_minutes * 60 * 1000;
      const elapsedMs = Date.now() - lastAttemptTime;
      
      if (elapsedMs < cooldownMs) {
        const minutesRemaining = Math.ceil((cooldownMs - elapsedMs) / 60000);
        return errorResponse(res, 429, `Debes esperar ${minutesRemaining} minutos antes de intentar de nuevo.`);
      }
    }

    // Verificar max attempts
    const userAttempts = parseInt(quiz.user_attempts) || 0;
    if (userAttempts >= quiz.max_attempts && user.role === 'chatter') {
      return errorResponse(res, 403, 'Has alcanzado el máximo de intentos permitidos para este quiz.');
    }

    // Obtener preguntas del quiz (sin mostrar la respuesta correcta)
    const questionsResult = await query(`
      SELECT 
        id,
        prompt,
        options,
        order_index
      FROM lms_questions
      WHERE quiz_id = $1
      ORDER BY order_index
    `, [quiz.id]);

    if (questionsResult.rows.length === 0) {
      return errorResponse(res, 404, 'Este quiz no tiene preguntas configuradas aún. Contacta al administrador.');
    }

    const questions = questionsResult.rows.map(q => ({
      id: q.id,
      prompt: q.prompt,
      options: q.options, // Array de strings
      order: q.order_index
    }));

    return successResponse(res, {
      quiz: {
        id: quiz.id,
        moduleId: quiz.module_id,
        passingScore: quiz.passing_score,
        maxAttempts: quiz.max_attempts,
        userAttempts,
        attemptsRemaining: quiz.max_attempts - userAttempts
      },
      questions
    });

  } catch (error) {
    console.error('Error en /quiz/[moduleId]:', error);
    return errorResponse(res, 500, 'Error interno del servidor', error.message);
  }
};
