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
    const pathClean = path.replace('admin/', '').replace(/^\/+|\/+$/g, ''); // Remover slashes al inicio/fin
    const resource = pathClean.split('/')[0];

    console.log('[Admin Handler] Path:', path, 'PathClean:', pathClean, 'Resource:', resource, 'Method:', req.method, 'Query:', req.query);

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
      case 'reports':
        return await handleReports(req, res, user, deps);
      case 'completions':
        return await handleCompletions(req, res, user, deps);
      case 'analytics':
        return await handleAnalytics(req, res, user, deps);
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
  const { query, hashPassword, generateTempPassword, isValidEmail, isValidUUID, validateRequired, successResponse, errorResponse } = deps;

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
    const { name, email, role, password, deadlineDays } = req.body;
    
    const validation = validateRequired(req.body, ['name', 'email', 'role']);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Campos requeridos faltantes', missing: validation.missing });
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
    
    // Construir query dinámicamente según si hay deadline o no
    let insertQuery = `
      INSERT INTO lms_users (name, email, role, password_hash, active, enrollment_date${deadlineDays ? ', course_deadline' : ''})
      VALUES ($1, $2, $3, $4, true, NOW()${deadlineDays ? `, NOW() + INTERVAL '${parseInt(deadlineDays)} days'` : ''})
      RETURNING id, name, email, role, active, enrollment_date, course_deadline, created_at
    `;
    
    const result = await query(insertQuery, [name, email.toLowerCase(), role, passwordHash]);
    
    return successResponse(res, {
      user: result.rows[0],
      temporaryPassword: password ? 'Usuario creado con contraseña manual' : finalPassword,
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
      return res.status(400).json({ error: 'Campos requeridos faltantes', missing: validation.missing });
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
    
    // Verificar si hay progreso de usuarios asociado a lecciones de este módulo
    // Esto previene borrar módulos que ya han sido cursados, protegiendo el historial
    const hasProgress = await query(`
      SELECT 1 FROM lms_progress_lessons pl
      JOIN lms_lessons l ON l.id = pl.lesson_id
      WHERE l.module_id = $1
      LIMIT 1
    `, [id]);

    if (hasProgress.rows.length > 0) {
      return res.status(400).json({ error: 'No se puede eliminar este módulo porque hay usuarios con progreso registrado en él. Desactívalo (unpublish) en su lugar.' });
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

    const { moduleId, title, type, orderIndex, loomUrl, textContent, estimatedDurationSeconds, minTimeRequiredSeconds } = req.body;
    
    const validation = validateRequired(req.body, ['moduleId', 'title', 'type', 'orderIndex']);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Campos requeridos faltantes', missing: validation.missing });
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
      INSERT INTO lms_lessons (module_id, title, type, order_index, loom_url, text_content, estimated_duration_seconds, min_time_required_seconds)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [moduleId, title, type, orderIndex, finalLoomUrl, type === 'text' ? textContent : null, 
        estimatedDurationSeconds || null, minTimeRequiredSeconds || null]);
    
    return res.status(201).json({ lesson: result.rows[0] });
  }

  // PUT: Actualizar lección (solo admin)
  if (req.method === 'PUT') {
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores pueden actualizar lecciones' });
    }

    const { id, title, type, orderIndex, loomUrl, textContent, estimatedDurationSeconds, minTimeRequiredSeconds } = req.body;
    
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
    
    if (estimatedDurationSeconds !== undefined) {
      updates.push(`estimated_duration_seconds = $${paramIndex++}`);
      params.push(estimatedDurationSeconds || null);
    }
    
    if (minTimeRequiredSeconds !== undefined) {
      updates.push(`min_time_required_seconds = $${paramIndex++}`);
      params.push(minTimeRequiredSeconds || null);
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

    let { quizId, moduleId, prompt, options, correctOptionIndex, orderIndex } = req.body;
    
    // Si envían moduleId en vez de quizId, buscar o crear el quiz automáticamente
    if (!quizId && moduleId) {
      if (!isValidUUID(moduleId)) {
        return res.status(400).json({ error: 'ID de módulo inválido' });
      }

      // Buscar quiz existente
      let quizResult = await query('SELECT id FROM lms_quizzes WHERE module_id = $1', [moduleId]);
      
      if (quizResult.rows.length > 0) {
        quizId = quizResult.rows[0].id;
      } else {
        // AUTO-CREAR QUIZ con valores por defecto si no existe
        // Esto permite agregar preguntas directamente sin configurar el quiz antes
        quizResult = await query(`
          INSERT INTO lms_quizzes (module_id, passing_score, max_attempts, cooldown_minutes)
          VALUES ($1, 80, 3, 60)
          RETURNING id
        `, [moduleId]);
        quizId = quizResult.rows[0].id;
      }
    }
    
    // Validar requeridos (quizId ya debería estar seteado)
    if (!quizId || !prompt || !options || correctOptionIndex === undefined || orderIndex === undefined) {
      return res.status(400).json({ error: 'Campos requeridos faltantes (quizId/moduleId, prompt, options...)' });
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
  const { query, isValidUUID, successResponse, errorResponse } = deps;

  if (!['admin', 'supervisor'].includes(user.role)) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { userId, moduleId, status } = req.query;

  // Reemplazamos el uso de la VISTA lms_user_module_progress por la query directa
  // Esto es para evitar el error de MAX(boolean) que existe en la definición actual de la vista en BD
  // y para asegurar consistencia con BOOL_OR.
  let sql = `
    SELECT 
      u.id as user_id,
      u.name as user_name,
      u.email as user_email,
      m.id as module_id,
      m.title as module_title,
      m.stage_id,
      s.name as stage_name,
      m.order_index as module_order,
      COUNT(DISTINCT l.id) as total_lessons,
      COUNT(DISTINCT pl.lesson_id) as completed_lessons,
      CASE 
        WHEN COUNT(DISTINCT l.id) > 0 
        THEN ROUND((COUNT(DISTINCT pl.lesson_id)::DECIMAL / COUNT(DISTINCT l.id)) * 100, 2)
        ELSE 0
      END as lessons_completion_percentage,
      BOOL_OR(qa.passed) as quiz_passed,
      MAX(qa.score) as best_quiz_score,
      COUNT(qa.id) as quiz_attempts_count,
      MAX(qa.created_at) as last_quiz_attempt
    FROM lms_users u
    CROSS JOIN lms_modules m
    LEFT JOIN lms_stages s ON m.stage_id = s.id
    LEFT JOIN lms_lessons l ON l.module_id = m.id
    LEFT JOIN lms_progress_lessons pl ON pl.lesson_id = l.id AND pl.user_id = u.id
    LEFT JOIN lms_quizzes q ON q.module_id = m.id
    LEFT JOIN lms_quiz_attempts qa ON qa.quiz_id = q.id AND qa.user_id = u.id
    WHERE u.role = 'chatter' AND u.active = true AND m.published = true
  `;
  
  const params = [];

  // Los filtros se aplican sobre el resultado agrupado, por lo que usamos HAVING o una subquery wrapping.
  // Sin embargo, para mantenerlo simple y dado que los filtros previos eran WHERE sobre la vista,
  // aquí debemos tener cuidado. La vista ya hacía el GROUP BY.
  // Vamos a construir la query con los filtros aplicados en el WHERE antes del GROUP BY si es posible,
  // o usar HAVING para condiciones agregadas.
  
  // Filtros de ID directos (en WHERE)
  if (userId) {
    params.push(userId);
    sql += ` AND u.id = $${params.length}`;
  }

  if (moduleId) {
    params.push(moduleId);
    sql += ` AND m.id = $${params.length}`;
  }

  // GROUP BY necesario
  sql += `
    GROUP BY u.id, u.name, u.email, m.id, m.title, m.stage_id, s.name, m.order_index
  `;

  // Filtros de estado (requieren HAVING porque usan agregaciones o resultados calculados)
  if (status) {
    if (status === 'not_started') {
      sql += ` HAVING COUNT(DISTINCT pl.lesson_id) = 0`;
    } else if (status === 'stuck') {
      sql += ` HAVING COUNT(DISTINCT pl.lesson_id) > 0 AND COUNT(DISTINCT pl.lesson_id) < COUNT(DISTINCT l.id)`;
    } else if (status === 'completed') {
      sql += ` HAVING BOOL_OR(qa.passed) = true`;
    } else if (status === 'pending_quiz') {
      sql += ` HAVING COUNT(DISTINCT pl.lesson_id) = COUNT(DISTINCT l.id) AND (BOOL_OR(qa.passed) IS NULL OR BOOL_OR(qa.passed) = false)`;
    }
  }

  sql += ' ORDER BY u.name, m.order_index';

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

    // Calculate aggregated stats for each user (so frontend doesn't get undefined)
    users.forEach(u => {
        let totalMods = u.modules.length;
        let completedMods = 0;
        let totalProg = 0;

        u.modules.forEach(m => {
            // Un modulo cuenta como completado si tiene quiz aprobado O todas las lecciones vistas (si no tiene quiz)
            // Para simplificar aqui, usamos la logica de lecciones completadas O quiz aprobado
            // Pero como no tenemos info facil de si TIENE quiz o no aqui (solo quizPassed), 
            // asumiremos completado = 100% lecciones + (quizPassed si existe quiz)
            // Mas simple: Basarnos en status logica del frontend.
            
            // Si tiene quizPassed = true, esta completado.
            // Si el % de lecciones es 100 y quizPassed es null (no intento) o true, podria estar completado.
            
            // Vamos a definir completado como:
            const isCompleted = (m.quizPassed === true) || (parseFloat(m.completionPercentage) >= 100 && (m.quizPassed === null || m.quizPassed === true));
            if (isCompleted) completedMods++;
            
            totalProg += parseFloat(m.completionPercentage) || 0;
        });

        u.totalModules = totalMods;
        u.completedModules = completedMods;
        u.overallProgress = totalMods > 0 ? Math.round(totalProg / totalMods) : 0;
    });

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
  const { query, isValidUUID, validateRequired } = deps;

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
      return res.status(400).json({ error: 'Campos requeridos faltantes', missing: validation.missing });
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
      return res.status(400).json({ error: 'Campos requeridos faltantes', missing: validation.missing });
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

// ===================================================================
// REPORTS - Reportes individuales de rendimiento
// ===================================================================
async function handleReports(req, res, user, deps) {
  const { query, isValidUUID } = deps;

  if (user.role !== 'admin' && user.role !== 'supervisor') {
    return res.status(403).json({ error: 'Solo admins y supervisores pueden ver reportes' });
  }

  // GET /admin/reports/user/:userId - Reporte individual detallado
  if (req.method === 'GET') {
    // Extraer userId de la path: "reports/user/[uuid]"
    const pathParts = req.lmsPath.split('/');
    if (pathParts.length < 3 || pathParts[1] !== 'user') {
      return res.status(400).json({ error: 'Path inválido. Use: /admin/reports/user/:userId' });
    }

    const userId = pathParts[2];
    
    if (!isValidUUID(userId)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    // 1. Información del usuario
    const userResult = await query(
      'SELECT id, name, email, role, created_at, last_login FROM lms_users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const userData = userResult.rows[0];

    // 2. Progreso global del curso
    const totalModulesResult = await query(
      'SELECT COUNT(*) as total FROM lms_modules WHERE published = true'
    );
    const totalModules = parseInt(totalModulesResult.rows[0].total);

    const completedModulesResult = await query(`
      SELECT COUNT(DISTINCT m.id) as completed
      FROM lms_modules m
      INNER JOIN lms_lessons l ON l.module_id = m.id
      INNER JOIN lms_progress_lessons pl ON pl.lesson_id = l.id
      WHERE pl.user_id = $1 AND m.published = true
      GROUP BY m.id
      HAVING COUNT(DISTINCT l.id) = COUNT(DISTINCT pl.lesson_id)
    `, [userId]);
    const completedModules = completedModulesResult.rows.length;
    const courseProgress = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

    // 3. Etapas completadas
    const stagesResult = await query(`
      SELECT DISTINCT s.id, s.name, s.order_index
      FROM lms_stages s
      INNER JOIN lms_modules m ON m.stage_id = s.id
      INNER JOIN lms_quizzes q ON q.module_id = m.id
      INNER JOIN lms_quiz_attempts qa ON qa.quiz_id = q.id
      WHERE qa.user_id = $1 AND qa.passed = true
      ORDER BY s.order_index
    `, [userId]);
    const stagesCompleted = stagesResult.rows.map(s => ({ id: s.id, name: s.name, order: s.order_index }));

    // 4. Scores por módulo
    const moduleScoresResult = await query(`
      SELECT 
        m.id,
        m.title as module,
        q.id as quiz_id,
        MAX(qa.score) as score,
        COUNT(qa.id) as attempts,
        BOOL_OR(qa.passed) as passed
      FROM lms_modules m
      LEFT JOIN lms_quizzes q ON q.module_id = m.id
      LEFT JOIN lms_quiz_attempts qa ON qa.quiz_id = q.id AND qa.user_id = $1
      WHERE m.published = true
      GROUP BY m.id, m.title, q.id, m.order_index
      ORDER BY m.order_index
    `, [userId]);

    const moduleScores = moduleScoresResult.rows.map(row => ({
      moduleId: row.id,
      module: row.module,
      score: row.score || 0,
      attempts: parseInt(row.attempts),
      passed: row.passed || false
    }));

    // 5. Fortalezas y debilidades (módulos con score > 85 vs < 70)
    const strengths = moduleScores.filter(m => m.score >= 85 && m.passed).map(m => m.module);
    const weaknesses = moduleScores.filter(m => m.score < 70 || (m.attempts > 0 && !m.passed)).map(m => m.module);

    // 6. Tiempo promedio (si tenemos tracking de tiempo - por ahora estimado)
    const totalTimeResult = await query(`
      SELECT 
        COUNT(DISTINCT pl.lesson_id) as completed_lessons,
        COALESCE(SUM(pl.time_spent_seconds), 0) as total_seconds
      FROM lms_progress_lessons pl
      WHERE pl.user_id = $1
    `, [userId]);
    
    const { completed_lessons, total_seconds } = totalTimeResult.rows[0];
    const totalHours = Math.round((parseInt(total_seconds) / 3600) * 10) / 10;
    const avgMinutesPerLesson = completed_lessons > 0 
      ? Math.round((parseInt(total_seconds) / completed_lessons) / 60) 
      : 0;

    // 7. Recomendación de contratación (AI suggestion)
    const overallScore = moduleScores.length > 0
      ? Math.round(moduleScores.reduce((sum, m) => sum + m.score, 0) / moduleScores.length)
      : 0;
    
    const allModulesAttempted = moduleScores.every(m => m.attempts > 0);
    const allModulesPassed = moduleScores.every(m => m.passed);
    const avgAttempts = moduleScores.length > 0
      ? moduleScores.reduce((sum, m) => sum + m.attempts, 0) / moduleScores.length
      : 0;

    const recommendHire = 
      allModulesPassed && 
      overallScore >= 80 && 
      avgAttempts <= 2 && 
      weaknesses.length === 0;

    // 8. Verificar si tiene completación registrada
    const completionResult = await query(
      'SELECT completed_at, overall_score, approved, certificate_issued, hired FROM lms_course_completions WHERE user_id = $1',
      [userId]
    );
    const completion = completionResult.rows.length > 0 ? completionResult.rows[0] : null;

    // Respuesta final
    return res.status(200).json({
      user: userData,
      courseProgress,
      totalModules,
      completedModules,
      stagesCompleted,
      moduleScores,
      strengths,
      weaknesses,
      timeTracking: {
        totalTimeInCourse: `${totalHours} horas`,
        avgTimePerLesson: `${avgMinutesPerLesson} min`,
        completedLessons: parseInt(completed_lessons)
      },
      performance: {
        overallScore,
        allModulesAttempted,
        allModulesPassed,
        avgAttempts: Math.round(avgAttempts * 10) / 10
      },
      recommendHire,
      completion
    });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}

// ===================================================================
// COMPLETIONS - Gestión de completaciones del curso
// ===================================================================
async function handleCompletions(req, res, user, deps) {
  const { query, isValidUUID } = deps;

  if (user.role !== 'admin' && user.role !== 'supervisor') {
    return res.status(403).json({ error: 'Solo admins y supervisores pueden ver completaciones' });
  }

  // GET /admin/completions - Listar todas las completaciones
  if (req.method === 'GET') {
    const { approved, hired } = req.query;

    let sql = `
      SELECT 
        cc.id,
        cc.user_id,
        cc.completed_at,
        cc.overall_score,
        cc.approved,
        cc.certificate_issued,
        cc.certificate_url,
        cc.hired,
        cc.hired_at,
        cc.notes,
        u.name as user_name,
        u.email as user_email
      FROM lms_course_completions cc
      INNER JOIN lms_users u ON u.id = cc.user_id
      WHERE 1=1
    `;
    const params = [];

    if (approved !== undefined) {
      params.push(approved === 'true');
      sql += ` AND cc.approved = $${params.length}`;
    }

    if (hired !== undefined) {
      params.push(hired === 'true');
      sql += ` AND cc.hired = $${params.length}`;
    }

    sql += ' ORDER BY cc.completed_at DESC';

    const result = await query(sql, params);

    return res.status(200).json({ completions: result.rows });
  }

  // PATCH /admin/completions?id=xxx - Actualizar completación (hired, notes, certificate)
  if (req.method === 'PATCH') {
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores pueden actualizar completaciones' });
    }

    const { id } = req.query;
    const { hired, hired_at, notes, certificate_issued, certificate_url } = req.body;

    if (!id || !isValidUUID(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const updates = [];
    const params = [id];

    if (hired !== undefined) {
      params.push(hired);
      updates.push(`hired = $${params.length}`);
      
      if (hired && !hired_at) {
        params.push(new Date().toISOString());
        updates.push(`hired_at = $${params.length}`);
      }
    }

    if (hired_at) {
      params.push(hired_at);
      updates.push(`hired_at = $${params.length}`);
    }

    if (notes !== undefined) {
      params.push(notes);
      updates.push(`notes = $${params.length}`);
    }

    if (certificate_issued !== undefined) {
      params.push(certificate_issued);
      updates.push(`certificate_issued = $${params.length}`);
    }

    if (certificate_url !== undefined) {
      params.push(certificate_url);
      updates.push(`certificate_url = $${params.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    params.push(new Date().toISOString());
    updates.push(`updated_at = $${params.length}`);

    const sql = `UPDATE lms_course_completions SET ${updates.join(', ')} WHERE id = $1 RETURNING *`;
    const result = await query(sql, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Completación no encontrada' });
    }

    return res.status(200).json({ completion: result.rows[0] });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}

// ===================================================================
// GET /admin/analytics - Dashboard de métricas agregadas
// ===================================================================
async function handleAnalytics(req, res, user, deps) {
  const { query } = deps;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  if (user.role !== 'admin' && user.role !== 'supervisor') {
    return res.status(403).json({ error: 'Solo admins y supervisores pueden ver analytics' });
  }

  try {
    // 1. Total de estudiantes
    const totalStudentsResult = await query(`
      SELECT COUNT(*) as total FROM lms_users WHERE role = 'chatter'
    `);
    const totalStudents = parseInt(totalStudentsResult.rows[0].total);

    // 2. Estudiantes activos (últimos 7 días) - tolerante a datos vacíos
    const activeStudentsResult = await query(`
      SELECT COUNT(DISTINCT user_id) as active
      FROM lms_progress_lessons
      WHERE completed_at > NOW() - INTERVAL '7 days'
    `).catch(() => ({ rows: [{ active: 0 }] }));
    const activeStudents = parseInt(activeStudentsResult.rows[0].active) || 0;

    // 3. Tasa de completación (usuarios que completaron todos los módulos)
    const completionRateResult = await query(`
      SELECT 
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT CASE 
          WHEN (
            SELECT COUNT(DISTINCT m.id) 
            FROM lms_modules m 
            WHERE m.published = true
          ) = (
            SELECT COUNT(DISTINCT qa.module_id)
            FROM lms_quiz_attempts qa
            WHERE qa.user_id = u.id AND qa.passed = true
          ) THEN u.id 
        END) as completed_users
      FROM lms_users u
      WHERE u.role = 'chatter'
    `);
    const completionRate = totalStudents > 0 
      ? Math.round((parseInt(completionRateResult.rows[0].completed_users) / totalStudents) * 100)
      : 0;

    // 4. Tiempo promedio de completación - tolerante si tabla no existe
    let avgCompletionTime = 'N/A';
    try {
      const avgCompletionTimeResult = await query(`
        SELECT 
          AVG(EXTRACT(EPOCH FROM (cc.completed_at - u.created_at)) / 86400) as avg_days
        FROM lms_course_completions cc
        JOIN lms_users u ON u.id = cc.user_id
        WHERE cc.approved = true
      `);
      const avgDays = parseFloat(avgCompletionTimeResult.rows[0].avg_days) || 0;
      avgCompletionTime = avgDays > 0 ? `${avgDays.toFixed(1)} días` : 'N/A';
    } catch (error) {
      console.log('[Analytics] lms_course_completions no existe, usando N/A');
    }

    // 5. Score promedio general
    const avgScoreResult = await query(`
      SELECT AVG(score) as avg_score
      FROM lms_quiz_attempts
      WHERE passed = true
    `);
    const avgScore = Math.round(parseFloat(avgScoreResult.rows[0].avg_score) || 0);

    // 6. Tasa de aprobación (% con score >= 80)
    const passRateResult = await query(`
      SELECT 
        COUNT(*) as total_attempts,
        COUNT(CASE WHEN passed = true THEN 1 END) as passed_attempts
      FROM lms_quiz_attempts
    `);
    const passRate = parseInt(passRateResult.rows[0].total_attempts) > 0
      ? Math.round((parseInt(passRateResult.rows[0].passed_attempts) / parseInt(passRateResult.rows[0].total_attempts)) * 100)
      : 0;

    // 7. Tasa de abandono (sin actividad en 14 días)
    const dropoutRateResult = await query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE 
          WHEN NOT EXISTS (
            SELECT 1 FROM lms_progress_lessons pl
            WHERE pl.user_id = u.id 
            AND pl.completed_at > NOW() - INTERVAL '14 days'
          ) 
          AND NOT EXISTS (
            SELECT 1 FROM lms_course_completions cc
            WHERE cc.user_id = u.id
          )
          THEN 1 
        END) as dropout_users
      FROM lms_users u
      WHERE u.role = 'chatter'
      AND u.created_at < NOW() - INTERVAL '14 days'
    `);
    const dropoutRate = parseInt(dropoutRateResult.rows[0].total_users) > 0
      ? Math.round((parseInt(dropoutRateResult.rows[0].dropout_users) / parseInt(dropoutRateResult.rows[0].total_users)) * 100)
      : 0;

    // 8. Módulo más difícil (menor score promedio)
    const difficultModuleResult = await query(`
      SELECT 
        m.title,
        AVG(qa.score) as avg_score
      FROM lms_quiz_attempts qa
      JOIN lms_quizzes q ON q.id = qa.quiz_id
      JOIN lms_modules m ON m.id = q.module_id
      GROUP BY m.id, m.title
      ORDER BY avg_score ASC
      LIMIT 1
    `);
    const mostDifficultModule = difficultModuleResult.rows[0]?.title || 'N/A';

    // 9. Módulo más fácil (mayor score promedio)
    const easiestModuleResult = await query(`
      SELECT 
        m.title,
        AVG(qa.score) as avg_score
      FROM lms_quiz_attempts qa
      JOIN lms_quizzes q ON q.id = qa.quiz_id
      JOIN lms_modules m ON m.id = q.module_id
      GROUP BY m.id, m.title
      ORDER BY avg_score DESC
      LIMIT 1
    `);
    const easiestModule = easiestModuleResult.rows[0]?.title || 'N/A';

    // 10. Horarios pico de estudio (horas con más actividad)
    const peakHoursResult = await query(`
      SELECT 
        EXTRACT(HOUR FROM completed_at) as hour,
        COUNT(*) as activity_count
      FROM lms_progress_lessons
      WHERE completed_at > NOW() - INTERVAL '30 days'
        AND completed_at IS NOT NULL
      GROUP BY hour
      ORDER BY activity_count DESC
      LIMIT 3
    `).catch(() => ({ rows: [] }));
    const peakStudyHours = peakHoursResult.rows.length > 0 
      ? peakHoursResult.rows.map(row => {
          const hour = parseInt(row.hour);
          return `${hour.toString().padStart(2, '0')}:00-${(hour + 1).toString().padStart(2, '0')}:00`;
        }) - simplificado sin tiempo (requiere columnas nuevas)
    const moduleStatsResult = await query(`
      SELECT 
        m.title as module,
        ROUND(AVG(qa.score)) as avg_score,
        ROUND(AVG(attempts_count.attempts), 1) as avg_attempts
      FROM lms_modules m
      LEFT JOIN lms_quizzes q ON q.module_id = m.id
      LEFT JOIN lms_quiz_attempts qa ON qa.quiz_id = q.id AND qa.passed = true
      LEFT JOIN (
        SELECT 
          q.module_id,
          qa_inner.user_id,
          COUNT(*) as attempts
        FROM lms_quiz_attempts qa_inner
        JOIN lms_quizzes q ON q.id = qa_inner.quiz_id
        GROUP BY q.module_id, qa_inner.user_id
      ) attempts_count ON attempts_count.module_id = m.id AND attempts_count.user_id = qa.user_id
      WHERE m.published = true
      GROUP BY m.id, m.title, m.order_index
      ORDER BY m.order_index
    `).catch(() => ({ rows: [] }));
    
    const moduleStats = moduleStatsResult.rows.map(row => ({
      module: row.module,
      avgScore: parseInt(row.avg_score) || 0,
      avgAttempts: parseFloat(row.avg_attempts) || 0,
      avgTimeToComplete: 'N/A' // Requiere migrate-time-tracking.sql
      avgScore: parseInt(row.avg_score) || 0,
      avgAttempts: parseFloat(row.avg_attempts) || 0,
      avgTimeToComplete: row.avg_time_minutes ? `${Math.round(row.avg_time_minutes)} min` : 'N/A'
    }));

    // Respuesta completa
    return res.status(200).json({
      totalStudents,
      activeStudents,
      completionRate,
      avgCompletionTime,
      avgScore,
      passRate,
      dropoutRate,
      mostDifficultModule,
      easiestModule,
      peakStudyHours,
      moduleStats
    });

  } catch (error) {
    console.error('[Analytics] Error:', error);
    return res.status(500).json({ error: 'Error al obtener analytics', message: error.message });
  }
}



