const express = require('express');
const { pool } = require('../db');
const { authenticate } = require('../auth');

const router = express.Router();

// GET /api/notes — own notes, newest first
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, title, content, created_at, updated_at FROM notes WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get notes error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/notes — create a note
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title && !content) {
      return res.status(400).json({ error: 'Title or content is required' });
    }

    const result = await pool.query(
      `INSERT INTO notes (user_id, title, content)
       VALUES ($1, $2, $3)
       RETURNING id, title, content, created_at, updated_at`,
      [req.user.id, title || '', content || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create note error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/notes/:id — update a note
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { title, content } = req.body;
    const result = await pool.query(
      `UPDATE notes SET
         title = COALESCE($1, title),
         content = COALESCE($2, content),
         updated_at = NOW()
       WHERE id = $3 AND user_id = $4
       RETURNING id, title, content, created_at, updated_at`,
      [title, content, parseInt(req.params.id), req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Note not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update note error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/notes/:id — delete own note
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING id',
      [parseInt(req.params.id), req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Note not found' });
    res.json({ message: 'Note deleted' });
  } catch (err) {
    console.error('Delete note error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
