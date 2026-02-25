import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const CAT_EMOJIS = {
  cleaning: '\uD83E\uDDF9', cooking: '\uD83C\uDF73', shopping: '\uD83D\uDED2',
  repairs: '\uD83D\uDD27', garden: '\uD83C\uDF31', laundry: '\uD83E\uDDFA',
  pets: '\uD83D\uDC3E', finance: '\uD83D\uDCB0', organization: '\uD83D\uDCE6',
  errands: '\uD83D\uDE97', wellness: '\uD83E\uDDD8', other: '\uD83D\uDCCC',
};

const CAT_COLORS = {
  cleaning: 'var(--lavender)', cooking: 'var(--peach)', shopping: 'var(--mint)',
  repairs: 'var(--butter)', garden: 'var(--mint-deep)', laundry: 'var(--sky)',
  pets: 'var(--rose)', finance: 'var(--lemon-deep)', organization: 'var(--lavender-deep)',
  errands: 'var(--sky-deep)', wellness: 'var(--peach-deep)', other: 'var(--text-muted)',
};

function timeAgo(d) {
  const now = new Date();
  const then = new Date(d);
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return then.toLocaleDateString();
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const dashboard = await api.getDashboard();
      setData(dashboard);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading-screen"><div className="loader" /><p>Loading dashboard...</p></div>;
  if (!data) return <div className="empty-state"><p>Could not load dashboard</p></div>;

  const { tasks, my_tasks, categories, activity } = data;
  const maxCatCount = Math.max(...(categories || []).map(c => parseInt(c.count) || 0), 1);

  return (
    <div>
      <div className="page-header">
        <h1>Welcome back, {user?.display_name} {user?.avatar_emoji}</h1>
      </div>

      {/* Stats row */}
      <div className="stats-grid">
        <div className="stat-card" onClick={() => navigate('/tasks')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon lavender">{'\uD83D\uDCCB'}</div>
          <div>
            <div className="stat-value">{parseInt(tasks.todo) + parseInt(tasks.in_progress)}</div>
            <div className="stat-label">Open Tasks</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon mint">{'\u2705'}</div>
          <div>
            <div className="stat-value">{tasks.done}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon butter">{'\u26A0\uFE0F'}</div>
          <div>
            <div className="stat-value">{tasks.due_today}</div>
            <div className="stat-label">Due Today</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon rose">{'\uD83D\uDD25'}</div>
          <div>
            <div className="stat-value">{parseInt(tasks.overdue)}</div>
            <div className="stat-label">Overdue</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon sky">{'\uD83C\uDFAF'}</div>
          <div>
            <div className="stat-value">{my_tasks.todo}</div>
            <div className="stat-label">My To-Do</div>
          </div>
        </div>
      </div>

      {/* Two column grid */}
      <div className="dashboard-grid">
        {/* Activity feed */}
        <div className="card">
          <h3>{'\uD83D\uDCE1'} Recent Activity</h3>
          {activity && activity.length > 0 ? (
            activity.slice(0, 10).map(a => (
              <div key={a.id} className="activity-item">
                <div className="activity-avatar">{a.avatar_emoji || '\uD83D\uDE0A'}</div>
                <div>
                  <div className="activity-text">
                    <strong>{a.display_name}</strong> {a.details || a.action}
                  </div>
                  <div className="activity-time">{timeAgo(a.created_at)}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <div className="empty-emoji">{'\uD83C\uDFAC'}</div>
              <h3>No activity yet</h3>
              <p>Create some tasks to get started!</p>
            </div>
          )}
        </div>

        {/* Category breakdown */}
        <div className="card">
          <h3>{'\uD83D\uDCCA'} Tasks by Category</h3>
          {categories && categories.length > 0 ? (
            categories.map(cat => (
              <div key={cat.category} className="cat-row">
                <div className="cat-label">
                  {CAT_EMOJIS[cat.category] || '\uD83D\uDCCC'} {cat.category}
                </div>
                <div className="cat-bar-bg">
                  <div
                    className="cat-bar-fill"
                    style={{
                      width: `${(parseInt(cat.count) / maxCatCount) * 100}%`,
                      background: CAT_COLORS[cat.category] || 'var(--lavender)',
                    }}
                  />
                </div>
                <div className="cat-count">{cat.count}</div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <div className="empty-emoji">{'\uD83D\uDCCA'}</div>
              <h3>No data yet</h3>
              <p>Categories will show up once you add tasks</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
