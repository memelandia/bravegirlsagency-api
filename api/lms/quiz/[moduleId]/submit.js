// ===================================================================
// POST /api/lms/quiz/[moduleId]/submit
// Enviar respuestas del quiz y calcular calificación
// ===================================================================

const { query, transaction } = require('../../lib/db');
const { parseCookies, errorResponse, successResponse, isValidUUID, validateRequired } = require('../../lib/utils');
const { validateSession } = require('../../lib/auth');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
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
    const urlParts = req.url.split('/').filter(Boolean);
    const moduleId = urlParts[urlParts.indexOf('quiz') + 1]?.split('?')[0];

    if (!isValidUUID(moduleId)) {
      return errorResponse(res, 400, 'ID de módulo inválido');
    }

    const { answers } = req.body;

    // Validar campos requeridos
    const validation = validateRequired(req.body, ['answers']);
    if (!validation.valid) {
      return errorResponse(res, 400, 'Debes proporcionar las respuestas', { missing: validation.missing });
    }

    if (typeof answers !== 'object' || Object.keys(answers).length === 0) {
      return errorResponse(res, 400, 'Las respuestas deben ser un objeto con questionId: selectedOptionIndex');
    }

    // Usar transacción para garantizar consistencia
    const result = await transaction(async (client) => {
      // Verificar que el usuario puede acceder al módulo
      const canAccessResult = await client.query(
        'SELECT lms_can_access_module($1, $2) as can_access',
        [user.id, moduleId]
      );

      const canAccess = canAccessResult.rows[0]?.can_access;

      if (!canAccess && user.role === 'chatter') {
        throw new Error('NO_ACCESS');
      }

      // Verificar que todas las lecciones estén completadas
      const lessonsProgressResult = await client.query(`
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
        throw new Error('LESSONS_NOT_COMPLETED');
      }

      // Obtener quiz del módulo
      const quizResult = await client.query(`
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
        throw new Error('QUIZ_NOT_FOUND');
      }

      const quiz = quizResult.rows[0];

      // Verificar cooldown
      if (quiz.last_attempt && quiz.cooldown_minutes > 0) {
        const lastAttemptTime = new Date(quiz.last_attempt).getTime();
        const cooldownMs = quiz.cooldown_minutes * 60 * 1000;
        const elapsedMs = Date.now() - lastAttemptTime;
        
        if (elapsedMs < cooldownMs && user.role === 'chatter') {
          const minutesRemaining = Math.ceil((cooldownMs - elapsedMs) / 60000);
          throw new Error(`COOLDOWN:${minutesRemaining}`);
        }
      }

      // Verificar max attempts
      const userAttempts = parseInt(quiz.user_attempts) || 0;
      if (userAttempts >= quiz.max_attempts && user.role === 'chatter') {
        throw new Error('MAX_ATTEMPTS_REACHED');
      }

      // Obtener preguntas con respuestas correctas
      const questionsResult = await client.query(`
        SELECT 
          id,
          prompt,
          correct_option_index,
          order_index
        FROM lms_questions
        WHERE quiz_id = $1
        ORDER BY order_index
      `, [quiz.id]);

      if (questionsResult.rows.length === 0) {
        throw new Error('NO_QUESTIONS');
      }

      const questions = questionsResult.rows;
      
      // Calcular score
      let correctAnswers = 0;
      const detailedResults = [];

      for (const question of questions) {
        const userAnswer = answers[question.id];
        const isCorrect = userAnswer !== undefined && parseInt(userAnswer) === question.correct_option_index;
        
        if (isCorrect) {
          correctAnswers++;
        }

        detailedResults.push({
          questionId: question.id,
          userAnswer: userAnswer !== undefined ? parseInt(userAnswer) : null,
          correctAnswer: question.correct_option_index,
          isCorrect
        });
      }

      const score = Math.round((correctAnswers / questions.length) * 100);
      const passed = score >= quiz.passing_score;

      // Guardar intento
      await client.query(`
        INSERT INTO lms_quiz_attempts (user_id, quiz_id, score, passed, answers)
        VALUES ($1, $2, $3, $4, $5)
      `, [user.id, quiz.id, score, passed, JSON.stringify(answers)]);

      return {
        score,
        passed,
        passingScore: quiz.passing_score,
        correctAnswers,
        totalQuestions: questions.length,
        attemptsUsed: userAttempts + 1,
        maxAttempts: quiz.max_attempts,
        detailedResults
      };
    });

    return successResponse(res, result);

  } catch (error) {
    console.error('Error en /quiz/[moduleId]/submit:', error);

    // Manejar errores específicos
    if (error.message === 'NO_ACCESS') {
      return errorResponse(res, 403, 'No tienes acceso a este módulo aún.');
    }
    if (error.message === 'LESSONS_NOT_COMPLETED') {
      return errorResponse(res, 403, 'Debes completar todas las lecciones antes de tomar el quiz.');
    }
    if (error.message === 'QUIZ_NOT_FOUND') {
      return errorResponse(res, 404, 'Quiz no encontrado para este módulo.');
    }
    if (error.message.startsWith('COOLDOWN:')) {
      const minutes = error.message.split(':')[1];
      return errorResponse(res, 429, `Debes esperar ${minutes} minutos antes de intentar de nuevo.`);
    }
    if (error.message === 'MAX_ATTEMPTS_REACHED') {
      return errorResponse(res, 403, 'Has alcanzado el máximo de intentos permitidos para este quiz.');
    }
    if (error.message === 'NO_QUESTIONS') {
      return errorResponse(res, 404, 'Este quiz no tiene preguntas configuradas aún. Contacta al administrador.');
    }

    return errorResponse(res, 500, 'Error interno del servidor', error.message);
  }
};
