const express = require('express');
const { pool } = require('../db');
const { authenticate } = require('../auth');

const router = express.Router();

// GET /api/stats/dashboard
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Overall task counts
    const taskCounts = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'todo') AS todo,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
        COUNT(*) FILTER (WHERE status = 'done') AS done,
        COUNT(*) FILTER (WHERE status = 'todo' AND due_date < CURRENT_DATE) AS overdue,
        COUNT(*) FILTER (WHERE status IN ('todo', 'in_progress') AND due_date = CURRENT_DATE) AS due_today,
        COUNT(*) FILTER (WHERE status IN ('todo', 'in_progress') AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7) AS due_this_week
      FROM tasks
    `);

    // My task counts
    const myTasks = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'todo') AS todo,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
        COUNT(*) FILTER (WHERE status = 'done') AS done
      FROM tasks WHERE assigned_to = $1
    `, [userId]);

    // Weekly completions (last 7 days)
    const weeklyCompletions = await pool.query(`
      SELECT
        DATE(completed_at) AS date,
        COUNT(*) AS count,
        SUM(points_value) AS points
      FROM tasks
      WHERE status = 'done' AND completed_at >= CURRENT_DATE - 7
      GROUP BY DATE(completed_at)
      ORDER BY date ASC
    `);

    // Category breakdown
    const categories = await pool.query(`
      SELECT category, COUNT(*) AS count,
        COUNT(*) FILTER (WHERE status = 'done') AS completed
      FROM tasks
      GROUP BY category
      ORDER BY count DESC
    `);

    // Recent activity
    const activity = await pool.query(`
      SELECT a.*, u.display_name, u.avatar_emoji
      FROM activity_log a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC LIMIT 15
    `);

    res.json({
      tasks: taskCounts.rows[0],
      my_tasks: myTasks.rows[0],
      weekly_completions: weeklyCompletions.rows,
      categories: categories.rows,
      activity: activity.rows,
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/stats/leaderboard
router.get('/leaderboard', authenticate, async (req, res) => {
  try {
    const users = await pool.query(`
      SELECT
        u.id, u.display_name, u.avatar_emoji, u.points, u.streak_days,
        COUNT(t.id) FILTER (WHERE t.status = 'done') AS tasks_completed,
        COUNT(t.id) FILTER (WHERE t.status = 'done' AND t.completed_at >= CURRENT_DATE - 7) AS completed_this_week
      FROM users u
      LEFT JOIN tasks t ON t.completed_by = u.id
      GROUP BY u.id
      ORDER BY u.points DESC
    `);

    res.json(users.rows);
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/stats/achievements/:userId
router.get('/achievements/:userId', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM achievements WHERE user_id = $1 ORDER BY earned_at DESC',
      [parseInt(req.params.userId)]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Achievements error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
