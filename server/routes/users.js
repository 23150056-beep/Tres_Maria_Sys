import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../database/db.js';
import { requireRole } from '../middleware/auth.js';
import { createAuditLog } from '../utils/auditLog.js';
import { paginate, paginationResponse } from '../utils/helpers.js';

const router = express.Router();

// Get all users (with pagination)
router.get('/', requireRole('Admin', 'Manager'), async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, role, status } = req.query;
    const { limit: limitNum, offset } = paginate(page, limit);

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(`(u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (role) {
      whereConditions.push(`r.name = $${paramIndex}`);
      params.push(role);
      paramIndex++;
    }

    if (status !== undefined) {
      whereConditions.push(`u.is_active = $${paramIndex}`);
      params.push(status === 'active');
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM users u LEFT JOIN roles r ON u.role_id = r.id ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get users
    const result = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.avatar_url, 
              u.is_active, u.last_login, u.created_at,
              r.id as role_id, r.name as role_name
       FROM users u 
       LEFT JOIN roles r ON u.role_id = r.id 
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limitNum, offset]
    );

    res.json(paginationResponse(result.rows, total, page, limit));
  } catch (error) {
    next(error);
  }
});

// Get single user
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.avatar_url, 
              u.is_active, u.last_login, u.created_at,
              r.id as role_id, r.name as role_name, r.permissions
       FROM users u 
       LEFT JOIN roles r ON u.role_id = r.id 
       WHERE u.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Create user
router.post('/', requireRole('Admin'), async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, phone, roleId } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO users (email, password, first_name, last_name, phone, role_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, first_name, last_name, phone, role_id, is_active, created_at`,
      [email.toLowerCase(), hashedPassword, firstName, lastName, phone, roleId || 4]
    );

    await createAuditLog(req.user.id, 'CREATE', 'user', result.rows[0].id, null, result.rows[0], req);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update user
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone, roleId, isActive } = req.body;

    // Check if user exists
    const existingUser = await query('SELECT * FROM users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Only admin can change roles
    if (roleId !== undefined && req.user.role_name !== 'Admin') {
      return res.status(403).json({ error: 'Only admin can change user roles' });
    }

    const result = await query(
      `UPDATE users 
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           phone = COALESCE($3, phone),
           role_id = COALESCE($4, role_id),
           is_active = COALESCE($5, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING id, email, first_name, last_name, phone, role_id, is_active, updated_at`,
      [firstName, lastName, phone, roleId, isActive, id]
    );

    await createAuditLog(req.user.id, 'UPDATE', 'user', id, existingUser.rows[0], result.rows[0], req);

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Delete user (soft delete)
router.delete('/:id', requireRole('Admin'), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const result = await query(
      `UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await createAuditLog(req.user.id, 'DELETE', 'user', id, null, null, req);

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    next(error);
  }
});

// Get all roles
router.get('/roles/list', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM roles ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

export default router;
