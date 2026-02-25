import React, { useState, useEffect } from 'react';
import { api } from '../api';

const CATEGORIES = [
  { value: 'cleaning', label: 'Cleaning', emoji: '\uD83E\uDDF9' },
  { value: 'cooking', label: 'Cooking', emoji: '\uD83C\uDF73' },
  { value: 'shopping', label: 'Shopping', emoji: '\uD83D\uDED2' },
  { value: 'repairs', label: 'Repairs', emoji: '\uD83D\uDD27' },
  { value: 'garden', label: 'Garden', emoji: '\uD83C\uDF31' },
  { value: 'laundry', label: 'Laundry', emoji: '\uD83E\uDDFA' },
  { value: 'pets', label: 'Pets', emoji: '\uD83D\uDC3E' },
  { value: 'finance', label: 'Finance', emoji: '\uD83D\uDCB0' },
  { value: 'organization', label: 'Organization', emoji: '\uD83D\uDCE6' },
  { value: 'errands', label: 'Errands', emoji: '\uD83D\uDE97' },
  { value: 'wellness', label: 'Wellness', emoji: '\uD83E\uDDD8' },
  { value: 'other', label: 'Other', emoji: '\uD83D\uDCCC' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const RECURRENCE = [
  { value: 'none', label: 'No repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export default function TaskModal({ task, users, onClose, onSave }) {
  const isEditing = !!task;
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'other',
    priority: 'medium',
    assigned_to: '',
    due_date: '',
    points_value: 10,
    recurrence: 'none',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        category: task.category || 'other',
        priority: task.priority || 'medium',
        assigned_to: task.assigned_to || '',
        due_date: task.due_date ? task.due_date.slice(0, 10) : '',
        points_value: task.points_value || 10,
        recurrence: task.recurrence || 'none',
      });
    }
  }, [task]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }

    setSaving(true);
    setError('');
    try {
      const data = {
        ...form,
        assigned_to: form.assigned_to ? parseInt(form.assigned_to) : null,
        due_date: form.due_date || null,
        points_value: parseInt(form.points_value) || 10,
      };
      if (isEditing) {
        await api.updateTask(task.id, data);
      } else {
        await api.createTask(data);
      }
      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Task' : '\u2728 New Task'}</h2>
          <button className="btn-icon" onClick={onClose}>{'\u2715'}</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-msg">{error}</div>}

            <div className="form-group">
              <label>What needs to be done?</label>
              <input
                className="form-input" type="text" placeholder="e.g. Clean the kitchen"
                value={form.title} onChange={set('title')} autoFocus
              />
            </div>

            <div className="form-group">
              <label>Details (optional)</label>
              <textarea
                className="form-input" placeholder="Any extra details..."
                value={form.description} onChange={set('description')}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Category</label>
                <select className="form-input" value={form.category} onChange={set('category')}>
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select className="form-input" value={form.priority} onChange={set('priority')}>
                  {PRIORITIES.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Assign To</label>
                <select className="form-input" value={form.assigned_to} onChange={set('assigned_to')}>
                  <option value="">Unassigned</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.avatar_emoji} {u.display_name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Due Date</label>
                <input
                  className="form-input" type="date"
                  value={form.due_date} onChange={set('due_date')}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Points Value</label>
                <select className="form-input" value={form.points_value} onChange={set('points_value')}>
                  <option value="5">5 pts - Quick</option>
                  <option value="10">10 pts - Normal</option>
                  <option value="20">20 pts - Effort</option>
                  <option value="50">50 pts - Big Job</option>
                  <option value="100">100 pts - Epic</option>
                </select>
              </div>
              <div className="form-group">
                <label>Repeat</label>
                <select className="form-input" value={form.recurrence} onChange={set('recurrence')}>
                  {RECURRENCE.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : (isEditing ? 'Update' : 'Create Task')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export { CATEGORIES };
