// ===================================================================
// LMS Admin Handler
// Maneja: /admin/* (users, modules, lessons, questions, progress, stages, quizzes)
// ===================================================================

module.exports = async (req, res, deps) => {
  const { query, transaction, hashPassword, generateTempPassword, getUserById, validateSession, parseCookies, isValidEmail, isValidUUID, validateRequired, normalizeLoomUrl } = deps;

  try {
    // Validar sesión
    const user = await validateSession(req);

    if (!user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    // Usar el path limpio que viene de api/lms.js
    // Ejemplo: "admin/users" -> "users"
    const path = req.lmsPath || '';
    const resource = path.replace('admin/', '').split('/')[0];

    console.log('[Admin Handler] Path:', path, 'Resource:', resource, 'Method:', req.method);

    // Router interno por recurso
    switch(resource) {
      case 'users':
        return await handleUsers(req, res, user, deps);
      case 'modules':
        return await handleModules(req, res, user, deps);
      case 'lessons':
        return await handleLessons(req, res, user, deps);
      case 'questions':
        return await handleQuestions(req, res, user, deps);
      case 'progress':
        return await handleProgress(req, res, user, deps);
      case 'stages':
        return await handleStages(req, res, user, deps);
      case 'quizzes':
        return await handleQuizzes(req, res, user, deps);
      default:
        return res.status(404).json({ error: 'Recurso no encontrado', resource, path });
    }
  } catch (error) {
    console.error('[Admin Handler] Error:', error);
    return res.status(500).json({ error: 'Error interno del servidor', message: error.message, stack: error.stack });
  }
};

// ===================================================================
// USERS - CRUD de usuarios (solo admin)
// ===================================================================
async function handleUsers(req, res, user, deps) {
  const { query, hashPassword, generateTempPassword, isValidEmail, isValidUUID, validateRequired } = deps;

  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Solo administradores pueden gestionar usuarios' });
  }

  // GET: Listar usuarios
  if (req.method === 'GET') {
    const { role, active } = req.query;
    
    let sql = 'SELECT id, name, email, role, active, last_login, created_at FROM lms_users WHERE 1=1';
    const params = [];
    
    if (role) {
      params.push(role);
      sql += ` AND role = $${params.length}`;
    }
    
    if (active !== undefined) {
      params.push(active === 'true');
      sql += ` AND active = $${params.length}`;
    }
    
    sql += ' ORDER BY created_at DESC';
    
    const result = await query(sql, params);
    
    return res.status(200).json({ users: result.rows });
  }

  // POST: Crear usuario
  if (req.method === 'POST') {
    const { name, email, role, password } = req.body;
    
    const validation = validateRequired(req.body, ['name', 'email', 'role']);
    if (!validation.valid) {
      return errorResponse(res, 400, 'Campos requeridos faltantes', { missing: validation.missing });
    }
    
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Email inválido' });
    }
    
    if (!['chatter', 'supervisor', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Rol inválido. Debe ser: chatter, supervisor o admin' });
    }
    
    // Verificar si el email ya existe
    const existingUser = await query('SELECT id FROM lms_users WHERE email = $1', [email.toLowerCase()]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }
    
    // Generar contraseña temporal si no se proporciona
    const finalPassword = password || generateTempPassword();
    const passwordHash = await hashPassword(finalPassword);
    
    const result = await query(`
      INSERT INTO lms_users (name, email, role, password_hash, active)
      VALUES ($1, $2, $3, $4, true)
      RETURNING id, name, email, role, active, created_at
    `, [name, email.toLowerCase(), role, passwordHash]);
    
    return successResponse(res, {
      user: result.rows[0],
      temporaryPassword: password ? undefined : finalPassword,
      message: 'Usuario creado exitosamente'
    }, 201);
  }

  // PUT: Actualizar usuario
  if (req.method === 'PUT') {
    const { id, name, email, role, active, resetPassword } = req.body;
    
    if (!id || !isValidUUID(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    const updates = [];
    const params = [id];
    let paramIndex = 2;
    
    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(name);
    }
    
    if (email !== undefined) {
      if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Email inválido' });
      }
      updates.push(`email = $${paramIndex++}`);
      params.push(email.toLowerCase());
    }
    
    if (role !== undefined) {
      if (!['chatter', 'supervisor', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Rol inválido' });
      }
      updates.push(`role = $${paramIndex++}`);
      params.push(role);
    }
    
    if (active !== undefined) {
      updates.push(`active = $${paramIndex++}`);
      params.push(active);
    }
    
    let newPassword = null;
    if (resetPassword) {
      newPassword = generateTempPassword();
      const passwordHash = await hashPassword(newPassword);
      updates.push(`password_hash = $${paramIndex++}`);
      params.push(passwordHash);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }
    
    const result = await query(`
      UPDATE lms_users SET ${updates.join(', ')} WHERE id = $1 
      RETURNING id, name, email, role, active, created_at
    `, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    return successResponse(res, {
      user: result.rows[0],
      newPassword: newPassword,
      message: 'Usuario actualizado exitosamente'
    });
  }

  // DELETE: Eliminar usuario
  if (req.method === 'DELETE') {
    const { id } = req.query;
    
    if (!id || !isValidUUID(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    // No permitir eliminar el propio usuario
    if (id === user.id) {
      return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
    }
    
    await query('DELETE FROM lms_users WHERE id = $1', [id]);
    
    return res.status(200).json({ message: 'Usuario eliminado exitosamente' });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}

// ===================================================================
// MODULES - CRUD de módulos (admin/supervisor)
// ===================================================================
async function handleModules(req, res, user, deps) {
  const { query, isValidUUID, validateRequired } = deps;

  if (!['admin', 'supervisor'].includes(user.role)) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  // GET: Listar módulos
  if (req.method === 'GET') {
    const { stageId } = req.query;
    
    let sql = `
      SELECT 
        m.id, m.stage_id, m.title, m.description, m.order_index, m.published, m.created_at, m.updated_at,
        s.name as stage_name,
        (SELECT COUNT(*) FROM lms_lessons WHERE module_id = m.id) as lessons_count,
        (SELECT COUNT(*) FROM lms_quizzes WHERE module_id = m.id) as has_quiz
      FROM lms_modules m
      JOIN lms_stages s ON s.id = m.stage_id
      WHERE 1=1
    `;
    const params = [];
    
    if (stageId) {
      params.push(stageId);
      sql += ` AND m.stage_id = $${params.length}`;
    }
    
    sql += ' ORDER BY m.order_index';
    
    const result = await query(sql, params);
    return res.status(200).json({ modules: result.rows });
  }

  // POST: Crear módulo (solo admin)
  if (req.method === 'POST') {
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores pueden crear módulos' });
    }

    const { stageId, title, description, orderIndex, published } = req.body;
    
    const validation = validateRequired(req.body, ['stageId', 'title', 'orderIndex']);
    if (!validation.valid) {
      return errorResponse(res, 400, 'Campos requeridos faltantes', { missing: validation.missing });
    }
    
    const result = await query(`
      INSERT INTO lms_modules (stage_id, title, description, order_index, published)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [stageId, title, description || null, orderIndex, published !== false]);
    
    return res.status(201).json({ module: result.rows[0] });
  }

  // PUT: Actualizar módulo (solo admin)
  if (req.method === 'PUT') {
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores pueden actualizar módulos' });
    }

    const { id, title, description, orderIndex, published } = req.body;
    
    if (!id || !isValidUUID(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    const updates = [];
    const params = [id];
    let paramIndex = 2;
    
    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      params.push(title);
    }
    
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(description);
    }
    
    if (orderIndex !== undefined) {
      updates.push(`order_index = $${paramIndex++}`);
      params.push(orderIndex);
    }
    
    if (published !== undefined) {
      updates.push(`published = $${paramIndex++}`);
      params.push(published);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }
    
    const result = await query(`
      UPDATE lms_modules SET ${updates.join(', ')} WHERE id = $1 RETURNING *
    `, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Módulo no encontrado' });
    }
    
    return res.status(200).json({ module: result.rows[0] });
  }

  // DELETE: Eliminar módulo (solo admin)
  if (req.method === 'DELETE') {
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores pueden eliminar módulos' });
    }

    const { id } = req.query;
    
    if (!id || !isValidUUID(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    await query('DELETE FROM lms_modules WHERE id = $1', [id]);
    
    return res.status(200).json({ message: 'Módulo eliminado exitosamente' });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}

// ===================================================================
// LESSONS - CRUD de lecciones (admin/supervisor)
// ===================================================================
async function handleLessons(req, res, user, deps) {
  const { query, isValidUUID, validateRequired, normalizeLoomUrl } = deps;

  if (!['admin', 'supervisor'].includes(user.role)) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  // GET: Listar lecciones
  if (req.method === 'GET') {
    const { moduleId } = req.query;
    
    let sql = `
      SELECT 
        l.id, l.module_id, l.title, l.type, l.order_index, l.loom_url, l.text_content,
        l.created_at, l.updated_at,
        m.title as module_title
      FROM lms_lessons l
      JOIN lms_modules m ON m.id = l.module_id
      WHERE 1=1
    `;
    const params = [];
    
    if (moduleId) {
      params.push(moduleId);
      sql += ` AND l.module_id = $${params.length}`;
    }
    
    sql += ' ORDER BY l.order_index';
    
    const result = await query(sql, params);
    return res.status(200).json({ lessons: result.rows });
  }

  // POST: Crear lección (solo admin)
  if (req.method === 'POST') {
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores pueden crear lecciones' });
    }

    const { moduleId, title, type, orderIndex, loomUrl, textContent } = req.body;
    
    const validation = validateRequired(req.body, ['moduleId', 'title', 'type', 'orderIndex']);
    if (!validation.valid) {
      return errorResponse(res, 400, 'Campos requeridos faltantes', { missing: validation.missing });
    }
    
    if (!['video', 'text'].includes(type)) {
      return res.status(400).json({ error: 'Tipo debe ser "video" o "text"' });
    }
    
    if (type === 'video' && !loomUrl) {
      return res.status(400).json({ error: 'loomUrl es requerido para lecciones de video' });
    }
    
    if (type === 'text' && !textContent) {
      return res.status(400).json({ error: 'textContent es requerido para lecciones de texto' });
    }
    
    const finalLoomUrl = type === 'video' ? normalizeLoomUrl(loomUrl) : null;
    
    const result = await query(`
      INSERT INTO lms_lessons (module_id, title, type, order_index, loom_url, text_content)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [moduleId, title, type, orderIndex, finalLoomUrl, type === 'text' ? textContent : null]);
    
    return res.status(201).json({ lesson: result.rows[0] });
  }

  // PUT: Actualizar lección (solo admin)
  if (req.method === 'PUT') {
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores pueden actualizar lecciones' });
    }

    const { id, title, type, orderIndex, loomUrl, textContent } = req.body;
    
    if (!id || !isValidUUID(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    const updates = [];
    const params = [id];
    let paramIndex = 2;
    
    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      params.push(title);
    }
    
    if (type !== undefined) {
      if (!['video', 'text'].includes(type)) {
        return res.status(400).json({ error: 'Tipo debe ser "video" o "text"' });
      }
      updates.push(`type = $${paramIndex++}`);
      params.push(type);
    }
    
    if (orderIndex !== undefined) {
      updates.push(`order_index = $${paramIndex++}`);
      params.push(orderIndex);
    }
    
    if (loomUrl !== undefined) {
      updates.push(`loom_url = $${paramIndex++}`);
      params.push(loomUrl ? normalizeLoomUrl(loomUrl) : null);
    }
    
    if (textContent !== undefined) {
      updates.push(`text_content = $${paramIndex++}`);
      params.push(textContent);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }
    
    const result = await query(`
      UPDATE lms_lessons SET ${updates.join(', ')} WHERE id = $1 RETURNING *
    `, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lección no encontrada' });
    }
    
    return res.status(200).json({ lesson: result.rows[0] });
  }

  // DELETE: Eliminar lección (solo admin)
  if (req.method === 'DELETE') {
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores pueden eliminar lecciones' });
    }

    const { id } = req.query;
    
    if (!id || !isValidUUID(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    await query('DELETE FROM lms_lessons WHERE id = $1', [id]);
    
    return res.status(200).json({ message: 'Lección eliminada exitosamente' });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}

// ===================================================================
// QUESTIONS - CRUD de preguntas (admin/supervisor)
// ===================================================================
async function handleQuestions(req, res, user, deps) {
  const { query, isValidUUID, validateRequired } = deps;

  if (!['admin', 'supervisor'].includes(user.role)) {
    return res.status(403).json({ error: 'Acceso denegado' });
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
    return res.status(200).json({ questions: result.rows });
  }

  // POST: Crear pregunta (solo admin)
  if (req.method === 'POST') {
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores pueden crear preguntas' });
    }

    const { quizId, prompt, options, correctOptionIndex, orderIndex } = req.body;
    
    const validation = validateRequired(req.body, ['quizId', 'prompt', 'options', 'correctOptionIndex', 'orderIndex']);
    if (!validation.valid) {
      return errorResponse(res, 400, 'Campos requeridos faltantes', { missing: validation.missing });
    }
    
    if (!Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: 'Debe haber al menos 2 opciones' });
    }
    
    if (correctOptionIndex < 0 || correctOptionIndex >= options.length) {
      return res.status(400).json({ error: 'correctOptionIndex fuera de rango' });
    }
    
    const result = await query(`
      INSERT INTO lms_questions (quiz_id, prompt, options, correct_option_index, order_index)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [quizId, prompt, JSON.stringify(options), correctOptionIndex, orderIndex]);
    
    return res.status(201).json({ question: result.rows[0] });
  }

  // PUT: Actualizar pregunta (solo admin)
  if (req.method === 'PUT') {
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores pueden actualizar preguntas' });
    }

    const { id, prompt, options, correctOptionIndex, orderIndex } = req.body;
    
    if (!id || !isValidUUID(id)) {
      return res.status(400).json({ error: 'ID inválido' });
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
        return res.status(400).json({ error: 'Debe haber al menos 2 opciones' });
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
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }
    
    const result = await query(`
      UPDATE lms_questions SET ${updates.join(', ')} WHERE id = $1 RETURNING *
    `, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pregunta no encontrada' });
    }
    
    return res.status(200).json({ question: result.rows[0] });
  }

  // DELETE: Eliminar pregunta (solo admin)
  if (req.method === 'DELETE') {
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores pueden eliminar preguntas' });
    }

    const { id } = req.query;
    
    if (!id || !isValidUUID(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    await query('DELETE FROM lms_questions WHERE id = $1', [id]);
    
    return res.status(200).json({ message: 'Pregunta eliminada exitosamente' });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}

// ===================================================================
// PROGRESS - Ver progreso de usuarios (admin/supervisor)
// ===================================================================
async function handleProgress(req, res, user, deps) {
  const { query, isValidUUID } = deps;

  if (!['admin', 'supervisor'].includes(user.role)) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
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
          modules: []
        };
      }

      userMap[row.user_id].modules.push({
        moduleId: row.module_id,
        moduleTitle: row.module_title,
        moduleOrder: row.module_order,
        stageId: row.stage_id,
        stageName: row.stage_name,
        totalLessons: row.total_lessons,
        completedLessons: row.completed_lessons,
        completionPercentage: row.lessons_completion_percentage,
        quizPassed: row.quiz_passed,
        bestQuizScore: row.best_quiz_score,
        quizAttempts: row.quiz_attempts_count,
        lastQuizAttempt: row.last_quiz_attempt
      });
    });

    const users = Object.values(userMap);

    // Agregar estadísticas generales
    const stats = {
      totalUsers: users.length,
      totalModules: result.rows.length > 0 ? result.rows[0].module_order + 1 : 0,
      averageCompletion: result.rows.length > 0
        ? Math.round(result.rows.reduce((sum, r) => sum + parseFloat(r.lessons_completion_percentage || 0), 0) / result.rows.length)
        : 0
    };

    return successResponse(res, { users, stats });
  } else {
    // Si se especificó userId, retornar directamente los módulos
    return successResponse(res, { 
      progress: result.rows.map(row => ({
        moduleId: row.module_id,
        moduleTitle: row.module_title,
        moduleOrder: row.module_order,
        stageId: row.stage_id,
        stageName: row.stage_name,
        totalLessons: row.total_lessons,
        completedLessons: row.completed_lessons,
        completionPercentage: row.lessons_completion_percentage,
        quizPassed: row.quiz_passed,
        bestQuizScore: row.best_quiz_score,
        quizAttempts: row.quiz_attempts_count,
        lastQuizAttempt: row.last_quiz_attempt
      }))
    });
  }
}

// ===================================================================
// STAGES - CRUD de etapas (solo admin)
// ===================================================================
async function handleStages(req, res, user, deps) {
  const { query, validateRequired } = deps;

  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Solo administradores pueden gestionar etapas' });
  }

  // GET: Listar etapas
  if (req.method === 'GET') {
    const result = await query(`
      SELECT 
        s.id, s.name, s.description, s.order_index,
        s.created_at, s.updated_at,
        COUNT(DISTINCT m.id) as modules_count
      FROM lms_stages s
      LEFT JOIN lms_modules m ON m.stage_id = s.id
      GROUP BY s.id, s.name, s.description, s.order_index, s.created_at, s.updated_at
      ORDER BY s.order_index
    `);
    
    return res.status(200).json({ stages: result.rows });
  }

  // POST: Crear etapa
  if (req.method === 'POST') {
    const { name, description, orderIndex } = req.body;
    
    const validation = validateRequired(req.body, ['name', 'orderIndex']);
    if (!validation.valid) {
      return errorResponse(res, 400, 'Campos requeridos faltantes', { missing: validation.missing });
    }
    
    const result = await query(`
      INSERT INTO lms_stages (name, description, order_index)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [name, description || null, orderIndex]);
    
    return res.status(201).json({ stage: result.rows[0] });
  }

  // PUT: Actualizar etapa
  if (req.method === 'PUT') {
    const { id, name, description, orderIndex } = req.body;
    
    if (!id || !isValidUUID(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    const updates = [];
    const params = [id];
    let paramIndex = 2;
    
    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(name);
    }
    
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(description);
    }
    
    if (orderIndex !== undefined) {
      updates.push(`order_index = $${paramIndex++}`);
      params.push(orderIndex);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }
    
    const result = await query(`
      UPDATE lms_stages SET ${updates.join(', ')} WHERE id = $1 RETURNING *
    `, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Etapa no encontrada' });
    }
    
    return res.status(200).json({ stage: result.rows[0] });
  }

  // DELETE: Eliminar etapa
  if (req.method === 'DELETE') {
    const { id } = req.query;
    
    if (!id || !isValidUUID(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    // Verificar que no tenga módulos asociados
    const hasModules = await query('SELECT id FROM lms_modules WHERE stage_id = $1 LIMIT 1', [id]);
    if (hasModules.rows.length > 0) {
      return res.status(400).json({ error: 'No se puede eliminar una etapa con módulos asociados' });
    }
    
    await query('DELETE FROM lms_stages WHERE id = $1', [id]);
    
    return res.status(200).json({ message: 'Etapa eliminada exitosamente' });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}

// ===================================================================
// QUIZZES - CRUD de quizzes (admin/supervisor)
// ===================================================================
async function handleQuizzes(req, res, user, deps) {
  const { query, isValidUUID, validateRequired } = deps;

  if (!['admin', 'supervisor'].includes(user.role)) {
    return res.status(403).json({ error: 'Acceso denegado' });
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
    return res.status(200).json({ quizzes: result.rows });
  }

  // POST: Crear quiz (solo admin)
  if (req.method === 'POST') {
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores pueden crear quizzes' });
    }

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
      return res.status(400).json({ error: 'Este módulo ya tiene un quiz configurado' });
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
    
    return res.status(201).json({ quiz: result.rows[0] });
  }

  // PUT: Actualizar quiz (solo admin)
  if (req.method === 'PUT') {
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores pueden actualizar quizzes' });
    }

    const { id, passingScore, maxAttempts, cooldownMinutes } = req.body;
    
    if (!id || !isValidUUID(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    const updates = [];
    const params = [id];
    let paramIndex = 2;
    
    if (passingScore !== undefined) {
      updates.push(`passing_score = $${paramIndex++}`);
      params.push(passingScore);
    }
    
    if (maxAttempts !== undefined) {
      updates.push(`max_attempts = $${paramIndex++}`);
      params.push(maxAttempts);
    }
    
    if (cooldownMinutes !== undefined) {
      updates.push(`cooldown_minutes = $${paramIndex++}`);
      params.push(cooldownMinutes);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }
    
    const result = await query(`
      UPDATE lms_quizzes SET ${updates.join(', ')} WHERE id = $1 RETURNING *
    `, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz no encontrado' });
    }
    
    return res.status(200).json({ quiz: result.rows[0] });
  }

  // DELETE: Eliminar quiz (solo admin)
  if (req.method === 'DELETE') {
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores pueden eliminar quizzes' });
    }

    const { id } = req.query;
    
    if (!id || !isValidUUID(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    await query('DELETE FROM lms_quizzes WHERE id = $1', [id]);
    
    return res.status(200).json({ message: 'Quiz eliminado exitosamente' });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}



