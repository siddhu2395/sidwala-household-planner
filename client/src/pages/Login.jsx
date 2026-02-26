import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

const AVATAR_OPTIONS = [
  '😊', '😎', '🥰', '🤩', '🥳',
  '🧑‍🍳', '🧑‍🚀', '🧑‍🎨', '🧑‍💻', '🧑‍🌾',
  '👑', '🦁', '🦊', '🐻', '🐶',
  '🐱', '🦉', '🦄', '🌟', '🌈',
];

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'success'

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Signup form state
  const [signupForm, setSignupForm] = useState({
    username: '', display_name: '', password: '', confirm_password: '', avatar_emoji: '😊',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  if (user) { navigate('/'); return null; }

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) { setError('Please enter both fields'); return; }
    setLoading(true);
    setError('');
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    const { username: su, display_name, password: sp, confirm_password, avatar_emoji } = signupForm;
    if (!su || !display_name || !sp) { setError('All fields are required'); return; }
    if (sp !== confirm_password) { setError('Passwords do not match'); return; }
    if (sp.length < 6) { setError('Password must be at least 6 characters'); return; }

    setLoading(true);
    setError('');
    try {
      await api.signup({ username: su, display_name, password: sp, avatar_emoji });
      setMode('success');
    } catch (err) {
      setError(err.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next) => {
    setError('');
    setMode(next);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="house-emoji">{'\uD83C\uDFE0'}</div>
        <h1>Sidwala Planner</h1>
        <p className="subtitle">Your household, organized together</p>

        {mode !== 'success' && (
          <div className="login-tabs">
            <button
              className={`login-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => switchMode('login')}
              type="button"
            >
              Sign In
            </button>
            <button
              className={`login-tab ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => switchMode('signup')}
              type="button"
            >
              Sign Up
            </button>
          </div>
        )}

        {error && <div className="error-msg">{error}</div>}

        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Username</label>
              <input
                className="form-input" type="text" placeholder="Enter username"
                value={username} onChange={(e) => setUsername(e.target.value)}
                autoFocus autoComplete="username"
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                className="form-input" type="password" placeholder="Enter password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleSignup}>
            <div className="form-group">
              <label>Choose an Avatar</label>
              <div className="emoji-picker">
                {AVATAR_OPTIONS.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    className={`emoji-option ${signupForm.avatar_emoji === emoji ? 'selected' : ''}`}
                    onClick={() => setSignupForm({ ...signupForm, avatar_emoji: emoji })}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Display Name</label>
              <input
                className="form-input" type="text" placeholder="e.g. Priya"
                value={signupForm.display_name}
                onChange={(e) => setSignupForm({ ...signupForm, display_name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Username</label>
              <input
                className="form-input" type="text" placeholder="e.g. priya"
                value={signupForm.username}
                onChange={(e) => setSignupForm({ ...signupForm, username: e.target.value })}
                autoComplete="username"
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                className="form-input" type="password" placeholder="At least 6 characters"
                value={signupForm.password}
                onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                autoComplete="new-password"
              />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input
                className="form-input" type="password" placeholder="Repeat password"
                value={signupForm.confirm_password}
                onChange={(e) => setSignupForm({ ...signupForm, confirm_password: e.target.value })}
                autoComplete="new-password"
              />
            </div>
            <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Request Access'}
            </button>
          </form>
        )}

        {mode === 'success' && (
          <div className="signup-success">
            <div className="signup-success-icon">🎉</div>
            <h2>Request Sent!</h2>
            <p>Your account has been created and is waiting for admin approval. You'll be able to sign in once an admin approves your request.</p>
            <button className="btn btn-primary btn-full" onClick={() => switchMode('login')}>
              Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
