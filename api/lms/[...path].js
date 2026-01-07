// ===================================================================
// /api/lms/[...path]
// Catch-all router para LMS
// Rutea a auth, admin o chatter según la URL
// ===================================================================

module.exports = async (req, res) => {
  // CORS headers - SIEMPRE enviar primero
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Obtener la ruta completa desde query params de Vercel
    const path = req.query.path ? req.query.path.join('/') : '';
    
    console.log('[LMS Router] Path:', path, 'Method:', req.method);
    
    // Determinar qué handler usar
    if (path.startsWith('auth')) {
      const authHandler = require('./auth-handler');
      return authHandler(req, res);
    } else if (path.startsWith('admin')) {
      const adminHandler = require('./admin-handler');
      return adminHandler(req, res);
    } else if (path.startsWith('campus') || path.startsWith('module') || path.startsWith('lesson') || path.startsWith('quiz')) {
      const chatterHandler = require('./chatter-handler');
      return chatterHandler(req, res);
    } else {
      return res.status(404).json({ error: 'Ruta no encontrada', path });
    }
  } catch (error) {
    console.error('[LMS Router] Error:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor', 
      message: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
};
