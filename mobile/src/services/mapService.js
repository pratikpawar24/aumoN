import api from './api';
import { CONFIG } from '../constants/config';

export const mapService = {
  // Server-side geocoding proxy (Photon→Nominatim). Returns
  // { results: [{ id, name, display, lat, lng, category }] }.
  autocomplete: async (q, lat = null, lng = null) => {
    const res = await api.get(CONFIG.ENDPOINTS.MAP_AUTOCOMPLETE, {
      params: { q, ...(lat && lng ? { lat, lng } : {}) },
    });
    return res.data.results || [];
  },

  reverseGeocode: async (lat, lng) => {
    const res = await api.get(CONFIG.ENDPOINTS.MAP_REVERSE, { params: { lat, lng } });
    return res.data.result || null;
  },

  leaderboard: async () => {
    const res = await api.get(CONFIG.ENDPOINTS.LEADERBOARD);
    return res.data.leaderboard || [];
  },
};

export default mapService;
