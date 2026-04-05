import { aiApi } from './api';
import api from './api';

const aiService = {
  // ── Direct AI calls (Hugging Face) ───────────────────────────────────────
  optimizeRoute: async (payload) => {
    try {
      const res = await aiApi.post('/api/route/optimize', payload);
      return res.data;
    } catch {
      // Fall back to backend proxy
      const res = await api.post('/api/ai/route/optimize', payload);
      return res.data;
    }
  },

  matchCarpool: async (payload) => {
    try {
      const res = await aiApi.post('/api/carpool/match', payload);
      return res.data;
    } catch {
      const res = await api.post('/api/ai/carpool/match', payload);
      return res.data;
    }
  },

  predictTraffic: async (payload) => {
    try {
      const res = await aiApi.post('/api/traffic/predict', payload);
      return res.data;
    } catch {
      const res = await api.post('/api/ai/traffic/predict', payload);
      return res.data;
    }
  },

  estimateEmissions: async (distanceKm, vehicleType, speedKmh = 40) => {
    try {
      const res = await aiApi.post('/api/emissions/estimate', {
        distance_km: distanceKm,
        vehicle_type: vehicleType,
        avg_speed_kmh: speedKmh,
      });
      return res.data;
    } catch {
      return null;
    }
  },

  getEmissionFactors: async () => {
    const res = await aiApi.get('/api/emissions/factors');
    return res.data;
  },

  healthCheck: async () => {
    try {
      const res = await aiApi.get('/health', { timeout: 5000 });
      return { online: true, ...res.data };
    } catch {
      return { online: false };
    }
  },
};

export default aiService;