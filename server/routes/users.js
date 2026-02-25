const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { authenticate, requireAdmin } = require('../auth');

const router = express.Router();

// GET /api/users — list all users
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, display_name, avatar_emoji, is_admin, points, streak_days, created_at FROM users ORDER BY display_name'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List users error:', err);
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
      `INSERT INTO users (username, display_name, password_hash, avatar_emoji, is_admin)
       VALUES ($1, $2, $3, $4, $5)
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
