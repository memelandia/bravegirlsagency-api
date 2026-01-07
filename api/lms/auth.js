// ===================================================================
// /api/lms/auth
// Endpoint consolidado para autenticación
// Rutas: /login, /logout, /me
// ===================================================================

module.exports = async (req, res) => {
  // CORS headers - SIEMPRE enviar primero, incluso si hay error
  const allowedOrigins = [
    'https://www.bravegirlsagency.com', 
    'https://bravegirlsagency.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ];
  const origin = req.headers.origin;
  
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

  try {
    // Cargar dependencias DENTRO del try-catch
    const { query } = require('../../lib/lms/db');
    const { verifyPassword, createSession, updateLastLogin, validateSession } = require('../../lib/lms/auth');
    const { parseCookies, setCookie, deleteCookie, errorResponse, successResponse, validateRequired, isValidEmail } = require('../../lib/lms/utils');
    const { parseBody } = require('../../lib/lms/bodyParser');
  
  // Parsear cookies
  req.cookies = parseCookies(req);
  
  // Parsear body si es POST
  if (req.method === 'POST') {
    req.body = await parseBody(req);
  }

    // Extraer el recurso de la URL: /api/lms/auth/login -> login
    const urlParts = req.url.split('?')[0].split('/');
    const action = urlParts[urlParts.length - 1];

    console.log('[LMS Auth] Action:', action, 'Method:', req.method);

    // Router interno por acción
    switch(action) {
      case 'login':
        return await handleLogin(req, res, { query, verifyPassword, createSession, updateLastLogin, setCookie, errorResponse, successResponse, validateRequired, isValidEmail });
      case 'logout':
        return await handleLogout(req, res, { deleteCookie, errorResponse, successResponse });
      case 'me':
        return await handleMe(req, res, { parseCookies, validateSession, errorResponse, successResponse });
      default:
        return res.status(404).json({ error: 'Acción no encontrada' });
    }
  } catch (error) {
    console.error('[LMS Auth] Error crítico:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor', 
      message: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
};

// ===================================================================
// LOGIN
// ===================================================================
async function handleLogin(req, res, deps) {
  const { query, verifyPassword, createSession, updateLastLogin, setCookie, errorResponse, successResponse, validateRequired, isValidEmail } = deps;
  
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

  // Buscar usuario por email
  const result = await query(
    'SELECT id, name, email, password_hash, role, active FROM lms_users WHERE email = $1',
    [email.toLowerCase()]
  );

  const user = result.rows[0];

  // Usuario no encontrado o inactivo
  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  if (!user.active) {
    return res.status(403).json({ error: 'Usuario inactivo. Contacta al administrador.' });
  }

  // Verificar contraseña
  const passwordValid = await verifyPassword(password, user.password_hash);
  if (!passwordValid) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
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

  return res.status(200).json({
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
async function handleLogout(req, res, deps) {
  const { deleteCookie } = deps;
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Eliminar cookie de sesión
  deleteCookie(res, 'lms_session');

  return res.status(200).json({ message: 'Logout exitoso' });
}

// ===================================================================
// ME (usuario actual), deps) {
  const { parseCookies, validateSession } = deps;
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Parsear cookies
  req.cookies = parseCookies(req);

  // Validar sesión
  const user = await validateSession(req);

  if (!user) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  // Retornar usuario (sin datos sensibles)
  return res.status(200).json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      last_login: user.last_login
    }
  });
}
      email: user.email,
      role: user.role,
      lastLogin: user.last_login
    }
  });
}
