// ===================================================================
// GET /api/lms/auth/me
// Obtener datos del usuario actual
// ===================================================================

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

  } catch (error) {
    console.error('Error en /me:', error);
    return errorResponse(res, 500, 'Error interno del servidor', error.message);
  }
};
