import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import TaskModal, { CATEGORIES } from '../components/TaskModal';
import TaskDetail from '../components/TaskDetail';
import Confetti from '../components/Confetti';
import Toast from '../components/Toast';

function getCategoryEmoji(cat) {
  const found = CATEGORIES.find(c => c.value === cat);
  return found ? found.emoji : '\uD83D\uDCCC';
}

function formatDue(d) {
  if (!d) return null;
  const due = new Date(d + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((due - today) / (1000 * 60 * 60 * 24));

  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, className: 'overdue' };
  if (diff === 0) return { label: 'Today', className: 'today' };
  if (diff === 1) return { label: 'Tomorrow', className: '' };
  if (diff <= 7) return { label: `${diff}d`, className: '' };
  return { label: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), className: '' };
}

const RECURRENCE_LABELS = { daily: 'Daily', weekly: 'Weekly', biweekly: 'Bi-weekly', monthly: 'Monthly' };

export default function Tasks() {
  const { user, refreshUser } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [detailTask, setDetailTask] = useState(null);
  const [confetti, setConfetti] = useState(false);
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState('active');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const addToast = useCallback((message, emoji, type) => {
    const id = ++toastId.current;
    setToasts(prev => [...prev, { id, message, emoji, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const loadData = useCallback(async () => {
    try {
      const params = { sort: sortBy };
      if (statusFilter === 'active') params.status = 'todo';
      else if (statusFilter !== 'all') params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (assigneeFilter) params.assigned_to = assigneeFilter;

      const [taskData, userData] = await Promise.all([
        api.getTasks(params),
        api.getUsers(),
      ]);

      // If showing active, also get in_progress
      if (statusFilter === 'active') {
        const inProgress = await api.getTasks({ ...params, status: 'in_progress' });
        setTasks([...taskData, ...inProgress]);
      } else {
        setTasks(taskData);
      }
      setUsers(userData);
    } catch (err) {
      console.error('Load tasks error:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, assigneeFilter, sortBy]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleComplete = async (e, task) => {
    e.stopPropagation();
    if (task.status === 'done') {
      // Reopen
      try {
        await api.reopenTask(task.id);
        addToast(`Reopened: ${task.title}`, '\uD83D\uDD04');
        loadData();
      } catch (err) { addToast(err.message, '\u274C', 'error'); }
      return;
    }

    try {
      const result = await api.completeTask(task.id);
      setConfetti(true);
      setTimeout(() => setConfetti(false), 100);
      addToast(`Done! +${result.points_earned} pts`, '\uD83C\uDF89');

      if (result.new_badges?.length) {
        result.new_badges.forEach(b => {
          addToast(`Badge earned: ${b.badge_emoji} ${b.badge_name}`, '\uD83C\uDFC5', 'badge-toast');
        });
      }

      refreshUser();
      loadData();
    } catch (err) {
      addToast(err.message, '\u274C', 'error');
    }
  };

  const handleDelete = async (e, task) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    try {
      await api.deleteTask(task.id);
      addToast('Task deleted', '\uD83D\uDDD1\uFE0F');
      loadData();
    } catch (err) { addToast(err.message, '\u274C', 'error'); }
  };

  const handleEdit = (e, task) => {
    e.stopPropagation();
    setEditTask(task);
  };

  const handleSave = () => {
    setShowCreate(false);
    setEditTask(null);
    addToast(editTask ? 'Task updated!' : 'Task created!', '\u2728');
    loadData();
  };

  if (loading) return <div className="loading-screen"><div className="loader" /><p>Loading tasks...</p></div>;

  return (
    <div>
      <Confetti active={confetti} />
      <Toast toasts={toasts} removeToast={removeToast} />

      <div className="page-header">
        <h1>{'\u2705'} Tasks</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + New Task
        </button>
      </div>

      {/* Filters */}
      <div className="tasks-toolbar">
        <div className="filter-group">
          {['active', 'done', 'all'].map(s => (
            <button
              key={s}
              className={`filter-chip ${statusFilter === s ? 'active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'active' ? '\uD83D\uDCCB Active' : s === 'done' ? '\u2705 Done' : '\uD83D\uDCDA All'}
            </button>
          ))}
        </div>

        <select className="form-input" style={{ width: 'auto', padding: '6px 32px 6px 12px', fontSize: '0.82rem' }}
          value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
          ))}
        </select>

        <select className="form-input" style={{ width: 'auto', padding: '6px 32px 6px 12px', fontSize: '0.82rem' }}
          value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
          <option value="">All Members</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.avatar_emoji} {u.display_name}</option>
          ))}
        </select>

        <select className="form-input" style={{ width: 'auto', padding: '6px 32px 6px 12px', fontSize: '0.82rem' }}
          value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="due_date">Due Date</option>
          <option value="priority">Priority</option>
        </select>
      </div>

      {/* Task list */}
      <div className="tasks-list">
        {tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-emoji">{'\uD83C\uDF1F'}</div>
            <h3>No tasks here</h3>
            <p>{statusFilter === 'done' ? 'Nothing completed yet — get going!' : 'Create your first task to get started!'}</p>
          </div>
        ) : (
          tasks.map(task => {
            const due = formatDue(task.due_date);
            return (
              <div
                key={task.id}
                className={`task-card ${task.status === 'done' ? 'done' : ''}`}
                onClick={() => setDetailTask(task)}
              >
                <button
                  className="task-check"
                  onClick={(e) => handleComplete(e, task)}
                  title={task.status === 'done' ? 'Reopen' : 'Complete'}
                >
                  {task.status === 'done' ? '\u2713' : ''}
                </button>

                <div className="task-body">
                  <div className="task-title">{task.title}</div>
                  <div className="task-meta">
                    <span className="task-badge badge-category">
                      {getCategoryEmoji(task.category)} {task.category}
                    </span>
                    <span className={`task-badge badge-priority-${task.priority}`}>
                      {task.priority}
                    </span>
                    {due && (
                      <span className={`task-badge badge-due ${due.className}`}>
                        {'\uD83D\uDCC5'} {due.label}
                      </span>
                    )}
                    {task.assignee_name && (
                      <span className="task-badge badge-assignee">
                        {task.assignee_emoji} {task.assignee_name}
                      </span>
                    )}
                    <span className="task-badge badge-points">
                      {'\u2B50'} {task.points_value}
                    </span>
                    {task.recurrence && task.recurrence !== 'none' && (
                      <span className="task-badge badge-recurrence">
                        {'\uD83D\uDD01'} {RECURRENCE_LABELS[task.recurrence]}
                      </span>
                    )}
                    {parseInt(task.comment_count) > 0 && (
                      <span className="task-badge badge-comments">
                        {'\uD83D\uDCAC'} {task.comment_count}
                      </span>
                    )}
                  </div>
                </div>

                <div className="task-actions">
                  <button className="btn-icon" onClick={(e) => handleEdit(e, task)} title="Edit">
                    {'\u270F\uFE0F'}
                  </button>
                  <button className="btn-icon" onClick={(e) => handleDelete(e, task)} title="Delete">
                    {'\uD83D\uDDD1\uFE0F'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <TaskModal users={users} onClose={() => setShowCreate(false)} onSave={handleSave} />
      )}
      {editTask && (
        <TaskModal task={editTask} users={users} onClose={() => setEditTask(null)} onSave={handleSave} />
      )}
      {detailTask && (
        <TaskDetail task={detailTask} onClose={() => setDetailTask(null)} />
      )}
    </div>
  );
}
