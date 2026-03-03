const express = require('express');
const { pool } = require('../db');
const { authenticate } = require('../auth');
const { parseId, sanitizeString } = require('../validation');

const router = express.Router();

// GET /api/messages/conversations — list conversations with last message + unread count
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `WITH latest AS (
         SELECT
           CASE WHEN sender_id = $1 THEN recipient_id ELSE sender_id END AS other_id,
           content,
           created_at,
           ROW_NUMBER() OVER (
             PARTITION BY CASE WHEN sender_id = $1 THEN recipient_id ELSE sender_id END
             ORDER BY created_at DESC
           ) AS rn
         FROM messages
         WHERE sender_id = $1 OR recipient_id = $1
       )
       SELECT
         l.other_id,
         l.content     AS last_message,
         l.created_at  AS last_message_at,
         u.display_name,
         u.avatar_emoji,
         u.username,
         (
           SELECT COUNT(*)::int FROM messages
           WHERE sender_id = l.other_id AND recipient_id = $1 AND is_read = FALSE
         ) AS unread_count
       FROM latest l
       JOIN users u ON u.id = l.other_id
       WHERE l.rn = 1
       ORDER BY l.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get conversations error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/messages/unread-count — total unread messages for current user
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*)::int AS count FROM messages WHERE recipient_id = $1 AND is_read = FALSE',
      [req.user.id]
    );
    res.json({ count: result.rows[0].count });
  } catch (err) {
    console.error('Unread count error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/messages/with/:userId — full conversation, marks incoming as read
router.get('/with/:userId', authenticate, async (req, res) => {
  try {
    const otherId = parseId(req.params.userId);
    if (!otherId) return res.status(400).json({ error: 'Invalid user ID' });

    // Mark all unread messages from this user as read
    await pool.query(
      'UPDATE messages SET is_read = TRUE WHERE sender_id = $1 AND recipient_id = $2 AND is_read = FALSE',
      [otherId, req.user.id]
    );

    const result = await pool.query(
      `SELECT m.id, m.sender_id, m.recipient_id, m.content, m.is_read, m.created_at,
              u.display_name AS sender_name, u.avatar_emoji AS sender_emoji
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE (m.sender_id = $1 AND m.recipient_id = $2)
          OR (m.sender_id = $2 AND m.recipient_id = $1)
       ORDER BY m.created_at ASC`,
      [req.user.id, otherId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get conversation error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/messages — send a message
router.post('/', authenticate, async (req, res) => {
  try {
    const { recipient_id, content } = req.body;

    const recipientIdParsed = parseId(recipient_id);
    if (!recipientIdParsed) {
      return res.status(400).json({ error: 'Valid recipient_id required' });
    }

    const cleanContent = sanitizeString(content, 5000);
    if (!cleanContent) {
      return res.status(400).json({ error: 'Content is required (max 5000 characters)' });
    }

    if (recipientIdParsed === req.user.id) {
      return res.status(400).json({ error: 'Cannot message yourself' });
    }

    // Verify recipient exists and is approved
    const recipientCheck = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND is_approved = TRUE',
      [recipientIdParsed]
    );
    if (recipientCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    const result = await pool.query(
      `INSERT INTO messages (sender_id, recipient_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, sender_id, recipient_id, content, is_read, created_at`,
      [req.user.id, recipientIdParsed, cleanContent]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
