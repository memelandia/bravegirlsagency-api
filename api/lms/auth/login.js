// ===================================================================
// POST /api/lms/auth/login
// Login de usuarios del LMS
// ===================================================================

const { query } = require('../lib/db');
const { verifyPassword, createSession, updateLastLogin } = require('../lib/auth');
const { parseCookies, setCookie, errorResponse, successResponse, validateRequired, isValidEmail } = require('../lib/utils');

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
      return errorResponse(res, 403, 'Usuario desactivado. Contacta al administrador.');
    }

    // Verificar contraseña
    const isValidPassword = await verifyPassword(password, user.password_hash);

    if (!isValidPassword) {
      return errorResponse(res, 401, 'Credenciales inválidas');
    }

    // Actualizar último login
    await updateLastLogin(user.id);

    // Crear sesión
    const sessionToken = createSession(user.id);

    // Set cookie httpOnly
    setCookie(res, 'lms_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 horas
    });

    // Retornar datos del usuario (sin password)
    return successResponse(res, {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      message: 'Login exitoso'
    });

  } catch (error) {
    console.error('Error en login:', error);
    return errorResponse(res, 500, 'Error interno del servidor', error.message);
  }
};
