// ===================================================================
// POST /api/lms/lesson/complete
// Marcar una lección como completada
// ===================================================================

const { query } = require('../lib/db');
const { parseCookies, errorResponse, successResponse, validateRequired, isValidUUID } = require('../lib/utils');
const { validateSession } = require('../lib/auth');

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

  } catch (error) {
    console.error('Error en /lesson/complete:', error);
    return errorResponse(res, 500, 'Error interno del servidor', error.message);
  }
};
