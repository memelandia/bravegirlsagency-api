// ===================================================================
// GET /api/lms/module/[id]
// Obtener detalles de un módulo específico con sus lecciones
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
    const moduleId = req.query.id || req.url.split('/').pop().split('?')[0];

    if (!isValidUUID(moduleId)) {
      return errorResponse(res, 400, 'ID de módulo inválido');
    }

    // Verificar que el usuario puede acceder al módulo (server-side gating)
    const canAccessResult = await query(
      'SELECT lms_can_access_module($1, $2) as can_access',
      [user.id, moduleId]
    );

    const canAccess = canAccessResult.rows[0]?.can_access;

    if (!canAccess && user.role === 'chatter') {
      return errorResponse(res, 403, 'No tienes acceso a este módulo aún. Completa los módulos anteriores.');
    }

    // Obtener información del módulo
    const moduleResult = await query(`
      SELECT 
        m.id,
        m.title,
        m.description,
        m.order_index,
        s.id as stage_id,
        s.name as stage_name,
        s.order_index as stage_order
      FROM lms_modules m
      JOIN lms_stages s ON s.id = m.stage_id
      WHERE m.id = $1 AND m.published = true
    `, [moduleId]);

    if (moduleResult.rows.length === 0) {
      return errorResponse(res, 404, 'Módulo no encontrado');
    }

    const module = moduleResult.rows[0];

    // Obtener lecciones del módulo
    const lessonsResult = await query(`
      SELECT 
        l.id,
        l.title,
        l.type,
        l.order_index,
        l.loom_url,
        l.text_content,
        EXISTS(
          SELECT 1 FROM lms_progress_lessons 
          WHERE lesson_id = l.id AND user_id = $1
        ) as completed
      FROM lms_lessons l
      WHERE l.module_id = $2
      ORDER BY l.order_index
    `, [user.id, moduleId]);

    const lessons = lessonsResult.rows.map(lesson => ({
      id: lesson.id,
      title: lesson.title,
      type: lesson.type,
      order: lesson.order_index,
      completed: lesson.completed,
      content: lesson.type === 'video' 
        ? { loomUrl: lesson.loom_url }
        : { textContent: lesson.text_content }
    }));

    // Obtener información del quiz
    const quizResult = await query(`
      SELECT 
        q.id,
        q.passing_score,
        q.max_attempts,
        q.cooldown_minutes,
        COUNT(DISTINCT qst.id) as total_questions,
        COUNT(qa.id) as user_attempts,
        MAX(qa.score) as best_score,
        MAX(qa.passed) as passed,
        MAX(qa.created_at) as last_attempt
      FROM lms_quizzes q
      LEFT JOIN lms_questions qst ON qst.quiz_id = q.id
      LEFT JOIN lms_quiz_attempts qa ON qa.quiz_id = q.id AND qa.user_id = $1
      WHERE q.module_id = $2
      GROUP BY q.id, q.passing_score, q.max_attempts, q.cooldown_minutes
    `, [user.id, moduleId]);

    let quiz = null;
    if (quizResult.rows.length > 0) {
      const quizData = quizResult.rows[0];
      const totalQuestions = parseInt(quizData.total_questions);
      
      // Verificar cooldown
      let canAttempt = true;
      let cooldownRemaining = 0;
      
      if (quizData.last_attempt && quizData.cooldown_minutes > 0) {
        const lastAttemptTime = new Date(quizData.last_attempt).getTime();
        const cooldownMs = quizData.cooldown_minutes * 60 * 1000;
        const elapsedMs = Date.now() - lastAttemptTime;
        
        if (elapsedMs < cooldownMs) {
          canAttempt = false;
          cooldownRemaining = Math.ceil((cooldownMs - elapsedMs) / 60000); // minutos
        }
      }

      quiz = {
        id: quizData.id,
        passingScore: quizData.passing_score,
        maxAttempts: quizData.max_attempts,
        cooldownMinutes: quizData.cooldown_minutes,
        totalQuestions,
        hasQuestions: totalQuestions > 0,
        userAttempts: parseInt(quizData.user_attempts) || 0,
        bestScore: quizData.best_score || 0,
        passed: quizData.passed || false,
        lastAttempt: quizData.last_attempt,
        canAttempt: canAttempt && parseInt(quizData.user_attempts || 0) < quizData.max_attempts,
        cooldownRemaining,
        attemptsRemaining: quizData.max_attempts - parseInt(quizData.user_attempts || 0)
      };
    }

    // Calcular si todas las lecciones están completadas
    const allLessonsCompleted = lessons.length > 0 && lessons.every(l => l.completed);

    return successResponse(res, {
      module: {
        id: module.id,
        title: module.title,
        description: module.description,
        order: module.order_index,
        stage: {
          id: module.stage_id,
          name: module.stage_name,
          order: module.stage_order
        }
      },
      lessons,
      quiz,
      allLessonsCompleted,
      canTakeQuiz: allLessonsCompleted && quiz && quiz.hasQuestions && quiz.canAttempt
    });

  } catch (error) {
    console.error('Error en /module/[id]:', error);
    return errorResponse(res, 500, 'Error interno del servidor', error.message);
  }
};
