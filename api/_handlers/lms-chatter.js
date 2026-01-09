// ===================================================================
// LMS Chatter Handler
// Maneja: /campus, /module/:id, /lesson/complete, /quiz/:moduleId, /quiz/:moduleId/submit
// ===================================================================

module.exports = async (req, res, deps) => {
  const { query, transaction, validateSession, parseCookies, isValidUUID, getModuleStatus, validateRequired } = deps;

  try {
    // Validar sesión
    const user = await validateSession(req);

    if (!user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    // Usar el path limpio que viene de api/lms.js
    const path = req.lmsPath || '';
    
    console.log('[Chatter Handler] Path:', path, 'Method:', req.method, 'Query:', req.query);

    // Router interno
    if (path === 'campus') {
      return await handleCampus(req, res, user, deps);
    } else if (path.startsWith('module/')) {
      return await handleModule(req, res, user, deps);
    } else if (path === 'lesson/complete') {
      return await handleLessonComplete(req, res, user, deps);
    } else if (path.startsWith('quiz/')) {
      if (path.includes('/submit')) {
        return await handleQuizSubmit(req, res, user, deps);
      } else {
        return await handleQuiz(req, res, user, deps);
      }
    } else {
      return res.status(404).json({ error: 'Ruta no encontrada', path });
    }
  } catch (error) {
    console.error('[Chatter Handler] Error:', error);
    return res.status(500).json({ error: 'Error interno del servidor', message: error.message, stack: error.stack });
  }
};

// ===================================================================
// GET /campus - Lista de módulos y progreso
// ===================================================================
async function handleCampus(req, res, user, deps) {
  const { query, getModuleStatus } = deps;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
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
      BOOL_OR(qa.passed) as passed,
      MAX(qa.score) as best_score,
      COUNT(qa.id) as attempts,
      MAX(qa.created_at) as last_attempt,
      (SELECT COUNT(*) FROM lms_questions WHERE quiz_id = q.id) > 0 as has_questions
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
          const prevQuiz = quizMap[prevModule.module_id] || { hasQuestions: false, passed: false };
          const prevProgress = progressMap[prevModule.module_id] || { totalLessons: 0, completedLessons: 0 };
          
          const prevLessonsFinished = prevProgress.totalLessons > 0 && 
                                      parseInt(prevProgress.completedLessons) === parseInt(prevProgress.totalLessons);

          if (prevQuiz.hasQuestions) {
            unlocked = prevQuiz.passed === true;
          } else {
            // Si no tiene quiz, basta con completar las lecciones
            unlocked = prevLessonsFinished;
          }
        }
      }

      const isLocked = !unlocked;
      const allLessonsCompleted = progress.totalLessons > 0 && parseInt(progress.completedLessons) === parseInt(progress.totalLessons);

      const status = getModuleStatus(isLocked, allLessonsCompleted, quiz.passed, quiz.hasQuestions);

      stagesMap[row.stage_id].modules.push({
        id: row.module_id,
        title: row.module_title,
        description: row.module_description,
        order: row.module_order,
        status,
        unlocked,
        isLocked, // Frontend usa esto
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

  // Calcular progreso general del curso
  let totalModules = 0;
  let completedModules = 0;

  stages.forEach(stage => {
    stage.modules.forEach(module => {
      totalModules++;
      if (module.status === 'completed') {
        completedModules++;
      }
    });
  });

  const overallProgress = totalModules > 0 ? Math.floor((completedModules / totalModules) * 100) : 0;

  return res.status(200).json({ 
    stages,
    overallProgress,
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
async function handleModule(req, res, user, deps) {
  const { query, isValidUUID } = deps;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Extraer moduleId de la URL
  const parts = req.lmsPath.split('/');
  const moduleId = parts[1];

  if (!isValidUUID(moduleId)) {
    return res.status(400).json({ error: 'ID de módulo inválido' });
  }

  // Verificar que el usuario puede acceder al módulo (server-side gating logic replacement)
  // Reemplazamos lms_can_access_module por lógica JS para evitar errores si la función DB no existe.
  let canAccess = true;

  if (user.role === 'chatter') {
    // 1. Obtener orden del módulo actual
    const currentModuleResult = await query(
      'SELECT order_index, stage_id FROM lms_modules WHERE id = $1',
      [moduleId]
    );

    if (currentModuleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Módulo no encontrado' });
    }

    const { order_index: currentOrder, stage_id: stageId } = currentModuleResult.rows[0];

    // 2. Si no es el primero, verificar el anterior
    if (currentOrder > 0) {
      // Buscar módulo anterior en la misma etapa
      // Nota: Esto asume etapas lineales simples. Si hay saltos entre etapas, la lógica debería ser más compleja,
      // pero por ahora mantenemos la lógica original del SQL schema.
      const prevModuleResult = await query(
        'SELECT id FROM lms_modules WHERE stage_id = $1 AND order_index = $2',
        [stageId, currentOrder - 1]
      );

      if (prevModuleResult.rows.length > 0) {
        const prevModuleId = prevModuleResult.rows[0].id;

        // Verificar lecciones completas del anterior
        const prevLessonsProgress = await query(`
          SELECT 
            (SELECT COUNT(*) FROM lms_lessons WHERE module_id = $1) as total,
            (SELECT COUNT(*) FROM lms_lessons l 
             JOIN lms_progress_lessons pl ON pl.lesson_id = l.id 
             WHERE l.module_id = $1 AND pl.user_id = $2) as completed
        `, [prevModuleId, user.id]);

        const { total, completed } = prevLessonsProgress.rows[0];
        const prevLessonsCompleted = parseInt(total) === parseInt(completed);

        if (!prevLessonsCompleted) {
          canAccess = false;
        } else {
          // Verificar quiz del anterior (si existe y tiene preguntas)
          const prevQuizResult = await query(
            'SELECT id FROM lms_quizzes WHERE module_id = $1',
            [prevModuleId]
          );

          if (prevQuizResult.rows.length > 0) {
            const prevQuizId = prevQuizResult.rows[0].id;
            
            // Solo requerir aprobar si tiene preguntas
            const hasQuestionsResult = await query('SELECT 1 FROM lms_questions WHERE quiz_id = $1 LIMIT 1', [prevQuizId]);
            
            if (hasQuestionsResult.rows.length > 0) {
                const quizAttemptResult = await query(
                  'SELECT 1 FROM lms_quiz_attempts WHERE quiz_id = $1 AND user_id = $2 AND passed = true LIMIT 1',
                  [prevQuizId, user.id]
                );
                
                if (quizAttemptResult.rows.length === 0) {
                  canAccess = false;
                }
            }
          }
        }
      }
    }
  }

  if (!canAccess && user.role === 'chatter') {
    return res.status(403).json({ error: 'No tienes acceso a este módulo aún. Completa los módulos anteriores.' });
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
    return res.status(404).json({ error: 'Módulo no encontrado' });
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
      q.cooldown_minutes,
      COUNT(DISTINCT qst.id) as questions_count,
      BOOL_OR(qa.passed) as user_passed,
      MAX(qa.score) as user_best_score,
      COUNT(DISTINCT qa.id) as user_attempts,
      MAX(qa.created_at) as last_attempt
    FROM lms_quizzes q
    LEFT JOIN lms_questions qst ON qst.quiz_id = q.id
    LEFT JOIN lms_quiz_attempts qa ON qa.quiz_id = q.id AND qa.user_id = $1
    WHERE q.module_id = $2
    GROUP BY q.id, q.passing_score, q.max_attempts, q.cooldown_minutes
  `, [user.id, moduleId]);

  let quizData = null;
  let canTakeQuiz = false;
  let allLessonsCompleted = lessons.every(l => l.completed);

  if (quizResult.rows.length > 0) {
    const row = quizResult.rows[0];
    const userPassed = row.user_passed || false;
    const userAttempts = parseInt(row.user_attempts) || 0;
    const maxAttempts = parseInt(row.max_attempts);
    
    // HARD OVERRIDE: Deshabilitar cooldown completamente (siempre 0 minutos)
    let dbCooldown = parseInt(row.cooldown_minutes);
    const cooldownMinutes = 0; // Sin cooldown - pueden reintentar inmediatamente
    
    // Calcular cooldown
    let cooldownRemaining = 0;
    if (row.last_attempt && cooldownMinutes > 0) {
      const lastAttemptTime = new Date(row.last_attempt).getTime();
      const cooldownMs = cooldownMinutes * 60 * 1000;
      const elapsedMs = Date.now() - lastAttemptTime;
      if (elapsedMs < cooldownMs) {
        cooldownRemaining = Math.ceil((cooldownMs - elapsedMs) / 60000);
      }
    }

    // Lógica para habilitar quiz
    canTakeQuiz = 
      allLessonsCompleted && 
      !userPassed && 
      (userAttempts < maxAttempts) && 
      (cooldownRemaining === 0) &&
      (parseInt(row.questions_count) > 0);

    quizData = {
      id: row.id,
      passingScore: row.passing_score,
      maxAttempts: maxAttempts,
      totalQuestions: parseInt(row.questions_count), // Frontend espera totalQuestions
      userPassed: userPassed,
      bestScore: row.user_best_score || 0,
      userAttempts: userAttempts,
      attemptsRemaining: Math.max(0, maxAttempts - userAttempts),
      cooldownMinutes,
      cooldownRemaining,
      hasQuestions: parseInt(row.questions_count) > 0
    };
  }

  return res.status(200).json({
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
    quiz: quizData,
    allLessonsCompleted,
    canTakeQuiz
  });
}

// ===================================================================
// POST /lesson/complete - Marcar lección completada
// ===================================================================
async function handleLessonComplete(req, res, user, deps) {
  const { query, transaction, isValidUUID, validateRequired } = deps;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { lessonId } = req.body;

  // Validar campos requeridos
  const validation = validateRequired(req.body, ['lessonId']);
  if (!validation.valid) {
    return errorResponse(res, 400, 'Campos requeridos faltantes', { missing: validation.missing });
  }

  if (!isValidUUID(lessonId)) {
    return res.status(400).json({ error: 'ID de lección inválido' });
  }

  // Verificar que la lección existe
  const lessonResult = await query(
    'SELECT id, module_id FROM lms_lessons WHERE id = $1',
    [lessonId]
  );

  if (lessonResult.rows.length === 0) {
    return res.status(404).json({ error: 'Lección no encontrada' });
  }

  const lesson = lessonResult.rows[0];
  const moduleId = lesson.module_id;

  // Verificar acceso secuencial (Server-Side Logic Replacement)
  if (user.role === 'chatter') {
    // 1. Obtener orden del módulo actual
    const currentModuleResult = await query(
      'SELECT order_index, stage_id, published FROM lms_modules WHERE id = $1',
      [moduleId]
    );

    if (currentModuleResult.rows.length === 0 || !currentModuleResult.rows[0].published) {
      return res.status(403).json({ error: 'Módulo no accesible' });
    }

    const { order_index: currentOrder, stage_id: stageId } = currentModuleResult.rows[0];

    // 2. Si no es el primero, verificar el anterior para evitar saltos
    if (currentOrder > 0) {
      const prevModuleResult = await query(
        'SELECT id FROM lms_modules WHERE stage_id = $1 AND order_index = $2',
        [stageId, currentOrder - 1]
      );

      if (prevModuleResult.rows.length > 0) {
        const prevModuleId = prevModuleResult.rows[0].id;

        // Verificar lecciones completas del anterior
        const prevLessonsProgress = await query(`
          SELECT 
            (SELECT COUNT(*) FROM lms_lessons WHERE module_id = $1) as total,
            (SELECT COUNT(*) FROM lms_lessons l 
             JOIN lms_progress_lessons pl ON pl.lesson_id = l.id 
             WHERE l.module_id = $1 AND pl.user_id = $2) as completed
        `, [prevModuleId, user.id]);

        const { total, completed } = prevLessonsProgress.rows[0];
        
        if (parseInt(total) !== parseInt(completed)) {
           return res.status(403).json({ error: 'Debes completar el módulo anterior primero.' });
        }
        
        // Verificar quiz del anterior
        const prevQuizResult = await query('SELECT id FROM lms_quizzes WHERE module_id = $1', [prevModuleId]);
        if (prevQuizResult.rows.length > 0) {
          const prevQuizId = prevQuizResult.rows[0].id;
          const quizAttemptResult = await query(
            'SELECT 1 FROM lms_quiz_attempts WHERE quiz_id = $1 AND user_id = $2 AND passed = true LIMIT 1',
            [prevQuizId, user.id]
          );
          
          if (quizAttemptResult.rows.length === 0) {
            return res.status(403).json({ error: 'Debes aprobar el quiz del módulo anterior.' });
          }
        }
      }
    }
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

  return res.status(200).json({
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
async function handleQuiz(req, res, user, deps) {
  const { query, isValidUUID } = deps;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Extraer moduleId de la URL usando lmsPath (más seguro)
  // path: quiz/uuid
  const parts = req.lmsPath.split('/');
  const moduleId = parts[1];

  if (!isValidUUID(moduleId)) {
    return res.status(400).json({ error: 'ID de módulo inválido' });
  }

  // Verificar acceso secuencial (Server-Side Logic Replacement)
  if (user.role === 'chatter') {
    // 1. Obtener orden del módulo actual
    const currentModuleResult = await query(
      'SELECT order_index, stage_id, published FROM lms_modules WHERE id = $1',
      [moduleId]
    );

    if (currentModuleResult.rows.length === 0 || !currentModuleResult.rows[0].published) {
      return res.status(403).json({ error: 'Módulo no accesible' });
    }

    const { order_index: currentOrder, stage_id: stageId } = currentModuleResult.rows[0];

    // 2. Si no es el primero, verificar el anterior para evitar saltos
    if (currentOrder > 0) {
      const prevModuleResult = await query(
        'SELECT id FROM lms_modules WHERE stage_id = $1 AND order_index = $2',
        [stageId, currentOrder - 1]
      );

      if (prevModuleResult.rows.length > 0) {
        const prevModuleId = prevModuleResult.rows[0].id;

        // Verificar lecciones completas del anterior
        const prevLessonsProgress = await query(`
          SELECT 
            (SELECT COUNT(*) FROM lms_lessons WHERE module_id = $1) as total,
            (SELECT COUNT(*) FROM lms_lessons l 
             JOIN lms_progress_lessons pl ON pl.lesson_id = l.id 
             WHERE l.module_id = $1 AND pl.user_id = $2) as completed
        `, [prevModuleId, user.id]);

        const { total, completed } = prevLessonsProgress.rows[0];
        
        if (parseInt(total) !== parseInt(completed)) {
           return res.status(403).json({ error: 'Debes completar el módulo anterior primero.' });
        }
        
        // Verificar quiz del anterior
        const prevQuizResult = await query('SELECT id FROM lms_quizzes WHERE module_id = $1', [prevModuleId]);
        if (prevQuizResult.rows.length > 0) {
          const prevQuizId = prevQuizResult.rows[0].id;
          const quizAttemptResult = await query(
            'SELECT 1 FROM lms_quiz_attempts WHERE quiz_id = $1 AND user_id = $2 AND passed = true LIMIT 1',
            [prevQuizId, user.id]
          );
          
          if (quizAttemptResult.rows.length === 0) {
            return res.status(403).json({ error: 'Debes aprobar el quiz del módulo anterior.' });
          }
        }
      }
    }
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
    return res.status(403).json({ error: 'Debes completar todas las lecciones antes de tomar el quiz.' });
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
    return res.status(404).json({ error: 'Quiz no encontrado para este módulo' });
  }

  const quiz = quizResult.rows[0];

  // COOLDOWN DESHABILITADO - Permitir reintentos inmediatos
  // if (quiz.last_attempt && quiz.cooldown_minutes > 0) {
  //   const lastAttemptTime = new Date(quiz.last_attempt).getTime();
  //   const cooldownMs = quiz.cooldown_minutes * 60 * 1000;
  //   const elapsedMs = Date.now() - lastAttemptTime;
  //   
  //   if (elapsedMs < cooldownMs) {
  //     const minutesRemaining = Math.ceil((cooldownMs - elapsedMs) / 60000);
  //     return errorResponse(res, 429, `Debes esperar ${minutesRemaining} minutos antes de intentar de nuevo.`);
  //   }
  // }

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
    return res.status(404).json({ error: 'Este quiz no tiene preguntas configuradas.' });
  }

  const questions = questionsResult.rows.map(q => ({
    id: q.id,
    prompt: q.prompt,
    options: q.options,
    order: q.order_index
  }));

  return res.status(200).json({
    quiz: {
      id: quiz.id,
      moduleId: quiz.module_id,
      passingScore: quiz.passing_score,
      maxAttempts: quiz.max_attempts,
      userAttempts: parseInt(quiz.user_attempts),
      remainingAttempts: quiz.max_attempts - parseInt(quiz.user_attempts),
      attemptsRemaining: quiz.max_attempts - parseInt(quiz.user_attempts) // Para consistencia
    },
    questions
  });
}

// ===================================================================
// POST /quiz/:moduleId/submit - Enviar respuestas de quiz
// ===================================================================
async function handleQuizSubmit(req, res, user, deps) {
  const { query, transaction, isValidUUID, validateRequired } = deps;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Extraer moduleId de la URL usando lmsPath
  // path: quiz/[id]/submit
  const parts = req.lmsPath.split('/');
  const moduleId = parts[1];

  if (!isValidUUID(moduleId)) {
    return res.status(400).json({ error: 'ID de módulo inválido' });
  }

  const { answers } = req.body;

  // Validar campos requeridos
  const validation = validateRequired(req.body, ['answers']);
  if (!validation.valid) {
    return errorResponse(res, 400, 'Debes proporcionar las respuestas', { missing: validation.missing });
  }

  if (typeof answers !== 'object' || Object.keys(answers).length === 0) {
    return res.status(400).json({ error: 'Las respuestas deben ser un objeto con questionId: selectedOptionIndex' });
  }

  // Usar transacción para garantizar consistencia
  try {
    const result = await transaction(async (client) => {
      // Verificar acceso al módulo
      // Reemplazamos lms_can_access_module por lógica JS simple
      // En este punto, solo verificamos si existe el módulo y si es chatter
      if (user.role === 'chatter') {
        const moduleExists = await client.query('SELECT 1 FROM lms_modules WHERE id = $1', [moduleId]);
        if (moduleExists.rows.length === 0) {
           throw new Error('QUIZ_NOT_FOUND'); // Generico para 404
        }
        // Nota: Para submit, asumimos que si llegó aquí es porque podía ver el quiz.
        // La validación estricta de can_access_module es compleja de replicar dentro de transaction sin funciones auxiliares,
        // pero la validación de lecciones completas abajo actúa como segunda barrera.
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
      const detailedResults = [];

      questionsResult.rows.forEach(question => {
        const userAnswer = parseInt(answers[question.id]);
        const isCorrect = userAnswer === question.correct_option_index;
        
        if (isCorrect) {
          correctCount++;
        }

        detailedResults.push({
          questionId: question.id,
          userAnswer,
          correctAnswer: question.correct_option_index,
          isCorrect
        });
      });

      const score = Math.round((correctCount / totalQuestions) * 100);
      const passed = score >= quiz.passing_score;

      // Registrar intento
      const attemptResult = await client.query(`
        INSERT INTO lms_quiz_attempts (quiz_id, user_id, score, passed, answers)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, created_at
      `, [quiz.id, user.id, score, passed, JSON.stringify(answers)]);

      // ===================================================================
      // AUTO-DETECCIÓN: ¿Completó todo el curso?
      // ===================================================================
      let courseCompleted = false;
      let completionData = null;

      if (passed) {
        // Verificar si ya tiene una completación registrada
        const existingCompletion = await client.query(
          'SELECT id FROM lms_course_completions WHERE user_id = $1',
          [user.id]
        );

        if (existingCompletion.rows.length === 0) {
          // Verificar si este fue el último quiz pendiente
          const allQuizzesResult = await client.query(`
            SELECT 
              q.id as quiz_id,
              q.module_id,
              BOOL_OR(qa.passed) as passed
            FROM lms_quizzes q
            LEFT JOIN lms_quiz_attempts qa ON qa.quiz_id = q.id AND qa.user_id = $1
            GROUP BY q.id, q.module_id
          `, [user.id]);

          const allQuizzes = allQuizzesResult.rows;
          const totalQuizzes = allQuizzes.length;
          const passedQuizzes = allQuizzes.filter(q => q.passed).length;

          // Si aprobó todos los quizzes, calcular nota final y registrar completación
          if (totalQuizzes > 0 && passedQuizzes === totalQuizzes) {
            // Calcular overall_score (promedio de todos los quizzes)
            const scoresResult = await client.query(`
              SELECT 
                qa.quiz_id,
                MAX(qa.score) as best_score
              FROM lms_quiz_attempts qa
              WHERE qa.user_id = $1 AND qa.passed = true
              GROUP BY qa.quiz_id
            `, [user.id]);

            const scores = scoresResult.rows.map(r => r.best_score);
            const overallScore = Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
            const approved = overallScore >= 80;

            // Registrar completación del curso
            const completionResult = await client.query(`
              INSERT INTO lms_course_completions 
                (user_id, completed_at, overall_score, approved)
              VALUES ($1, NOW(), $2, $3)
              RETURNING id, completed_at, overall_score, approved
            `, [user.id, overallScore, approved]);

            courseCompleted = true;
            completionData = {
              completionId: completionResult.rows[0].id,
              completedAt: completionResult.rows[0].completed_at,
              overallScore,
              approved,
              totalQuizzes,
              message: approved 
                ? '🎉 ¡FELICITACIONES! Has completado exitosamente todo el curso.'
                : '✅ Completaste todos los módulos, pero tu promedio es menor a 80%.'
            };
          }
        }
      }

      return {
        attemptId: attemptResult.rows[0].id,
        score,
        passed,
        correctAnswers: correctCount,
        correctCount,
        totalQuestions,
        detailedResults,
        passingScore: quiz.passing_score,
        attemptsUsed: parseInt(quiz.user_attempts) + 1,
        maxAttempts: quiz.max_attempts,
        courseCompleted,
        completion: completionData
      };
    });

    return res.status(200).json(result);

  } catch (error) {
    if (error.message === 'NO_ACCESS') {
      return res.status(403).json({ error: 'No tienes acceso a este módulo aún.' });
    } else if (error.message === 'LESSONS_NOT_COMPLETED') {
      return res.status(403).json({ error: 'Debes completar todas las lecciones antes de tomar el quiz.' });
    } else if (error.message === 'QUIZ_NOT_FOUND') {
      return res.status(404).json({ error: 'Quiz no encontrado para este módulo' });
    } else if (error.message === 'MAX_ATTEMPTS_REACHED') {
      return res.status(403).json({ error: 'Has alcanzado el límite de intentos.' });
    } else if (error.message === 'NO_QUESTIONS') {
      return res.status(404).json({ error: 'Este quiz no tiene preguntas configuradas.' });
    } else {
      throw error;
    }
  }
}

