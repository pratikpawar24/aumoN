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

  getAvailableRides: async (lat, lng, radius = 5) => {
    const res = await api.get('/api/carpool/available', { params: { lat, lng, radius } });
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

  getCarpoolHistory: async () => {
    const res = await api.get('/api/carpool/history');
    return res.data;
  },
};

export default carpoolService;