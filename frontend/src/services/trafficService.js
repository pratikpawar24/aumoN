import api from './api';

const trafficService = {
  predictTraffic: async (lat, lng, radiusKm = 5) => {
    const res = await api.get('/api/traffic/predict', {
      params: { lat, lng, radius_km: radiusKm },
    });
    return res.data;
  },

  getCurrentConditions: async (lat, lng) => {
    const res = await api.get('/api/traffic/current', { params: { lat, lng } });
    return res.data;
  },
};

export default trafficService;