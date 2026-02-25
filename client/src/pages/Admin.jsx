import React, { useState, useEffect } from 'react';
import { api } from '../api';

const AVATAR_OPTIONS = [
  '\uD83D\uDE0A', '\uD83D\uDE0E', '\uD83E\uDD70', '\uD83E\uDD29', '\uD83E\uDD73',
  '\uD83E\uDDD1\u200D\uD83C\uDF73', '\uD83E\uDDD1\u200D\uD83D\uDE80', '\uD83E\uDDD1\u200D\uD83C\uDFA8',
  '\uD83E\uDDD1\u200D\uD83D\uDCBB', '\uD83E\uDDD1\u200D\uD83C\uDF3E',
  '\uD83D\uDC51', '\uD83E\uDD81', '\uD83E\uDD8A', '\uD83D\uDC3B', '\uD83D\uDC36',
  '\uD83D\uDC31', '\uD83E\uDD89', '\uD83E\uDD84', '\uD83C\uDF1F', '\uD83C\uDF08',
];

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    username: '', display_name: '', password: '', avatar_emoji: '\uD83D\uDE0A', is_admin: false,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      console.error('Load users error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.username || !form.display_name || !form.password) {
      setError('All fields are required');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await api.createUser(form);
      setShowCreate(false);
      setForm({ username: '', display_name: '', password: '', avatar_emoji: '\uD83D\uDE0A', is_admin: false });
      loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Delete user "${u.display_name}"? This cannot be undone.`)) return;
    try {
      await api.deleteUser(u.id);
      loadUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="loading-screen"><div className="loader" /><p>Loading...</p></div>;

  return (
    <div>
      <div className="page-header">
        <h1>{'\u2699\uFE0F'} Admin Panel</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + Add User
        </button>
      </div>

      <div className="users-grid">
        {users.map(u => (
          <div key={u.id} className="user-card">
            <div className="big-avatar">{u.avatar_emoji || '\uD83D\uDE0A'}</div>
            <div className="user-card-name">{u.display_name}</div>
            <div className="user-card-username">@{u.username}</div>
            {u.is_admin && <span className="admin-badge">{'\uD83D\uDC51'} Admin</span>}
            <div className="user-card-stats">
              <div>{'\u2B50'} <span>{u.points}</span> pts</div>
              <div>{'\uD83D\uDD25'} <span>{u.streak_days}</span> streak</div>
            </div>
            {!u.is_admin && (
              <button
                className="btn btn-danger btn-sm"
                style={{ marginTop: 8 }}
                onClick={() => handleDelete(u)}
              >
                Remove User
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>{'\uD83D\uDC64'} New Household Member</h2>
              <button className="btn-icon" onClick={() => setShowCreate(false)}>{'\u2715'}</button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="modal-body">
                {error && <div className="error-msg">{error}</div>}

                <div className="form-group">
                  <label>Choose an Avatar</label>
                  <div className="emoji-picker">
                    {AVATAR_OPTIONS.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        className={`emoji-option ${form.avatar_emoji === emoji ? 'selected' : ''}`}
                        onClick={() => setForm({ ...form, avatar_emoji: emoji })}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Username</label>
                    <input
                      className="form-input" type="text" placeholder="e.g. priya"
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Display Name</label>
                    <input
                      className="form-input" type="text" placeholder="e.g. Priya"
                      value={form.display_name}
                      onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Password</label>
                  <input
                    className="form-input" type="password" placeholder="Set a password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox" checked={form.is_admin}
                      onChange={(e) => setForm({ ...form, is_admin: e.target.checked })}
                    />
                    Make this user an admin
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
