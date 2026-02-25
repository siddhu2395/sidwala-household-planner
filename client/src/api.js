const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('sidwala_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem('sidwala_token');
    localStorage.removeItem('sidwala_user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Auth
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  me: () => request('/auth/me'),
  changePassword: (current_password, new_password) =>
    request('/auth/password', { method: 'PUT', body: JSON.stringify({ current_password, new_password }) }),

  // Users
  getUsers: () => request('/users'),
  createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),

  // Tasks
  getTasks: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/tasks${qs ? `?${qs}` : ''}`);
  },
  createTask: (data) => request('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id, data) => request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
  completeTask: (id) => request(`/tasks/${id}/complete`, { method: 'POST' }),
  reopenTask: (id) => request(`/tasks/${id}/reopen`, { method: 'POST' }),

  // Comments
  getComments: (taskId) => request(`/tasks/${taskId}/comments`),
  addComment: (taskId, content) =>
    request(`/tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),

  // Stats
  getDashboard: () => request('/stats/dashboard'),
  getLeaderboard: () => request('/stats/leaderboard'),
  getAchievements: (userId) => request(`/stats/achievements/${userId}`),
};
