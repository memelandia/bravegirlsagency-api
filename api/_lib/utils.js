// ===================================================================
// LMS Utilities
// Funciones auxiliares y helpers
// ===================================================================

/**
 * Validar UUID
 * Se permite cualquier versión de UUID (no solo v4)
 */
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validar email
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitizar texto para prevenir XSS básico
 */
function sanitizeText(text) {
  if (typeof text !== 'string') return text;
  
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Parsear cookies desde header
 */
function parseCookies(req) {
  const cookies = {};
  const cookieHeader = req.headers.cookie;
  
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [name, ...rest] = cookie.split('=');
      const value = rest.join('=').trim();
      if (name && value) {
        cookies[name.trim()] = decodeURIComponent(value);
      }
    });
  }
  
  return cookies;
}

/**
 * Set cookie con opciones seguras
 */
function setCookie(res, name, value, options = {}) {
  const defaults = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000 // 24 horas por defecto
  };
  
  const opts = { ...defaults, ...options };
  
  let cookieString = `${name}=${encodeURIComponent(value)}`;
  
  if (opts.maxAge) {
    cookieString += `; Max-Age=${Math.floor(opts.maxAge / 1000)}`;
  }
  
  if (opts.path) {
    cookieString += `; Path=${opts.path}`;
  }
  
  if (opts.httpOnly) {
    cookieString += '; HttpOnly';
  }
  
  if (opts.secure) {
    cookieString += '; Secure';
  }
  
  if (opts.sameSite) {
    cookieString += `; SameSite=${opts.sameSite}`;
  }
  
  res.setHeader('Set-Cookie', cookieString);
}

/**
 * Delete cookie
 */
function deleteCookie(res, name) {
  setCookie(res, name, '', { maxAge: 0 });
}

/**
 * Respuesta de error estandarizada
 */
function errorResponse(res, statusCode, message, details = null) {
  const response = { error: message };
  if (details && process.env.NODE_ENV !== 'production') {
    response.details = details;
  }
  return res.status(statusCode).json(response);
}

/**
 * Respuesta exitosa estandarizada
 */
function successResponse(res, data, statusCode = 200) {
  return res.status(statusCode).json(data);
}

/**
 * Validar campos requeridos
 */
function validateRequired(body, fields) {
  const missing = [];
  
  for (const field of fields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      missing.push(field);
    }
  }
  
  if (missing.length > 0) {
    return { valid: false, missing };
  }
  
  return { valid: true };
}

/**
 * Calcular progreso de módulo
 */
function calculateModuleProgress(totalLessons, completedLessons, quizPassed) {
  if (totalLessons === 0) return 0;
  
  const lessonsProgress = (completedLessons / totalLessons) * 100;
  
  // Si todas las lecciones están completas y el quiz pasado, 100%
  if (completedLessons === totalLessons && quizPassed) {
    return 100;
  }
  
  // Si todas las lecciones completas pero quiz no pasado, 99%
  if (completedLessons === totalLessons && !quizPassed) {
    return 99;
  }
  
  return Math.floor(lessonsProgress);
}

/**
 * Determinar estado del módulo
 */
function getModuleStatus(isLocked, allLessonsCompleted, quizPassed, hasQuiz) {
  if (isLocked) return 'locked';
  if (quizPassed) return 'completed';
  if (allLessonsCompleted && hasQuiz) return 'ready_for_quiz';
  if (allLessonsCompleted && !hasQuiz) return 'completed'; // Sin quiz, solo lecciones
  return 'in_progress';
}

/**
 * Formatear fecha para display
 */
function formatDate(date) {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString();
}

/**
 * Validar URL de Loom
 */
function isValidLoomUrl(url) {
  if (!url) return false;
  return url.includes('loom.com/embed/') || url.includes('loom.com/share/');
}

/**
 * Normalizar URL de Loom a formato embed
 */
function normalizeLoomUrl(url) {
  if (!url) return null;
  
  // Si ya es embed, retornar tal cual
  if (url.includes('/embed/')) {
    return url;
  }
  
  // Convertir share a embed
  if (url.includes('/share/')) {
    return url.replace('/share/', '/embed/');
  }
  
  return url;
}

/**
 * Paginación helper
 */
function paginate(page = 1, limit = 20) {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const offset = (pageNum - 1) * limitNum;
  
  return {
    limit: limitNum,
    offset,
    page: pageNum
  };
}

/**
 * Sleep helper para testing
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  isValidUUID,
  isValidEmail,
  sanitizeText,
  parseCookies,
  setCookie,
  deleteCookie,
  errorResponse,
  successResponse,
  validateRequired,
  calculateModuleProgress,
  getModuleStatus,
  formatDate,
  isValidLoomUrl,
  normalizeLoomUrl,
  paginate,
  sleep
};
