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
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    username: '', display_name: '', password: '', avatar_emoji: '\uD83D\uDE0A', is_admin: false,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset password modal state
  const [resetTarget, setResetTarget] = useState(null); // user object
  const [resetPw, setResetPw] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSaving, setResetSaving] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [userData, pendingData] = await Promise.all([
        api.getUsers(),
        api.getPendingUsers(),
      ]);
      setUsers(userData);
      setPendingUsers(pendingData);
    } catch (err) {
      console.error('Load admin data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (u) => {
    try {
      await api.approveUser(u.id);
      loadAll();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReject = async (u) => {
    if (!window.confirm(`Reject "${u.display_name}"'s sign-up request? Their account will be deleted.`)) return;
    try {
      await api.rejectUser(u.id);
      loadAll();
    } catch (err) {
      alert(err.message);
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
      loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openResetPw = (u) => {
    setResetTarget(u);
    setResetPw('');
    setResetMsg('');
    setResetError('');
  };

  const handleResetPw = async (e) => {
    e.preventDefault();
    if (resetPw.length < 6) { setResetError('Password must be at least 6 characters'); return; }
    setResetSaving(true);
    setResetMsg('');
    setResetError('');
    try {
      await api.adminResetPassword(resetTarget.id, resetPw);
      setResetMsg('Password reset successfully!');
      setResetPw('');
    } catch (err) {
      setResetError(err.message);
    } finally {
      setResetSaving(false);
    }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Delete user "${u.display_name}"? This cannot be undone.`)) return;
    try {
      await api.deleteUser(u.id);
      loadAll();
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

      {/* Pending Approvals */}
      {pendingUsers.length > 0 && (
        <div className="pending-section">
          <h2 className="pending-section-title">
            {'\uD83D\uDD14'} Pending Approvals
            <span className="pending-badge">{pendingUsers.length}</span>
          </h2>
          <div className="pending-list">
            {pendingUsers.map(u => (
              <div key={u.id} className="pending-card">
                <div className="pending-avatar">{u.avatar_emoji || '\uD83D\uDE0A'}</div>
                <div className="pending-info">
                  <div className="pending-name">{u.display_name}</div>
                  <div className="pending-username">@{u.username}</div>
                  <div className="pending-date">
                    Requested {new Date(u.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="pending-actions">
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => handleApprove(u)}
                  >
                    {'\u2713'} Approve
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleReject(u)}
                  >
                    {'\u2715'} Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Household Members */}
      <h2 className="section-title">Household Members</h2>
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
            <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => openResetPw(u)}
              >
                {'\uD83D\uDD11'} Reset PW
              </button>
              {!u.is_admin && (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(u)}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setResetTarget(null)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2>{'\uD83D\uDD11'} Reset Password</h2>
              <button className="btn-icon" onClick={() => setResetTarget(null)}>{'\u2715'}</button>
            </div>
            <form onSubmit={handleResetPw}>
              <div className="modal-body">
                <p style={{ marginBottom: 16, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Setting new password for <strong>{resetTarget.display_name}</strong> (@{resetTarget.username})
                </p>
                {resetError && <div className="error-msg">{resetError}</div>}
                {resetMsg && <div className="success-msg">{resetMsg}</div>}
                <div className="form-group">
                  <label>New Password</label>
                  <input
                    className="form-input"
                    type="password"
                    placeholder="At least 6 characters"
                    value={resetPw}
                    onChange={(e) => setResetPw(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setResetTarget(null)}>Close</button>
                <button type="submit" className="btn btn-primary" disabled={resetSaving}>
                  {resetSaving ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
