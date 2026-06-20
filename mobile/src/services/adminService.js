import api from './api';

// Admin endpoints (require an admin_master / admin_secondary account).
export const adminService = {
  getStats: async () => (await api.get('/api/admin/stats')).data,
  listUsers: async (params = {}) => (await api.get('/api/admin/users', { params })).data,
  getUser: async (id) => (await api.get(`/api/admin/users/${id}`)).data,
  verifyUser: async (id) => (await api.patch(`/api/admin/users/${id}/verify`)).data,
  blockUser: async (id, reason) => (await api.post(`/api/admin/users/${id}/block`, { reason })).data,
  unblockUser: async (id) => (await api.post(`/api/admin/users/${id}/unblock`)).data,
  removeUser: async (id) => (await api.delete(`/api/admin/users/${id}`)).data,
  activeRides: async () => (await api.get('/api/admin/rides/active')).data,
  getReports: async () => (await api.get('/api/admin/reports')).data,
  getSearchesReport: async (params = {}) => (await api.get('/api/admin/reports/searches', { params })).data,
  getScheduledReport: async (params = {}) => (await api.get('/api/admin/reports/scheduled', { params })).data,
};

export default adminService;
