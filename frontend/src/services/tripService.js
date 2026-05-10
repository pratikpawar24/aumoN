import api from './api';

const tripService = {
  start: async ({ origin, destination, plannedGeometry, rideId }) => {
    const res = await api.post('/api/trips/start', {
      origin, destination, plannedGeometry, rideId,
    });
    return res.data;
  },

  appendWaypoint: async (tripId, { lat, lng, speedMps, accuracyM }) => {
    const res = await api.patch(`/api/trips/${tripId}/waypoint`, {
      lat, lng, speedMps, accuracyM,
    });
    return res.data;
  },

  end: async (tripId) => {
    const res = await api.post(`/api/trips/${tripId}/end`);
    return res.data;
  },

  getActive: async () => {
    const res = await api.get('/api/trips/active');
    return res.data;
  },
};

export default tripService;
