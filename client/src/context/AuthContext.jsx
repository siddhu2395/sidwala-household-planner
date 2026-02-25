import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('sidwala_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sidwala_token');
    if (token) {
      api.me()
        .then(u => { setUser(u); localStorage.setItem('sidwala_user', JSON.stringify(u)); })
        .catch(() => { setUser(null); localStorage.removeItem('sidwala_token'); localStorage.removeItem('sidwala_user'); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const data = await api.login(username, password);
    localStorage.setItem('sidwala_token', data.token);
    localStorage.setItem('sidwala_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('sidwala_token');
    localStorage.removeItem('sidwala_user');
    setUser(null);
  };

  const refreshUser = async () => {
    const u = await api.me();
    setUser(u);
    localStorage.setItem('sidwala_user', JSON.stringify(u));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
