import api from './api';

const authService = {
  register: async ({ name, email, password, mobile, vehicleType = 'car' }) => {
    const res = await api.post('/api/auth/register', {
      name,
      email,
      password,
      mobile: mobile || '',
      vehicleType,
    });
    if (res.data.token) {
      localStorage.setItem('aumo_token', res.data.token);
      localStorage.setItem('aumo_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  sendVerification: async () => {
    const res = await api.post('/api/auth/send-verification');
    return res.data;
  },

  verifyEmail: async (otp) => {
    const res = await api.post('/api/auth/verify-email', { otp });
    if (res.data.user) {
      localStorage.setItem('aumo_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await api.post('/api/auth/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (res.data.user) {
      localStorage.setItem('aumo_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  login: async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password });
    if (res.data.token) {
      localStorage.setItem('aumo_token', res.data.token);
      localStorage.setItem('aumo_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  logout: () => {
    localStorage.removeItem('aumo_token');
    localStorage.removeItem('aumo_user');
  },

  getProfile: async () => {
    const res = await api.get('/api/auth/profile');
    return res.data;
  },

  updateProfile: async (updates) => {
    const res = await api.put('/api/auth/profile', updates);
    if (res.data.user) {
      localStorage.setItem('aumo_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  verifyToken: async () => {
    const res = await api.get('/api/auth/verify');
    return res.data;
  },

  getCurrentUser: () => {
    try {
      const user = localStorage.getItem('aumo_user');
      return user ? JSON.parse(user) : null;
    } catch { return null; }
  },

  getToken: () => localStorage.getItem('aumo_token'),

  isAuthenticated: () => !!localStorage.getItem('aumo_token'),
};

export default authService;