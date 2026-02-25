const express = require('express');
const { pool } = require('../db');
const { authenticate } = require('../auth');

const router = express.Router();

// Badge definitions
const BADGES = [
  { key: 'first_task', name: 'First Step', emoji: '🌱', condition: (stats) => stats.completed >= 1 },
  { key: 'five_tasks', name: 'Getting Going', emoji: '⭐', condition: (stats) => stats.completed >= 5 },
  { key: 'ten_tasks', name: 'Task Master', emoji: '🏅', condition: (stats) => stats.completed >= 10 },
  { key: 'twenty_five', name: 'Household Hero', emoji: '🦸', condition: (stats) => stats.completed >= 25 },
  { key: 'fifty_tasks', name: 'Legend', emoji: '🏆', condition: (stats) => stats.completed >= 50 },
  { key: 'hundred_tasks', name: 'Centurion', emoji: '💯', condition: (stats) => stats.completed >= 100 },
  { key: 'streak_3', name: 'On Fire', emoji: '🔥', condition: (stats) => stats.streak >= 3 },
  { key: 'streak_7', name: 'Week Warrior', emoji: '💪', condition: (stats) => stats.streak >= 7 },
  { key: 'streak_30', name: 'Unstoppable', emoji: '🚀', condition: (stats) => stats.streak >= 30 },
  { key: 'points_100', name: 'Point Collector', emoji: '💎', condition: (stats) => stats.points >= 100 },
  { key: 'points_500', name: 'Point Hoarder', emoji: '👑', condition: (stats) => stats.points >= 500 },
];

async function checkAndAwardBadges(userId) {
  const client = await pool.connect();
  try {
    const statsResult = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM tasks WHERE completed_by = $1 AND status = 'done') AS completed,
        (SELECT points FROM users WHERE id = $1) AS points,
        (SELECT streak_days FROM users WHERE id = $1) AS streak
    `, [userId]);
    const stats = statsResult.rows[0];

    const newBadges = [];
    for (const badge of BADGES) {
      if (badge.condition(stats)) {
        try {
          const result = await client.query(
            `INSERT INTO achievements (user_id, badge_key, badge_name, badge_emoji)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, badge_key) DO NOTHING
             RETURNING *`,
            [userId, badge.key, badge.name, badge.emoji]
          );
          if (result.rows.length > 0) newBadges.push(result.rows[0]);
        } catch (e) { /* ignore duplicate */ }
      }
    }
    return newBadges;
  } finally {
    client.release();
  }
}

// GET /api/tasks
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, assigned_to, category, priority, sort } = req.query;
    let query = `
      SELECT t.*,
        cu.display_name AS creator_name, cu.avatar_emoji AS creator_emoji,
        au.display_name AS assignee_name, au.avatar_emoji AS assignee_emoji,
        (SELECT COUNT(*) FROM comments WHERE task_id = t.id) AS comment_count
      FROM tasks t
      LEFT JOIN users cu ON t.created_by = cu.id
      LEFT JOIN users au ON t.assigned_to = au.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (status && status !== 'all') {
      query += ` AND t.status = $${paramIndex++}`;
      params.push(status);
    }
    if (assigned_to) {
      query += ` AND t.assigned_to = $${paramIndex++}`;
      params.push(parseInt(assigned_to));
    }
    if (category) {
      query += ` AND t.category = $${paramIndex++}`;
      params.push(category);
    }
    if (priority) {
      query += ` AND t.priority = $${paramIndex++}`;
      params.push(priority);
    }

    switch (sort) {
      case 'due_date': query += ' ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC'; break;
      case 'priority': query += ` ORDER BY CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END, t.created_at DESC`; break;
      case 'oldest': query += ' ORDER BY t.created_at ASC'; break;
      default: query += ' ORDER BY t.created_at DESC';
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List tasks error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, category, priority, assigned_to, due_date, points_value, recurrence } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });

    const result = await pool.query(
      `INSERT INTO tasks (title, description, category, priority, assigned_to, due_date, points_value, recurrence, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        title,
        description || '',
        category || 'other',
        priority || 'medium',
        assigned_to || null,
        due_date || null,
        points_value || 10,
        recurrence || 'none',
        req.user.id,
      ]
    );

    // Log activity
    await pool.query(
      `INSERT INTO activity_log (user_id, task_id, action, details) VALUES ($1, $2, $3, $4)`,
      [req.user.id, result.rows[0].id, 'created', `Created task: ${title}`]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/tasks/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const { title, description, category, priority, assigned_to, due_date, points_value, status, recurrence } = req.body;

    const result = await pool.query(
      `UPDATE tasks SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        priority = COALESCE($4, priority),
        assigned_to = $5,
        due_date = $6,
        points_value = COALESCE($7, points_value),
        status = COALESCE($8, status),
        recurrence = COALESCE($9, recurrence),
        updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [title, description, category, priority, assigned_to || null, due_date || null, points_value, status, recurrence, taskId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });

    await pool.query(
      `INSERT INTO activity_log (user_id, task_id, action, details) VALUES ($1, $2, $3, $4)`,
      [req.user.id, taskId, 'updated', `Updated task: ${result.rows[0].title}`]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks/:id/complete
router.post('/:id/complete', authenticate, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Mark task done
      const taskResult = await client.query(
        `UPDATE tasks SET status = 'done', completed_at = NOW(), completed_by = $1, updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [req.user.id, taskId]
      );

      if (taskResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Task not found' });
      }

      const task = taskResult.rows[0];

      // Award points
      await client.query(
        `UPDATE users SET points = points + $1, updated_at = NOW() WHERE id = $2`,
        [task.points_value, req.user.id]
      );

      // Update streak
      const today = new Date().toISOString().slice(0, 10);
      const userResult = await client.query('SELECT last_completed_date, streak_days FROM users WHERE id = $1', [req.user.id]);
      const user = userResult.rows[0];
      let newStreak = 1;

      if (user.last_completed_date) {
        const lastDate = new Date(user.last_completed_date);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) newStreak = user.streak_days; // Same day
        else if (diffDays === 1) newStreak = user.streak_days + 1; // Consecutive
        // else newStreak stays 1 (streak broken)
      }

      await client.query(
        `UPDATE users SET streak_days = $1, last_completed_date = $2 WHERE id = $3`,
        [newStreak, today, req.user.id]
      );

      // Handle recurrence — create new task if recurring
      if (task.recurrence && task.recurrence !== 'none') {
        let nextDue = null;
        if (task.due_date) {
          const d = new Date(task.due_date);
          switch (task.recurrence) {
            case 'daily': d.setDate(d.getDate() + 1); break;
            case 'weekly': d.setDate(d.getDate() + 7); break;
            case 'biweekly': d.setDate(d.getDate() + 14); break;
            case 'monthly': d.setMonth(d.getMonth() + 1); break;
          }
          nextDue = d.toISOString().slice(0, 10);
        }

        await client.query(
          `INSERT INTO tasks (title, description, category, priority, assigned_to, due_date, points_value, recurrence, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [task.title, task.description, task.category, task.priority, task.assigned_to, nextDue, task.points_value, task.recurrence, task.created_by]
        );
      }

      // Activity log
      await client.query(
        `INSERT INTO activity_log (user_id, task_id, action, details) VALUES ($1, $2, $3, $4)`,
        [req.user.id, taskId, 'completed', `Completed: ${task.title} (+${task.points_value} pts)`]
      );

      await client.query('COMMIT');

      // Check badges (outside transaction)
      const newBadges = await checkAndAwardBadges(req.user.id);

      res.json({
        task: taskResult.rows[0],
        points_earned: task.points_value,
        new_streak: newStreak,
        new_badges: newBadges,
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Complete task error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks/:id/reopen
router.post('/:id/reopen', authenticate, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const result = await pool.query(
      `UPDATE tasks SET status = 'todo', completed_at = NULL, completed_by = NULL, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [taskId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Reopen task error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id = $1', [parseInt(req.params.id)]);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error('Delete task error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/tasks/:id/comments
router.get('/:id/comments', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, u.display_name, u.avatar_emoji
       FROM comments c LEFT JOIN users u ON c.user_id = u.id
       WHERE c.task_id = $1 ORDER BY c.created_at ASC`,
      [parseInt(req.params.id)]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List comments error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks/:id/comments
router.post('/:id/comments', authenticate, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });

    const result = await pool.query(
      `INSERT INTO comments (task_id, user_id, content) VALUES ($1, $2, $3) RETURNING *`,
      [parseInt(req.params.id), req.user.id, content]
    );

    // Fetch user info for the response
    const userResult = await pool.query('SELECT display_name, avatar_emoji FROM users WHERE id = $1', [req.user.id]);
    res.status(201).json({ ...result.rows[0], ...userResult.rows[0] });
  } catch (err) {
    console.error('Create comment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
