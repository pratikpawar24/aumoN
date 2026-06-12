import api from './api';
import { CONFIG } from '../constants/config';

export const routeService = {
  // optimizeFor: 'carbon' (Eco) | 'time' (Fastest). Returns
  // { primary_route, alternatives, ... }.
  calculate: async (origin, destination, options = {}) => {
    const res = await api.post(CONFIG.ENDPOINTS.ROUTE_CALCULATE, {
      origin,
      destination,
      vehicleType: options.vehicleType || 'car',
      optimizeFor: options.optimizeFor || 'carbon',
      avoidCongestion: options.avoidCongestion !== false,
      avoidTolls: !!options.avoidTolls,
      saveRoute: options.saveRoute !== false,
    });
    return res.data;
  },

  analytics: async (period = 'month') => {
    const res = await api.get(CONFIG.ENDPOINTS.ROUTE_ANALYTICS, { params: { period } });
    return res.data;
  },
};

export default routeService;
