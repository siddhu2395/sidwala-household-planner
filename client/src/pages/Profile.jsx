import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

const AVATAR_OPTIONS = [
  '😊', '😎', '🥰', '🤩', '🥳',
  '🧑‍🍳', '🧑‍🚀', '🧑‍🎨', '🧑‍💻', '🧑‍🌾',
  '👑', '🦁', '🦊', '🐻', '🐶',
  '🐱', '🦉', '🦄', '🌟', '🌈',
];

export default function Profile() {
  const { user, refreshUser } = useAuth();

  // Profile form
  const [profileForm, setProfileForm] = useState({
    display_name: user?.display_name || '',
    avatar_emoji: user?.avatar_emoji || '😊',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password form
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!profileForm.display_name.trim()) {
      setProfileError('Display name cannot be empty');
      return;
    }
    setProfileSaving(true);
    setProfileMsg('');
    setProfileError('');
    try {
      await api.updateUser(user.id, profileForm);
      await refreshUser();
      setProfileMsg('Profile updated!');
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) {
      setPwError('All fields are required');
      return;
    }
    if (pwForm.next.length < 6) {
      setPwError('New password must be at least 6 characters');
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwError('New passwords do not match');
      return;
    }
    setPwSaving(true);
    setPwMsg('');
    setPwError('');
    try {
      await api.changePassword(pwForm.current, pwForm.next);
      setPwMsg('Password changed successfully!');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>{'\uD83D\uDC64'} My Profile</h1>
      </div>

      <div className="profile-grid">
        {/* Profile info card */}
        <div className="profile-card">
          <h2 className="profile-card-title">{'\uD83C\uDFA8'} Display Info</h2>

          <form onSubmit={handleProfileSave}>
            <div className="form-group">
              <label>Avatar</label>
              <div className="emoji-picker">
                {AVATAR_OPTIONS.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    className={`emoji-option ${profileForm.avatar_emoji === emoji ? 'selected' : ''}`}
                    onClick={() => setProfileForm({ ...profileForm, avatar_emoji: emoji })}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Display Name</label>
              <input
                className="form-input"
                type="text"
                value={profileForm.display_name}
                onChange={(e) => setProfileForm({ ...profileForm, display_name: e.target.value })}
                placeholder="Your name"
              />
            </div>

            <div className="form-group">
              <label>Username</label>
              <input
                className="form-input"
                type="text"
                value={user?.username || ''}
                disabled
                style={{ opacity: 0.6, cursor: 'not-allowed' }}
              />
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Username cannot be changed
              </div>
            </div>

            {profileError && <div className="error-msg">{profileError}</div>}
            {profileMsg && <div className="success-msg">{profileMsg}</div>}

            <button className="btn btn-primary" type="submit" disabled={profileSaving}>
              {profileSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Password card */}
        <div className="profile-card">
          <h2 className="profile-card-title">{'\uD83D\uDD11'} Change Password</h2>

          <form onSubmit={handlePasswordSave}>
            <div className="form-group">
              <label>Current Password</label>
              <input
                className="form-input"
                type="password"
                value={pwForm.current}
                onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                autoComplete="current-password"
                placeholder="Enter current password"
              />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input
                className="form-input"
                type="password"
                value={pwForm.next}
                onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
                autoComplete="new-password"
                placeholder="At least 6 characters"
              />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                className="form-input"
                type="password"
                value={pwForm.confirm}
                onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                autoComplete="new-password"
                placeholder="Repeat new password"
              />
            </div>

            {pwError && <div className="error-msg">{pwError}</div>}
            {pwMsg && <div className="success-msg">{pwMsg}</div>}

            <button className="btn btn-primary" type="submit" disabled={pwSaving}>
              {pwSaving ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
