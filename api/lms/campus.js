// ===================================================================
// GET /api/lms/campus
// Obtener todos los módulos y el progreso del usuario
// ===================================================================

const { query } = require('./lib/db');
const { parseCookies, errorResponse, successResponse, getModuleStatus } = require('./lib/utils');
const { validateSession } = require('./lib/auth');

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
    const stages = [];
    let currentStage = null;

    stagesResult.rows.forEach(row => {
      // Nueva etapa
      if (!currentStage || currentStage.id !== row.stage_id) {
        if (currentStage) {
          stages.push(currentStage);
        }
        currentStage = {
          id: row.stage_id,
          name: row.stage_name,
          description: row.stage_description,
          order: row.stage_order,
          modules: []
        };
      }

      // Agregar módulo si existe
      if (row.module_id) {
        const progress = progressMap[row.module_id] || { totalLessons: 0, completedLessons: 0 };
        const quiz = quizMap[row.module_id] || { passed: false, bestScore: 0, attempts: 0, hasQuestions: false };
        
        const allLessonsCompleted = progress.totalLessons > 0 && progress.completedLessons === progress.totalLessons;
        
        // Determinar si el módulo está bloqueado
        let isLocked = false;
        if (row.module_order > 0 && currentStage.modules.length > 0) {
          const prevModule = currentStage.modules[currentStage.modules.length - 1];
          isLocked = prevModule.status !== 'completed';
        }

        const status = getModuleStatus(isLocked, allLessonsCompleted, quiz.passed, quiz.hasQuestions);

        currentStage.modules.push({
          id: row.module_id,
          title: row.module_title,
          description: row.module_description,
          order: row.module_order,
          status,
          progress: {
            totalLessons: progress.totalLessons,
            completedLessons: progress.completedLessons,
            percentage: progress.totalLessons > 0 
              ? Math.floor((progress.completedLessons / progress.totalLessons) * 100)
              : 0
          },
          quiz: quiz.hasQuestions ? {
            passed: quiz.passed,
            bestScore: quiz.bestScore,
            attempts: quiz.attempts,
            lastAttempt: quiz.lastAttempt
          } : null,
          isLocked
        });
      }
    });

    // Agregar última etapa
    if (currentStage) {
      stages.push(currentStage);
    }

    // Calcular progreso total
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

    const overallProgress = totalModules > 0 
      ? Math.floor((completedModules / totalModules) * 100)
      : 0;

    return successResponse(res, {
      stages,
      overallProgress,
      totalModules,
      completedModules
    });

  } catch (error) {
    console.error('Error en /campus:', error);
    return errorResponse(res, 500, 'Error interno del servidor', error.message);
  }
};
