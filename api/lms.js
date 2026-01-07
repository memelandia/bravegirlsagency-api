// ===================================================================
// /api/lms
// Endpoint único consolidado para TODO el LMS
// Usa req.url para rutear internamente
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
    // Cargar dependencias
    const { query, transaction } = require('./_lib/db');
    const { verifyPassword, createSession, updateLastLogin, validateSession, hashPassword, generateTempPassword, getUserById } = require('./_lib/auth');
    const { parseCookies, setCookie, deleteCookie, isValidEmail, isValidUUID, validateRequired, normalizeLoomUrl, getModuleStatus } = require('./_lib/utils');
    const { parseBody } = require('./_lib/bodyParser');
    
    // Parsear cookies
    req.cookies = parseCookies(req);
    
    // Parsear body si es POST/PUT
    if (['POST', 'PUT'].includes(req.method)) {
      req.body = await parseBody(req);
    }

    // Extraer ruta desde query params (viene del rewrite)
    // El rewrite convierte /api/lms/auth/login → /api/lms?path=auth/login
    const urlParts = new URL(req.url, `http://${req.headers.host}`);
    let path = urlParts.searchParams.get('path') || '';
    
    console.log('[LMS] Full URL:', req.url, 'Path extracted:', path, 'Method:', req.method);

    // Rutear según la path
    if (path.startsWith('auth/')) {
      const authHandler = require('./_handlers/lms-auth');
      return authHandler(req, res, { query, verifyPassword, createSession, updateLastLogin, validateSession, parseCookies, setCookie, deleteCookie, isValidEmail, validateRequired, parseBody });
    } else if (path.startsWith('admin/')) {
      const adminHandler = require('./_handlers/lms-admin');
      return adminHandler(req, res, { query, transaction, hashPassword, generateTempPassword, getUserById, validateSession, parseCookies, isValidEmail, isValidUUID, validateRequired, normalizeLoomUrl });
    } else if (path.startsWith('campus') || path.startsWith('module/') || path.startsWith('lesson/') || path.startsWith('quiz/')) {
      const chatterHandler = require('./_handlers/lms-chatter');
      return chatterHandler(req, res, { query, transaction, validateSession, parseCookies, isValidUUID, getModuleStatus, validateRequired });
    } else {
      return res.status(404).json({ error: 'Ruta LMS no encontrada', path, url: req.url });
    }
  } catch (error) {
    console.error('[LMS] Error crítico:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor', 
      message: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
};
