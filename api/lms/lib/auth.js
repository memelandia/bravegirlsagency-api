// ===================================================================
// LMS Authentication & Authorization Helpers
// ===================================================================

const bcrypt = require('bcryptjs');
const { query } = require('./db');

/**
 * Hash password usando bcrypt
 */
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Verificar password
 */
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Generar contraseña temporal aleatoria
 */
function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Obtener usuario por email
 */
async function getUserByEmail(email) {
  const result = await query(
    'SELECT * FROM lms_users WHERE email = $1',
    [email.toLowerCase()]
  );
  return result.rows[0] || null;
}

/**
 * Obtener usuario por ID
 */
async function getUserById(userId) {
  const result = await query(
    'SELECT id, name, email, role, active, last_login, created_at FROM lms_users WHERE id = $1',
    [userId]
  );
  return result.rows[0] || null;
}

/**
 * Actualizar último login
 */
async function updateLastLogin(userId) {
  await query(
    'UPDATE lms_users SET last_login = NOW() WHERE id = $1',
    [userId]
  );
}

/**
 * Validar sesión desde cookie
 */
async function validateSession(req) {
  // Obtener session token desde cookie httpOnly
  const sessionToken = req.cookies?.lms_session;
  
  if (!sessionToken) {
    return null;
  }
  
  try {
    // Decodificar token (simple base64 por ahora, puede mejorarse con JWT)
    const decoded = Buffer.from(sessionToken, 'base64').toString('utf8');
    const [userId, timestamp] = decoded.split(':');
    
    // Validar expiración (24 horas)
    const sessionAge = Date.now() - parseInt(timestamp);
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas
    
    if (sessionAge > maxAge) {
      return null;
    }
    
    // Obtener usuario
    const user = await getUserById(userId);
    
    if (!user || !user.active) {
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Error validando sesión:', error);
    return null;
  }
}

/**
 * Crear sesión (generar token)
 */
function createSession(userId) {
  const timestamp = Date.now();
  const sessionData = `${userId}:${timestamp}`;
  return Buffer.from(sessionData).toString('base64');
}

/**
 * Middleware de autenticación
 */
function requireAuth(handler) {
  return async (req, res) => {
    const user = await validateSession(req);
    
    if (!user) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    
    req.user = user;
    return handler(req, res);
  };
}

/**
 * Middleware de autorización por rol
 */
function requireRole(...roles) {
  return (handler) => {
    return requireAuth(async (req, res) => {
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Acceso denegado' });
      }
      
      return handler(req, res);
    });
  };
}

/**
 * Rate limiting simple (en memoria)
 * En producción considerar Redis
 */
const rateLimitMap = new Map();

function rateLimit(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
  return (handler) => {
    return async (req, res) => {
      const identifier = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const key = `${identifier}:${req.url}`;
      
      const now = Date.now();
      const record = rateLimitMap.get(key) || { count: 0, resetTime: now + windowMs };
      
      // Reset si pasó la ventana
      if (now > record.resetTime) {
        record.count = 0;
        record.resetTime = now + windowMs;
      }
      
      record.count++;
      rateLimitMap.set(key, record);
      
      if (record.count > maxAttempts) {
        const retryAfter = Math.ceil((record.resetTime - now) / 1000);
        res.setHeader('Retry-After', retryAfter);
        return res.status(429).json({ 
          error: 'Demasiados intentos. Intenta más tarde.',
          retryAfter
        });
      }
      
      return handler(req, res);
    };
  };
}

/**
 * Limpiar rate limit cache periódicamente
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime + 60000) { // 1 min después del reset
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000); // Cada 5 minutos

module.exports = {
  hashPassword,
  verifyPassword,
  generateTempPassword,
  getUserByEmail,
  getUserById,
  updateLastLogin,
  validateSession,
  createSession,
  requireAuth,
  requireRole,
  rateLimit
};
