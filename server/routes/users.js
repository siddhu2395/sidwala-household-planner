const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { authenticate, requireAdmin } = require('../auth');

const router = express.Router();

// GET /api/users — list approved users (all for admins, approved-only for regular users)
router.get('/', authenticate, async (req, res) => {
  try {
    const query = req.user.is_admin
      ? 'SELECT id, username, display_name, avatar_emoji, is_admin, is_approved, points, streak_days, created_at FROM users WHERE is_approved = TRUE ORDER BY display_name'
      : 'SELECT id, username, display_name, avatar_emoji, is_admin, points, streak_days, created_at FROM users WHERE is_approved = TRUE ORDER BY display_name';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/pending — admin only: list users awaiting approval
router.get('/pending', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, display_name, avatar_emoji, created_at FROM users WHERE is_approved = FALSE ORDER BY created_at ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Pending users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users/:id/approve — admin approves a pending user
router.post('/:id/approve', authenticate, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const result = await pool.query(
      'UPDATE users SET is_approved = TRUE, updated_at = NOW() WHERE id = $1 AND is_approved = FALSE RETURNING id, username, display_name',
      [userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Pending user not found' });
    res.json({ message: 'User approved', user: result.rows[0] });
  } catch (err) {
    console.error('Approve user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users/:id/reject — admin rejects (deletes) a pending user
router.post('/:id/reject', authenticate, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 AND is_approved = FALSE RETURNING id',
      [userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Pending user not found' });
    res.json({ message: 'User rejected' });
  } catch (err) {
    console.error('Reject user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users — admin creates a new user
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { username, display_name, password, avatar_emoji, is_admin } = req.body;
    if (!username || !display_name || !password) {
      return res.status(400).json({ error: 'Username, display name, and password required' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (username, display_name, password_hash, avatar_emoji, is_admin, is_approved)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING id, username, display_name, avatar_emoji, is_admin, points, streak_days`,
      [username.toLowerCase(), display_name, hash, avatar_emoji || '😊', is_admin || false]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/users/:id — update user profile
router.put('/:id', authenticate, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    // Only admins can edit other users, or users can edit themselves
    if (req.user.id !== userId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { display_name, avatar_emoji } = req.body;
    const result = await pool.query(
      `UPDATE users SET
        display_name = COALESCE($1, display_name),
        avatar_emoji = COALESCE($2, avatar_emoji),
        updated_at = NOW()
       WHERE id = $3
       RETURNING id, username, display_name, avatar_emoji, is_admin, points, streak_days`,
      [display_name, avatar_emoji, userId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/users/:id/password — admin resets a user's password (no current password needed)
router.put('/:id/password', authenticate, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { new_password } = req.body;
    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const hash = await bcrypt.hash(new_password, 12);
    const result = await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
      [hash, userId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Admin reset password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/users/:id — admin deletes a user
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (req.user.id === userId) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
