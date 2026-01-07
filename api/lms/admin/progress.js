// ===================================================================
// /api/lms/admin/progress
// Ver progreso de todos los usuarios (admin/supervisor)
// ===================================================================

const { query } = require('../lib/db');
const { parseCookies, errorResponse, successResponse } = require('../lib/utils');
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
    req.cookies = parseCookies(req);
    const user = await validateSession(req);

    if (!user || !['admin', 'supervisor'].includes(user.role)) {
      return errorResponse(res, 403, 'Acceso denegado');
    }

    const { userId, moduleId, status } = req.query;

    // Query principal usando la vista
    let sql = `
      SELECT 
        user_id, user_name, user_email,
        module_id, module_title, module_order,
        stage_id, stage_name,
        total_lessons, completed_lessons, lessons_completion_percentage,
        quiz_passed, best_quiz_score, quiz_attempts_count, last_quiz_attempt
      FROM lms_user_module_progress
      WHERE 1=1
    `;
    const params = [];

    if (userId) {
      params.push(userId);
      sql += ` AND user_id = $${params.length}`;
    }

    if (moduleId) {
      params.push(moduleId);
      sql += ` AND module_id = $${params.length}`;
    }

    // Filtros de estado
    if (status === 'not_started') {
      sql += ` AND completed_lessons = 0`;
    } else if (status === 'stuck') {
      sql += ` AND completed_lessons > 0 AND completed_lessons < total_lessons`;
    } else if (status === 'completed') {
      sql += ` AND quiz_passed = true`;
    } else if (status === 'pending_quiz') {
      sql += ` AND completed_lessons = total_lessons AND (quiz_passed IS NULL OR quiz_passed = false)`;
    }

    sql += ' ORDER BY user_name, module_order';

    const result = await query(sql, params);

    // Agrupar por usuario si no se especificó userId
    if (!userId) {
      const userMap = {};

      result.rows.forEach(row => {
        if (!userMap[row.user_id]) {
          userMap[row.user_id] = {
            userId: row.user_id,
            userName: row.user_name,
            userEmail: row.user_email,
            modules: [],
            overallProgress: 0,
            completedModules: 0,
            totalModules: 0
          };
        }

        const userProgress = userMap[row.user_id];
        userProgress.totalModules++;

        const moduleStatus = row.quiz_passed ? 'completed' 
          : row.completed_lessons === row.total_lessons ? 'ready_for_quiz'
          : row.completed_lessons > 0 ? 'in_progress'
          : 'not_started';

        if (row.quiz_passed) {
          userProgress.completedModules++;
        }

        userProgress.modules.push({
          moduleId: row.module_id,
          moduleTitle: row.module_title,
          moduleOrder: row.module_order,
          stageId: row.stage_id,
          stageName: row.stage_name,
          totalLessons: row.total_lessons,
          completedLessons: row.completed_lessons,
          lessonsCompletionPercentage: row.lessons_completion_percentage,
          quizPassed: row.quiz_passed,
          bestQuizScore: row.best_quiz_score,
          quizAttempts: row.quiz_attempts_count,
          lastQuizAttempt: row.last_quiz_attempt,
          status: moduleStatus
        });
      });

      // Calcular progreso general por usuario
      const users = Object.values(userMap).map(user => {
        user.overallProgress = user.totalModules > 0 
          ? Math.floor((user.completedModules / user.totalModules) * 100)
          : 0;
        return user;
      });

      return successResponse(res, { users });
    }

    // Si se especificó userId, retornar progreso detallado
    const modules = result.rows.map(row => ({
      moduleId: row.module_id,
      moduleTitle: row.module_title,
      moduleOrder: row.module_order,
      stageId: row.stage_id,
      stageName: row.stage_name,
      totalLessons: row.total_lessons,
      completedLessons: row.completed_lessons,
      lessonsCompletionPercentage: row.lessons_completion_percentage,
      quizPassed: row.quiz_passed,
      bestQuizScore: row.best_quiz_score,
      quizAttempts: row.quiz_attempts_count,
      lastQuizAttempt: row.last_quiz_attempt,
      status: row.quiz_passed ? 'completed' 
        : row.completed_lessons === row.total_lessons ? 'ready_for_quiz'
        : row.completed_lessons > 0 ? 'in_progress'
        : 'not_started'
    }));

    const completedModules = modules.filter(m => m.status === 'completed').length;
    const overallProgress = modules.length > 0 
      ? Math.floor((completedModules / modules.length) * 100)
      : 0;

    return successResponse(res, {
      userId,
      userName: result.rows[0]?.user_name,
      userEmail: result.rows[0]?.user_email,
      overallProgress,
      completedModules,
      totalModules: modules.length,
      modules
    });

  } catch (error) {
    console.error('Error en /admin/progress:', error);
    return errorResponse(res, 500, 'Error interno del servidor', error.message);
  }
};
