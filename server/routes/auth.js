const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { generateToken, authenticate } = require('../auth');
const { validateUsername, validatePassword, sanitizeString } = require('../validation');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Invalid input' });
    }

    const cleanUsername = username.toLowerCase().trim().slice(0, 50);

    const result = await pool.query('SELECT * FROM users WHERE username = $1', [cleanUsername]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.is_approved) {
      return res.status(403).json({ error: 'Your account is pending admin approval' });
    }

    const token = generateToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        avatar_emoji: user.avatar_emoji,
        is_admin: user.is_admin,
        points: user.points,
        streak_days: user.streak_days,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { username, display_name, password, avatar_emoji } = req.body;
    if (!username || !display_name || !password) {
      return res.status(400).json({ error: 'Username, display name, and password required' });
    }

    const cleanUsername = validateUsername(username);
    if (!cleanUsername) {
      return res.status(400).json({ error: 'Username must be 3-30 characters, lowercase alphanumeric and underscores only' });
    }

    const cleanDisplayName = sanitizeString(display_name, 100);
    if (!cleanDisplayName) {
      return res.status(400).json({ error: 'Display name is required (max 100 characters)' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ error: 'Password must be between 6 and 128 characters' });
    }

    const cleanEmoji = sanitizeString(avatar_emoji, 10);

    const existing = await pool.query('SELECT id FROM users WHERE username = $1', [cleanUsername]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      `INSERT INTO users (username, display_name, password_hash, avatar_emoji, is_approved)
       VALUES ($1, $2, $3, $4, FALSE)`,
      [cleanUsername, cleanDisplayName, hash, cleanEmoji || '😊']
    );

    res.status(201).json({ message: 'Account created! An admin will review your request shortly.' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, display_name, avatar_emoji, is_admin, points, streak_days FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Auth me error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/auth/password
router.put('/password', authenticate, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current and new password required' });
    }

    if (!validatePassword(new_password)) {
      return res.status(400).json({ error: 'New password must be between 6 and 128 characters' });
    }

    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];

    if (!(await bcrypt.compare(current_password, user.password_hash))) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hash = await bcrypt.hash(new_password, 12);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Password updated' });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
