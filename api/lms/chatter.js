// ===================================================================
// /api/lms/chatter
// Endpoint consolidado para operaciones de chatters
// Rutas: 
//   GET /campus - lista de módulos y progreso
//   GET /module/:id - detalles de módulo
//   POST /lesson/complete - marcar lección completada
//   GET /quiz/:moduleId - obtener preguntas de quiz
//   POST /quiz/:moduleId/submit - enviar respuestas de quiz
// ===================================================================

const { query, transaction } = require('../../lib/lms/db');
const { parseCookies, errorResponse, successResponse, validateRequired, isValidUUID, getModuleStatus } = require('../../lib/lms/utils');
const { validateSession } = require('../../lib/lms/auth');

module.exports = async (req, res) => {
  // CORS headers - permitir ambos dominios
  const allowedOrigins = [
    'https://www.bravegirlsagency.com', 
    'https://bravegirlsagency.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ];
  const origin = req.headers.origin;
  
  // Siempre enviar headers CORS
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Parsear cookies
  req.cookies = parseCookies(req);

  try {
    // Parsear cookies y validar sesión
    req.cookies = parseCookies(req);
    const user = await validateSession(req);

    if (!user) {
      return errorResponse(res, 401, 'No autorizado');
    }

    // Analizar la URL para determinar la ruta
    const url = req.url.split('?')[0];
    const parts = url.split('/').filter(Boolean);
    
    // Determinar la acción basándose en el path
    if (url.includes('/campus')) {
      return await handleCampus(req, res, user);
    } else if (url.includes('/module/')) {
      return await handleModule(req, res, user);
    } else if (url.includes('/lesson/complete')) {
      return await handleLessonComplete(req, res, user);
    } else if (url.includes('/quiz/') && url.includes('/submit')) {
      return await handleQuizSubmit(req, res, user);
    } else if (url.includes('/quiz/')) {
      return await handleQuiz(req, res, user);
    } else {
      return errorResponse(res, 404, 'Ruta no encontrada');
    }
  } catch (error) {
    console.error('Error en /api/lms/chatter:', error);
    return errorResponse(res, 500, 'Error interno del servidor', { error: error.message });
  }
};

// ===================================================================
// GET /campus - Lista de módulos y progreso
// ===================================================================
async function handleCampus(req, res, user) {
  if (req.method !== 'GET') {
    return errorResponse(res, 405, 'Método no permitido');
  }

  // Obtener todas las etapas con sus módulos
  const stagesResult = await query(`
    SELECT 
      s.id as stage_id,
      s.name as stage_name,
      s.description as stage_description,
      s.order_index as stage_order,
      m.id as module_id,
      m.title as module_title,
      m.description as module_description,
      m.order_index as module_order,
      m.published
    FROM lms_stages s
    LEFT JOIN lms_modules m ON m.stage_id = s.id AND m.published = true
    ORDER BY s.order_index, m.order_index
  `);

  // Obtener progreso de lecciones del usuario
  const progressResult = await query(`
    SELECT 
      l.module_id,
      COUNT(DISTINCT l.id) as total_lessons,
      COUNT(DISTINCT pl.lesson_id) as completed_lessons
    FROM lms_lessons l
    LEFT JOIN lms_progress_lessons pl ON pl.lesson_id = l.id AND pl.user_id = $1
    GROUP BY l.module_id
  `, [user.id]);

  // Obtener resultados de quizzes
  const quizzesResult = await query(`
    SELECT 
      q.module_id,
      q.id as quiz_id,
      MAX(qa.passed) as passed,
      MAX(qa.score) as best_score,
      COUNT(qa.id) as attempts,
      MAX(qa.created_at) as last_attempt,
      EXISTS(
        SELECT 1 FROM lms_questions WHERE quiz_id = q.id
      ) as has_questions
    FROM lms_quizzes q
    LEFT JOIN lms_quiz_attempts qa ON qa.quiz_id = q.id AND qa.user_id = $1
    GROUP BY q.id, q.module_id
  `, [user.id]);

  // Crear mapas de progreso
  const progressMap = {};
  progressResult.rows.forEach(row => {
    progressMap[row.module_id] = {
      totalLessons: parseInt(row.total_lessons),
      completedLessons: parseInt(row.completed_lessons)
    };
  });

  const quizMap = {};
  quizzesResult.rows.forEach(row => {
    quizMap[row.module_id] = {
      quizId: row.quiz_id,
      passed: row.passed || false,
      bestScore: row.best_score || 0,
      attempts: parseInt(row.attempts) || 0,
      lastAttempt: row.last_attempt,
      hasQuestions: row.has_questions
    };
  });

  // Agrupar por etapas
  const stagesMap = {};
  stagesResult.rows.forEach(row => {
    if (!stagesMap[row.stage_id]) {
      stagesMap[row.stage_id] = {
        id: row.stage_id,
        name: row.stage_name,
        description: row.stage_description,
        order: row.stage_order,
        modules: []
      };
    }

    if (row.module_id) {
      const progress = progressMap[row.module_id] || { totalLessons: 0, completedLessons: 0 };
      const quiz = quizMap[row.module_id] || { passed: false, attempts: 0, hasQuestions: false };

      const status = getModuleStatus(progress, quiz);

      // Determinar si está desbloqueado
      const moduleOrder = row.module_order;
      let unlocked = false;

      if (user.role === 'admin' || user.role === 'supervisor') {
        unlocked = true;
      } else if (moduleOrder === 0) {
        unlocked = true;
      } else {
        const prevModule = stagesResult.rows.find(m => m.module_order === moduleOrder - 1);
        if (prevModule) {
          const prevQuiz = quizMap[prevModule.module_id] || {};
          unlocked = prevQuiz.passed === true;
        }
      }

      stagesMap[row.stage_id].modules.push({
        id: row.module_id,
        title: row.module_title,
        description: row.module_description,
        order: row.module_order,
        status,
        unlocked,
        progress: {
          totalLessons: progress.totalLessons,
          completedLessons: progress.completedLessons,
          percentage: progress.totalLessons > 0 
            ? Math.floor((progress.completedLessons / progress.totalLessons) * 100) 
            : 0
        },
        quiz: {
          passed: quiz.passed,
          bestScore: quiz.bestScore,
          attempts: quiz.attempts,
          hasQuestions: quiz.hasQuestions
        }
      });
    }
  });

  const stages = Object.values(stagesMap);

  return successResponse(res, { 
    stages,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
}

// ===================================================================
// GET /module/:id - Detalles de módulo
// ===================================================================
async function handleModule(req, res, user) {
  if (req.method !== 'GET') {
    return errorResponse(res, 405, 'Método no permitido');
  }

  // Extraer moduleId de la URL
  const parts = req.url.split('/');
  const moduleIndex = parts.indexOf('module');
  const moduleId = parts[moduleIndex + 1]?.split('?')[0];

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

  // Obtener info del quiz
  const quizResult = await query(`
    SELECT 
      q.id,
      q.passing_score,
      q.max_attempts,
      COUNT(DISTINCT qst.id) as questions_count,
      MAX(qa.passed) as user_passed,
      MAX(qa.score) as user_best_score,
      COUNT(DISTINCT qa.id) as user_attempts
    FROM lms_quizzes q
    LEFT JOIN lms_questions qst ON qst.quiz_id = q.id
    LEFT JOIN lms_quiz_attempts qa ON qa.quiz_id = q.id AND qa.user_id = $1
    WHERE q.module_id = $2
    GROUP BY q.id, q.passing_score, q.max_attempts
  `, [user.id, moduleId]);

  const quiz = quizResult.rows.length > 0 ? {
    id: quizResult.rows[0].id,
    passingScore: quizResult.rows[0].passing_score,
    maxAttempts: quizResult.rows[0].max_attempts,
    questionsCount: parseInt(quizResult.rows[0].questions_count),
    userPassed: quizResult.rows[0].user_passed || false,
    userBestScore: quizResult.rows[0].user_best_score || 0,
    userAttempts: parseInt(quizResult.rows[0].user_attempts) || 0
  } : null;

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
    quiz
  });
}

// ===================================================================
// POST /lesson/complete - Marcar lección completada
// ===================================================================
async function handleLessonComplete(req, res, user) {
  if (req.method !== 'POST') {
    return errorResponse(res, 405, 'Método no permitido');
  }

  const { lessonId } = req.body;

  // Validar campos requeridos
  const validation = validateRequired(req.body, ['lessonId']);
  if (!validation.valid) {
    return errorResponse(res, 400, 'Campos requeridos faltantes', { missing: validation.missing });
  }

  if (!isValidUUID(lessonId)) {
    return errorResponse(res, 400, 'ID de lección inválido');
  }

  // Verificar que la lección existe
  const lessonResult = await query(
    'SELECT id, module_id FROM lms_lessons WHERE id = $1',
    [lessonId]
  );

  if (lessonResult.rows.length === 0) {
    return errorResponse(res, 404, 'Lección no encontrada');
  }

  const lesson = lessonResult.rows[0];

  // Verificar que el usuario puede acceder al módulo de esta lección
  const canAccessResult = await query(
    'SELECT lms_can_access_module($1, $2) as can_access',
    [user.id, lesson.module_id]
  );

  const canAccess = canAccessResult.rows[0]?.can_access;

  if (!canAccess && user.role === 'chatter') {
    return errorResponse(res, 403, 'No tienes acceso a este módulo aún.');
  }

  // Marcar lección como completada (INSERT ... ON CONFLICT DO NOTHING)
  await query(`
    INSERT INTO lms_progress_lessons (user_id, lesson_id, completed_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (user_id, lesson_id) DO NOTHING
  `, [user.id, lessonId]);

  // Verificar si todas las lecciones del módulo están completadas
  const progressResult = await query(`
    SELECT 
      COUNT(DISTINCT l.id) as total_lessons,
      COUNT(DISTINCT pl.lesson_id) as completed_lessons
    FROM lms_lessons l
    LEFT JOIN lms_progress_lessons pl ON pl.lesson_id = l.id AND pl.user_id = $1
    WHERE l.module_id = $2
  `, [user.id, lesson.module_id]);

  const progress = progressResult.rows[0];
  const allLessonsCompleted = parseInt(progress.total_lessons) === parseInt(progress.completed_lessons);

  return successResponse(res, {
    message: 'Lección marcada como completada',
    lessonId,
    moduleId: lesson.module_id,
    progress: {
      totalLessons: parseInt(progress.total_lessons),
      completedLessons: parseInt(progress.completed_lessons),
      percentage: Math.floor((parseInt(progress.completed_lessons) / parseInt(progress.total_lessons)) * 100),
      allCompleted: allLessonsCompleted
    }
  });
}

// ===================================================================
// GET /quiz/:moduleId - Obtener preguntas de quiz
// ===================================================================
async function handleQuiz(req, res, user) {
  if (req.method !== 'GET') {
    return errorResponse(res, 405, 'Método no permitido');
  }

  // Extraer moduleId de la URL
  const parts = req.url.split('/');
  const quizIndex = parts.indexOf('quiz');
  const moduleId = parts[quizIndex + 1]?.split('?')[0];

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

  // Verificar intentos máximos
  if (quiz.user_attempts >= quiz.max_attempts && user.role === 'chatter') {
    return errorResponse(res, 403, `Has alcanzado el límite de ${quiz.max_attempts} intentos.`);
  }

  // Obtener preguntas del quiz (sin mostrar respuesta correcta)
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
    return errorResponse(res, 404, 'Este quiz no tiene preguntas configuradas.');
  }

  const questions = questionsResult.rows.map(q => ({
    id: q.id,
    prompt: q.prompt,
    options: q.options,
    order: q.order_index
  }));

  return successResponse(res, {
    quiz: {
      id: quiz.id,
      moduleId: quiz.module_id,
      passingScore: quiz.passing_score,
      maxAttempts: quiz.max_attempts,
      userAttempts: parseInt(quiz.user_attempts),
      remainingAttempts: quiz.max_attempts - parseInt(quiz.user_attempts)
    },
    questions
  });
}

// ===================================================================
// POST /quiz/:moduleId/submit - Enviar respuestas de quiz
// ===================================================================
async function handleQuizSubmit(req, res, user) {
  if (req.method !== 'POST') {
    return errorResponse(res, 405, 'Método no permitido');
  }

  // Extraer moduleId de la URL
  const parts = req.url.split('/');
  const quizIndex = parts.indexOf('quiz');
  const moduleId = parts[quizIndex + 1]?.split('?')[0];

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
  try {
    const result = await transaction(async (client) => {
      // Verificar acceso al módulo
      const canAccessResult = await client.query(
        'SELECT lms_can_access_module($1, $2) as can_access',
        [user.id, moduleId]
      );

      const canAccess = canAccessResult.rows[0]?.can_access;

      if (!canAccess && user.role === 'chatter') {
        throw new Error('NO_ACCESS');
      }

      // Verificar lecciones completadas
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

      // Obtener quiz
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

      // Verificar intentos máximos
      if (parseInt(quiz.user_attempts) >= quiz.max_attempts && user.role === 'chatter') {
        throw new Error('MAX_ATTEMPTS_REACHED');
      }

      // Obtener preguntas correctas
      const questionsResult = await client.query(`
        SELECT id, correct_option_index
        FROM lms_questions
        WHERE quiz_id = $1
      `, [quiz.id]);

      if (questionsResult.rows.length === 0) {
        throw new Error('NO_QUESTIONS');
      }

      // Calcular calificación
      let correctCount = 0;
      const totalQuestions = questionsResult.rows.length;

      questionsResult.rows.forEach(question => {
        const userAnswer = parseInt(answers[question.id]);
        if (userAnswer === question.correct_option_index) {
          correctCount++;
        }
      });

      const score = Math.round((correctCount / totalQuestions) * 100);
      const passed = score >= quiz.passing_score;

      // Registrar intento
      const attemptResult = await client.query(`
        INSERT INTO lms_quiz_attempts (quiz_id, user_id, score, passed, answers_json)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, created_at
      `, [quiz.id, user.id, score, passed, JSON.stringify(answers)]);

      return {
        attemptId: attemptResult.rows[0].id,
        score,
        passed,
        correctCount,
        totalQuestions,
        passingScore: quiz.passing_score,
        attemptsUsed: parseInt(quiz.user_attempts) + 1,
        maxAttempts: quiz.max_attempts
      };
    });

    return successResponse(res, result);

  } catch (error) {
    if (error.message === 'NO_ACCESS') {
      return errorResponse(res, 403, 'No tienes acceso a este módulo aún.');
    } else if (error.message === 'LESSONS_NOT_COMPLETED') {
      return errorResponse(res, 403, 'Debes completar todas las lecciones antes de tomar el quiz.');
    } else if (error.message === 'QUIZ_NOT_FOUND') {
      return errorResponse(res, 404, 'Quiz no encontrado para este módulo');
    } else if (error.message === 'MAX_ATTEMPTS_REACHED') {
      return errorResponse(res, 403, 'Has alcanzado el límite de intentos.');
    } else if (error.message === 'NO_QUESTIONS') {
      return errorResponse(res, 404, 'Este quiz no tiene preguntas configuradas.');
    } else {
      throw error;
    }
  }
}
