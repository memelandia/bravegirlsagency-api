// ===================================================================
// /api/lms/auth
// Endpoint consolidado para autenticación
// Rutas: /login, /logout, /me
// ===================================================================

const { query } = require('./lib/db');
const { verifyPassword, createSession, updateLastLogin, validateSession } = require('./lib/auth');
const { parseCookies, setCookie, deleteCookie, errorResponse, successResponse, validateRequired, isValidEmail } = require('./lib/utils');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Extraer el recurso de la URL: /api/lms/auth/login -> login
    const urlParts = req.url.split('?')[0].split('/');
    const action = urlParts[urlParts.length - 1];

    // Router interno por acción
    switch(action) {
      case 'login':
        return await handleLogin(req, res);
      case 'logout':
        return await handleLogout(req, res);
      case 'me':
        return await handleMe(req, res);
      default:
        return errorResponse(res, 404, 'Acción no encontrada');
    }
  } catch (error) {
    console.error('Error en /api/lms/auth:', error);
    return errorResponse(res, 500, 'Error interno del servidor', { error: error.message });
  }
};

// ===================================================================
// LOGIN
// ===================================================================
async function handleLogin(req, res) {
  if (req.method !== 'POST') {
    return errorResponse(res, 405, 'Método no permitido');
  }

  const { email, password } = req.body;

  // Validar campos requeridos
  const validation = validateRequired(req.body, ['email', 'password']);
  if (!validation.valid) {
    return errorResponse(res, 400, 'Campos requeridos faltantes', { missing: validation.missing });
  }

  // Validar formato de email
  if (!isValidEmail(email)) {
    return errorResponse(res, 400, 'Email inválido');
  }

  // Buscar usuario por email
  const result = await query(
    'SELECT id, name, email, password_hash, role, active FROM lms_users WHERE email = $1',
    [email.toLowerCase()]
  );

  const user = result.rows[0];

  // Usuario no encontrado o inactivo
  if (!user) {
    return errorResponse(res, 401, 'Credenciales inválidas');
  }

  if (!user.active) {
    return errorResponse(res, 403, 'Usuario inactivo. Contacta al administrador.');
  }

  // Verificar contraseña
  const passwordValid = await verifyPassword(password, user.password_hash);
  if (!passwordValid) {
    return errorResponse(res, 401, 'Credenciales inválidas');
  }

  // Crear sesión
  const sessionToken = await createSession(user.id);

  // Actualizar last_login
  await updateLastLogin(user.id);

  // Setear cookie de sesión (httpOnly, Secure en producción)
  setCookie(res, 'lms_session', sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 86400 // 24 horas
  });

  return successResponse(res, {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    message: 'Login exitoso'
  });
}

// ===================================================================
// LOGOUT
// ===================================================================
async function handleLogout(req, res) {
  if (req.method !== 'POST') {
    return errorResponse(res, 405, 'Método no permitido');
  }

  // Eliminar cookie de sesión
  deleteCookie(res, 'lms_session');

  return successResponse(res, { message: 'Logout exitoso' });
}

// ===================================================================
// ME (usuario actual)
// ===================================================================
async function handleMe(req, res) {
  if (req.method !== 'GET') {
    return errorResponse(res, 405, 'Método no permitido');
  }

  // Parsear cookies
  req.cookies = parseCookies(req);

  // Validar sesión
  const user = await validateSession(req);

  if (!user) {
    return errorResponse(res, 401, 'No autorizado');
  }

  // Retornar usuario (sin datos sensibles)
  return successResponse(res, {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      lastLogin: user.last_login
    }
  });
}
