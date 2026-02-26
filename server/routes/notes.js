const express = require('express');
const { pool } = require('../db');
const { authenticate } = require('../auth');

const router = express.Router();

// GET /api/notes — own notes + notes shared with current user
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         n.id, n.title, n.content, n.created_at, n.updated_at,
         (n.user_id = $1)                                              AS is_owner,
         CASE WHEN n.user_id = $1 THEN TRUE ELSE COALESCE(ns.can_edit, FALSE) END AS can_edit,
         n.user_id                                                     AS owner_id,
         u.display_name                                                AS owner_name,
         u.avatar_emoji                                                AS owner_emoji
       FROM notes n
       LEFT JOIN note_shares ns ON ns.note_id = n.id AND ns.shared_with = $1
       JOIN users u ON u.id = n.user_id
       WHERE n.user_id = $1 OR ns.shared_with = $1
       ORDER BY n.updated_at DESC`,
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

// GET /api/notes/:id/shares — list collaborators (owner only)
router.get('/:id/shares', authenticate, async (req, res) => {
  try {
    const noteId = parseInt(req.params.id);
    const ownerCheck = await pool.query(
      'SELECT id FROM notes WHERE id = $1 AND user_id = $2',
      [noteId, req.user.id]
    );
    if (!ownerCheck.rows.length) return res.status(403).json({ error: 'Not your note' });

    const result = await pool.query(
      `SELECT ns.shared_with AS user_id, ns.can_edit, ns.created_at,
              u.display_name, u.avatar_emoji, u.username
       FROM note_shares ns
       JOIN users u ON u.id = ns.shared_with
       WHERE ns.note_id = $1
       ORDER BY ns.created_at ASC`,
      [noteId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get note shares error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/notes/:id/share — add or update a collaborator (owner only)
router.post('/:id/share', authenticate, async (req, res) => {
  try {
    const noteId = parseInt(req.params.id);
    const { user_id, can_edit } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    if (parseInt(user_id) === req.user.id) return res.status(400).json({ error: 'Cannot share with yourself' });

    const ownerCheck = await pool.query(
      'SELECT id FROM notes WHERE id = $1 AND user_id = $2',
      [noteId, req.user.id]
    );
    if (!ownerCheck.rows.length) return res.status(403).json({ error: 'Not your note' });

    await pool.query(
      `INSERT INTO note_shares (note_id, shared_with, can_edit)
       VALUES ($1, $2, $3)
       ON CONFLICT (note_id, shared_with) DO UPDATE SET can_edit = $3`,
      [noteId, parseInt(user_id), can_edit || false]
    );
    res.json({ message: 'Note shared' });
  } catch (err) {
    console.error('Share note error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/notes/:id/share/:userId — remove a collaborator (owner only)
router.delete('/:id/share/:userId', authenticate, async (req, res) => {
  try {
    const noteId = parseInt(req.params.id);
    const targetUserId = parseInt(req.params.userId);

    const ownerCheck = await pool.query(
      'SELECT id FROM notes WHERE id = $1 AND user_id = $2',
      [noteId, req.user.id]
    );
    if (!ownerCheck.rows.length) return res.status(403).json({ error: 'Not your note' });

    await pool.query(
      'DELETE FROM note_shares WHERE note_id = $1 AND shared_with = $2',
      [noteId, targetUserId]
    );
    res.json({ message: 'Share removed' });
  } catch (err) {
    console.error('Remove share error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/notes/:id — update (owner or can_edit collaborator)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const noteId = parseInt(req.params.id);
    const { title, content } = req.body;

    // Check access
    const access = await pool.query(
      `SELECT n.user_id,
              (n.user_id = $2) AS is_owner,
              COALESCE(ns.can_edit, FALSE) AS can_edit
       FROM notes n
       LEFT JOIN note_shares ns ON ns.note_id = n.id AND ns.shared_with = $2
       WHERE n.id = $1`,
      [noteId, req.user.id]
    );
    if (!access.rows.length) return res.status(404).json({ error: 'Note not found' });
    const { is_owner, can_edit } = access.rows[0];
    if (!is_owner && !can_edit) return res.status(403).json({ error: 'You do not have edit access' });

    const result = await pool.query(
      `UPDATE notes SET
         title      = COALESCE($1, title),
         content    = COALESCE($2, content),
         updated_at = NOW()
       WHERE id = $3
       RETURNING id, title, content, created_at, updated_at`,
      [title, content, noteId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update note error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/notes/:id — delete (owner only)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING id',
      [parseInt(req.params.id), req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Note not found or not yours' });
    res.json({ message: 'Note deleted' });
  } catch (err) {
    console.error('Delete note error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
