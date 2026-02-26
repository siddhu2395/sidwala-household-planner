import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function Layout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();

  const closeSidebar = () => setSidebarOpen(false);

  // Refresh unread count on navigation and every 30s
  useEffect(() => {
    let active = true;
    const fetchUnread = async () => {
      try {
        const data = await api.getUnreadCount();
        if (active) setUnreadCount(data.count);
      } catch (err) { /* silent */ }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => { active = false; clearInterval(interval); };
  }, [location.pathname]);

  return (
    <div className="app-layout">
      {/* Mobile header */}
      <div className="mobile-header">
        <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? '\u2715' : '\u2630'}
        </button>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--lavender-deep)' }}>
          {'\uD83C\uDFE0'} Sidwala
        </span>
        <div style={{ width: 36 }} />
      </div>

      {/* Mobile overlay */}
      <div
        className={`mobile-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={closeSidebar}
      />

      {/* Sidebar */}
      <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>{'\uD83C\uDFE0'} Sidwala Planner</h2>
          <div className="app-version">Household Edition v1.0</div>
        </div>

        <div className="sidebar-nav">
          <NavLink to="/" end onClick={closeSidebar}>
            <span className="nav-emoji">{'\uD83D\uDCCA'}</span> Dashboard
          </NavLink>
          <NavLink to="/tasks" onClick={closeSidebar}>
            <span className="nav-emoji">{'\u2705'}</span> Tasks
          </NavLink>
          <NavLink to="/leaderboard" onClick={closeSidebar}>
            <span className="nav-emoji">{'\uD83C\uDFC6'}</span> Leaderboard
          </NavLink>
          <NavLink to="/notes" onClick={closeSidebar}>
            <span className="nav-emoji">{'\uD83D\uDCDD'}</span> Notes
          </NavLink>
          <NavLink to="/messages" onClick={closeSidebar} style={{ position: 'relative' }}>
            <span className="nav-emoji">{'\uD83D\uDCAC'}</span> Messages
            {unreadCount > 0 && (
              <span className="nav-unread-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </NavLink>
          {user?.is_admin && (
            <NavLink to="/admin" onClick={closeSidebar}>
              <span className="nav-emoji">{'\u2699\uFE0F'}</span> Admin
            </NavLink>
          )}

          <div style={{ flex: 1 }} />

          <button onClick={() => { logout(); closeSidebar(); }}>
            <span className="nav-emoji">{'\uD83D\uDEAA'}</span> Sign Out
          </button>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">{user?.avatar_emoji || '\uD83D\uDE0A'}</div>
          <div className="user-info">
            <div className="user-name">{user?.display_name}</div>
            <div className="user-points">
              {'\u2B50'} {user?.points || 0} points {'\u00B7'} {'\uD83D\uDD25'} {user?.streak_days || 0} day streak
            </div>
          </div>
        </div>
      </nav>

      {/* Main */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
