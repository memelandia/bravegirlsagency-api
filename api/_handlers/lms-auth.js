// ===================================================================
// LMS Auth Handler
// Maneja: /auth/login, /auth/logout, /auth/me
// ===================================================================

module.exports = async (req, res, deps) => {
  const { query, verifyPassword, createSession, updateLastLogin, validateSession, getUserByEmail, parseCookies, setCookie, deleteCookie, isValidEmail, validateRequired, parseBody } = deps;

  try {
    // Manejar preflight CORS (OPTIONS)
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', 'https://bravegirlsagency.com');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, X-Requested-With');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      return res.status(200).end();
    }

    // Usar el path limpio que viene de api/lms.js
    const path = req.lmsPath || '';
    const action = path.replace('auth/', '');

    console.log('[Auth Handler] Path:', path, 'Action:', action, 'Method:', req.method);

    // Router interno por acción
    switch(action) {
      case 'login':
        return await handleLogin(req, res, deps);
      case 'logout':
        return await handleLogout(req, res, deps);
      case 'me':
        return await handleMe(req, res, deps);
      case 'complete-onboarding':
        return await handleCompleteOnboarding(req, res, deps);
      default:
        return res.status(404).json({ error: 'Acción de auth no encontrada', action, path });
    }
  } catch (error) {
    console.error('[Auth Handler] Error:', error);
    return res.status(500).json({ error: 'Error en autenticación', message: error.message, stack: error.stack });
  }
};

// ===================================================================
// LOGIN
// ===================================================================
async function handleLogin(req, res, deps) {
  const { query, verifyPassword, createSession, updateLastLogin, getUserByEmail, setCookie, validateRequired, isValidEmail } = deps;
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { email, password } = req.body;

  // Validar campos requeridos
  const validation = validateRequired(req.body, ['email', 'password']);
  if (!validation.valid) {
    return res.status(400).json({ error: 'Campos requeridos faltantes', missing: validation.missing });
  }

  // Validar formato de email
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  // Buscar usuario por email (primero campos obligatorios)
  let result = await query(
    'SELECT id, name, email, password_hash, role, active, first_login, onboarding_completed_at, must_change_password FROM lms_users WHERE email = $1',
    [email.toLowerCase()]
  );

  const user = result.rows[0];

  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  // Intentar obtener campos opcionales (course_deadline, enrollment_date)
  // Si no existen las columnas, ignorar el error
  try {
    const deadlineResult = await query(
      'SELECT course_deadline, enrollment_date FROM lms_users WHERE id = $1',
      [user.id]
    );
    if (deadlineResult.rows[0]) {
      user.course_deadline = deadlineResult.rows[0].course_deadline;
      user.enrollment_date = deadlineResult.rows[0].enrollment_date;
    }
  } catch (error) {
    // Columnas course_deadline/enrollment_date no existen - ignorar
    console.log('course_deadline/enrollment_date columns not found');
  }

  if (!user.active) {
    return res.status(403).json({ error: 'Usuario inactivo. Contacta al administrador.' });
  }

  // Verificar contraseña
  const passwordValid = await verifyPassword(password, user.password_hash);
  if (!passwordValid) {
    console.log('[Login] Invalid password for user:', email);
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  console.log('[Login] Password valid for user:', email);

  // Crear sesión
  const sessionToken = createSession(user.id);
  console.log('[Login] Session token created for user:', user.id);

  // Actualizar last_login
  await updateLastLogin(user.id);

  // Setear cookie de sesión
  setCookie(res, 'lms_session', sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 86400 * 1000, // 24 horas (en milisegundos)
    path: '/',
    domain: '.bravegirlsagency.com' // Permitir subdominios
  });
  
  console.log('[Login] Cookie set for user:', email, 'Role:', user.role, 'Token length:', sessionToken.length);

  // Calcular días restantes si hay deadline
  let daysRemaining = null;
  let deadlineExpired = false;
  if (user.course_deadline) {
    const now = new Date();
    const deadline = new Date(user.course_deadline);
    const diffTime = deadline - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    daysRemaining = diffDays;
    deadlineExpired = diffDays < 0;
  }

  // Verificar si completó el curso completo (tolerante a errores si tabla no existe)
  let courseCompleted = false;
  try {
    const completionResult = await query(
      'SELECT id FROM lms_course_completions WHERE user_id = $1',
      [user.id]
    );
    courseCompleted = completionResult.rows.length > 0;
  } catch (error) {
    // Tabla lms_course_completions aún no existe - ignorar error
    console.log('lms_course_completions table not found, assuming not completed');
  }

  return res.status(200).json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      first_login: user.first_login,
      onboarding_completed_at: user.onboarding_completed_at,
      must_change_password: user.must_change_password,
      course_deadline: user.course_deadline,
      enrollment_date: user.enrollment_date,
      days_remaining: daysRemaining,
      deadline_expired: deadlineExpired,
      course_completed: courseCompleted
    },
    message: 'Login exitoso'
  });
}

// ===================================================================
// LOGOUT
// ===================================================================
async function handleLogout(req, res, deps) {
  const { setCookie } = deps;
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Eliminar cookie explícitamente con los mismos atributos de seguridad
  setCookie(res, 'lms_session', '', {
    maxAge: 0,
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/'
  });

  return res.status(200).json({ message: 'Logout exitoso' });
}

// ===================================================================
// ME (usuario actual)
// ===================================================================
async function handleMe(req, res, deps) {
  const { parseCookies, validateSession } = deps;
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  req.cookies = parseCookies(req);

  // Debug: log cookies
  console.log('[Auth /me] Cookies received:', req.cookies ? Object.keys(req.cookies) : 'none');
  console.log('[Auth /me] lms_session cookie:', req.cookies?.lms_session ? 'present' : 'missing');

  const user = await validateSession(req);

  if (!user) {
    console.log('[Auth /me] Session validation failed - no user found');
    return res.status(401).json({ 
      error: 'No autorizado',
      details: 'Sesión inválida o expirada. Por favor, inicia sesión nuevamente.'
    });
  }

  console.log('[Auth /me] User validated:', user.email, user.role);

  // Calcular días restantes si hay deadline
  let daysRemaining = null;
  let deadlineExpired = false;
  if (user.course_deadline) {
    const now = new Date();
    const deadline = new Date(user.course_deadline);
    const diffTime = deadline - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    daysRemaining = diffDays;
    deadlineExpired = diffDays < 0;
  }

  // Verificar si completó el curso completo (tolerante a errores si tabla no existe)
  let courseCompleted = false;
  try {
    const completionResult = await query(
      'SELECT id FROM lms_course_completions WHERE user_id = $1',
      [user.id]
    );
    courseCompleted = completionResult.rows.length > 0;
  } catch (error) {
    // Tabla lms_course_completions aún no existe - ignorar error
    console.log('lms_course_completions table not found, assuming not completed');
  }

  return res.status(200).json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      last_login: user.last_login,
      first_login: user.first_login,
      onboarding_completed_at: user.onboarding_completed_at,
      must_change_password: user.must_change_password,
      course_deadline: user.course_deadline,
      enrollment_date: user.enrollment_date,
      days_remaining: daysRemaining,
      deadline_expired: deadlineExpired,
      course_completed: courseCompleted
    }
  });
}

// ===================================================================
// COMPLETE ONBOARDING
// ===================================================================
async function handleCompleteOnboarding(req, res, deps) {
  const { query, parseCookies, validateSession } = deps;
  
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  req.cookies = parseCookies(req);
  const user = await validateSession(req);

  if (!user) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  // Marcar onboarding como completado
  await query(
    `UPDATE lms_users 
     SET 
       first_login = false,
       onboarding_completed_at = NOW(),
       updated_at = NOW()
     WHERE id = $1`,
    [user.id]
  );

  return res.status(200).json({
    message: 'Onboarding completado',
    onboarding_completed_at: new Date().toISOString()
  });
}

