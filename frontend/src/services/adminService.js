import api from './api';

const adminService = {
  // Shared (any admin)
  getStats: async () => (await api.get('/api/admin/stats')).data,
  listUsers: async (params = {}) => (await api.get('/api/admin/users', { params })).data,
  getUser: async (id) => (await api.get(`/api/admin/users/${id}`)).data,
  blockUser: async (id, reason) => (await api.post(`/api/admin/users/${id}/block`, { reason })).data,
  unblockUser: async (id) => (await api.post(`/api/admin/users/${id}/unblock`)).data,
  verifyUser: async (id) => (await api.patch(`/api/admin/users/${id}/verify`)).data,
  removeUser: async (id) => (await api.delete(`/api/admin/users/${id}`)).data,
  activeRides: async () => (await api.get('/api/admin/rides/active')).data,

  // Master only
  listAdmins: async () => (await api.get('/api/admin/admins')).data,
  createAdmin: async (payload) => (await api.post('/api/admin/admins', payload)).data,
  adminActivity: async (params = {}) => (await api.get('/api/admin/admins/activity', { params })).data,
  blockAdmin: async (id, reason) => (await api.post(`/api/admin/admins/${id}/block`, { reason })).data,
  unblockAdmin: async (id) => (await api.post(`/api/admin/admins/${id}/unblock`)).data,
  removeAdmin: async (id) => (await api.delete(`/api/admin/admins/${id}`)).data,
};

export default adminService;
