import api from './api';

const carpoolService = {
  createRequest: async (data) => {
    const res = await api.post('/api/carpool/request', data);
    return res.data;
  },

  getMyRequests: async () => {
    const res = await api.get('/api/carpool/my-requests');
    return res.data;
  },

  getAvailableRides: async (params = {}) => {
    const res = await api.get('/api/carpool/available', { params });
    return res.data;
  },

  getMatchDetails: async (matchId) => {
    const res = await api.get(`/api/carpool/match/${matchId}`);
    return res.data;
  },

  cancelRequest: async (requestId) => {
    const res = await api.patch(`/api/carpool/request/${requestId}/cancel`);
    return res.data;
  },

  getCarpoolHistory: async (params = {}) => {
    const res = await api.get('/api/carpool/history', { params });
    return res.data;
  },

  // ── Chat ─────────────────────────────────────────────────────────────────
  listMessages: async (rideId, peerId) => {
    const res = await api.get(`/api/chat/${rideId}/messages`, {
      params: peerId ? { peerId } : {},
    });
    return res.data;
  },
  sendMessage: async (rideId, body, peerId) => {
    const res = await api.post(`/api/chat/${rideId}/messages`, { body, peerId });
    return res.data;
  },
  listThreads: async () => {
    const res = await api.get('/api/chat/threads');
    return res.data;
  },
  confirmRide: async (rideId, passengerId, agreedPrice) => {
    const res = await api.post(`/api/chat/${rideId}/confirm`, { passengerId, agreedPrice });
    return res.data;
  },
};

export default carpoolService;