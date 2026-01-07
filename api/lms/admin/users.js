// ===================================================================
// /api/lms/admin/users
// CRUD de usuarios del LMS (solo admin)
// ===================================================================

const { query } = require('../lib/db');
const { parseCookies, errorResponse, successResponse, validateRequired, isValidEmail, isValidUUID } = require('../lib/utils');
const { validateSession, hashPassword, generateTempPassword } = require('../lib/auth');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Validar sesión
    req.cookies = parseCookies(req);
    const user = await validateSession(req);

    if (!user) {
      return errorResponse(res, 401, 'No autorizado');
    }

    if (user.role !== 'admin') {
      return errorResponse(res, 403, 'Solo administradores pueden gestionar usuarios');
    }

    // GET: Listar usuarios
    if (req.method === 'GET') {
      const { role, active } = req.query;
      
      let sql = 'SELECT id, name, email, role, active, last_login, created_at FROM lms_users WHERE 1=1';
      const params = [];
      
      if (role) {
        params.push(role);
        sql += ` AND role = $${params.length}`;
      }
      
      if (active !== undefined) {
        params.push(active === 'true');
        sql += ` AND active = $${params.length}`;
      }
      
      sql += ' ORDER BY created_at DESC';
      
      const result = await query(sql, params);
      
      return successResponse(res, { users: result.rows });
    }

    // POST: Crear usuario
    if (req.method === 'POST') {
      const { name, email, role, password } = req.body;
      
      const validation = validateRequired(req.body, ['name', 'email', 'role']);
      if (!validation.valid) {
        return errorResponse(res, 400, 'Campos requeridos faltantes', { missing: validation.missing });
      }
      
      if (!isValidEmail(email)) {
        return errorResponse(res, 400, 'Email inválido');
      }
      
      if (!['chatter', 'supervisor', 'admin'].includes(role)) {
        return errorResponse(res, 400, 'Rol inválido. Debe ser: chatter, supervisor o admin');
      }
      
      // Verificar si el email ya existe
      const existingUser = await query('SELECT id FROM lms_users WHERE email = $1', [email.toLowerCase()]);
      if (existingUser.rows.length > 0) {
        return errorResponse(res, 400, 'El email ya está registrado');
      }
      
      // Generar contraseña temporal si no se proporciona
      const finalPassword = password || generateTempPassword();
      const passwordHash = await hashPassword(finalPassword);
      
      const result = await query(`
        INSERT INTO lms_users (name, email, role, password_hash, active)
        VALUES ($1, $2, $3, $4, true)
        RETURNING id, name, email, role, active, created_at
      `, [name, email.toLowerCase(), role, passwordHash]);
      
      return successResponse(res, {
        user: result.rows[0],
        temporaryPassword: password ? undefined : finalPassword,
        message: 'Usuario creado exitosamente'
      }, 201);
    }

    // PUT: Actualizar usuario
    if (req.method === 'PUT') {
      const { id, name, email, role, active, resetPassword } = req.body;
      
      if (!id || !isValidUUID(id)) {
        return errorResponse(res, 400, 'ID de usuario inválido');
      }
      
      const updates = [];
      const params = [id];
      let paramIndex = 2;
      
      if (name) {
        updates.push(`name = $${paramIndex}`);
        params.push(name);
        paramIndex++;
      }
      
      if (email) {
        if (!isValidEmail(email)) {
          return errorResponse(res, 400, 'Email inválido');
        }
        updates.push(`email = $${paramIndex}`);
        params.push(email.toLowerCase());
        paramIndex++;
      }
      
      if (role) {
        if (!['chatter', 'supervisor', 'admin'].includes(role)) {
          return errorResponse(res, 400, 'Rol inválido');
        }
        updates.push(`role = $${paramIndex}`);
        params.push(role);
        paramIndex++;
      }
      
      if (active !== undefined) {
        updates.push(`active = $${paramIndex}`);
        params.push(active);
        paramIndex++;
      }
      
      let newPassword = null;
      if (resetPassword) {
        newPassword = generateTempPassword();
        const passwordHash = await hashPassword(newPassword);
        updates.push(`password_hash = $${paramIndex}`);
        params.push(passwordHash);
        paramIndex++;
      }
      
      if (updates.length === 0) {
        return errorResponse(res, 400, 'No hay campos para actualizar');
      }
      
      const result = await query(`
        UPDATE lms_users 
        SET ${updates.join(', ')}
        WHERE id = $1
        RETURNING id, name, email, role, active, last_login, created_at
      `, params);
      
      if (result.rows.length === 0) {
        return errorResponse(res, 404, 'Usuario no encontrado');
      }
      
      return successResponse(res, {
        user: result.rows[0],
        newPassword: newPassword || undefined,
        message: 'Usuario actualizado exitosamente'
      });
    }

    // DELETE: Eliminar usuario (soft delete)
    if (req.method === 'DELETE') {
      const { id } = req.query;
      
      if (!id || !isValidUUID(id)) {
        return errorResponse(res, 400, 'ID de usuario inválido');
      }
      
      // No permitir eliminar el propio usuario
      if (id === user.id) {
        return errorResponse(res, 400, 'No puedes eliminar tu propio usuario');
      }
      
      const result = await query(`
        UPDATE lms_users 
        SET active = false
        WHERE id = $1
        RETURNING id
      `, [id]);
      
      if (result.rows.length === 0) {
        return errorResponse(res, 404, 'Usuario no encontrado');
      }
      
      return successResponse(res, { message: 'Usuario desactivado exitosamente' });
    }

    return errorResponse(res, 405, 'Método no permitido');

  } catch (error) {
    console.error('Error en /admin/users:', error);
    return errorResponse(res, 500, 'Error interno del servidor', error.message);
  }
};
