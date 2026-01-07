// ===================================================================
// LMS Auth Handler
// Maneja: /auth/login, /auth/logout, /auth/me
// ===================================================================

module.exports = async (req, res, deps) => {
  const { query, verifyPassword, createSession, updateLastLogin, validateSession, parseCookies, setCookie, deleteCookie, isValidEmail, validateRequired, parseBody } = deps;

  try {
    // Extraer la acción de la URL: auth/login -> login
    const urlParts = req.url.split('?')[0].split('/');
    const action = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];

    console.log('[Auth Handler] Action:', action, 'URL:', req.url);

    // Router interno por acción
    switch(action) {
      case 'login':
        return await handleLogin(req, res, deps);
      case 'logout':
        return await handleLogout(req, res, deps);
      case 'me':
        return await handleMe(req, res, deps);
      default:
        return res.status(404).json({ error: 'Acción de auth no encontrada', action });
    }
  } catch (error) {
    console.error('[Auth Handler] Error:', error);
    return res.status(500).json({ error: 'Error en autenticación', message: error.message });
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
  const sessionToken = createSession(user.id);

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
