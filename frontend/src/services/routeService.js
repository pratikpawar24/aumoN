import api from './api';

const routeService = {
  calculateRoute: async (origin, destination, options = {}) => {
    const res = await api.post('/api/routes/calculate', {
      origin,
      destination,
      vehicleType:    options.vehicleType    || 'car',
      optimizeFor:    options.optimizeFor    || 'carbon',
      departureTime:  options.departureTime  || null,
      avoidCongestion:options.avoidCongestion !== false,
      saveRoute:      options.saveRoute      !== false,
    });
    return res.data;
  },

  getRideHistory: async (page = 1, limit = 10, filters = {}) => {
    const res = await api.get('/api/routes/history', { params: { page, limit, ...filters } });
    return res.data;
  },

  getRideById: async (id) => {
    const res = await api.get(`/api/routes/${id}`);
    return res.data;
  },

  saveFavorite: async (routeData) => {
    const res = await api.post('/api/routes/favorites', routeData);
    return res.data;
  },

  getFavorites: async () => {
    const res = await api.get('/api/routes/favorites');
    return res.data;
  },

  getMultiModal: async (origin, destination) => {
    const res = await api.post('/api/routes/multimodal', { origin, destination });
    return res.data;
  },
};

export default routeService;