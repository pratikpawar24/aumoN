import api from './api';
import { CONFIG } from '../constants/config';

export const carpoolService = {
  // Create a ride request (driver offering, or passenger seeking).
  createRequest: async (payload) => {
    const res = await api.post(CONFIG.ENDPOINTS.CARPOOL_REQUEST, payload);
    return res.data;
  },

  // Available driver rides. params: fromLat, fromLng, toLat, toLng, sort, radius.
  getAvailable: async (params = {}) => {
    const res = await api.get(CONFIG.ENDPOINTS.CARPOOL_AVAILABLE, { params });
    return res.data;
  },

  getHistory: async (params = {}) => {
    const res = await api.get(CONFIG.ENDPOINTS.CARPOOL_HISTORY, { params });
    return res.data;
  },

  cancelRequest: async (id) => {
    const res = await api.patch(`/api/carpool/request/${id}/cancel`);
    return res.data;
  },

  // ── Chat / negotiation ────────────────────────────────────────────────────
  listThreads: async () => (await api.get('/api/chat/threads')).data,
  listMessages: async (rideId, peerId) =>
    (await api.get(`/api/chat/${rideId}/messages`, { params: peerId ? { peerId } : {} })).data,
  sendMessage: async (rideId, body, peerId) =>
    (await api.post(`/api/chat/${rideId}/messages`, { body, peerId })).data,
  confirmRide: async (rideId, passengerId, agreedPrice) =>
    (await api.post(`/api/chat/${rideId}/confirm`, { passengerId, agreedPrice })).data,
};

export default carpoolService;
