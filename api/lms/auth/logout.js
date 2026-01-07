// ===================================================================
// POST /api/lms/auth/logout
// Logout de usuarios del LMS
// ===================================================================

const { deleteCookie, successResponse } = require('../lib/utils');

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
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // Eliminar cookie de sesión
    deleteCookie(res, 'lms_session');

    return successResponse(res, { message: 'Logout exitoso' });

  } catch (error) {
    console.error('Error en logout:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};
