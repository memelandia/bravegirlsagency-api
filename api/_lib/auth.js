const bcrypt = require('bcryptjs');
const { query } = require('./db');

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function getUserByEmail(email) {
  const result = await query('SELECT * FROM lms_users WHERE email = $1', [email.toLowerCase()]);
  return result.rows[0] || null;
}

async function getUserById(userId) {
  const result = await query('SELECT id, name, email, role, active, last_login, first_login, onboarding_completed_at, must_change_password FROM lms_users WHERE id = $1', [userId]);
  return result.rows[0] || null;
}

async function updateLastLogin(userId) {
  await query('UPDATE lms_users SET last_login = NOW() WHERE id = $1', [userId]);
}

async function validateSession(req) {
  const sessionToken = req.cookies?.lms_session;
  if (!sessionToken) return null;
  
  try {
    const decoded = Buffer.from(sessionToken, 'base64').toString('utf8');
    const [userId, timestamp] = decoded.split(':');
    const sessionAge = Date.now() - parseInt(timestamp);
    
    if (sessionAge > 24 * 60 * 60 * 1000) return null;
    
    const user = await getUserById(userId);
    if (!user || !user.active) return null;
    
    return user;
  } catch (error) {
    return null;
  }
}

function createSession(userId) {
  return Buffer.from(`${userId}:${Date.now()}`).toString('base64');
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateTempPassword,
  getUserByEmail,
  getUserById,
  updateLastLogin,
  validateSession,
  createSession
};