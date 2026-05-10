const axios = require('axios');
const { config } = require('../config/env');

/**
 * TollGuru toll-cost estimation. Free tier: 5,000 calls / month after
 * sign-up. Returns toll prices in INR for Indian roads (and the
 * equivalent local currency for many other countries).
 *
 * Docs: https://tollguru.com/developers
 *
 * Feature-flagged on TOLLGURU_API_KEY. Without it, estimateForRoute
 * returns null and callers should fall back to the heuristic toll
 * badge (uses_highway flag from routingService).
 */

const TOLLGURU_URL = 'https://apis.tollguru.com/toll/v2';

const isConfigured = () => Boolean(config.tollGuruApiKey);

const vehicleToTollGuru = (vt) => {
  // TollGuru "vehicleType" enum.
  const map = {
    car: '2AxlesAuto',
    electric: '2AxlesAuto',
    motorcycle: '2AxlesMotorcycle',
    bus: '2AxlesAuto',  // best fit; TollGuru splits buses by axles
  };
  return map[vt] || '2AxlesAuto';
};

/**
 * Estimate tolls for a route given its OSRM/internal polyline.
 *
 * routeGeometry: [[lat, lng], ...]
 * vehicleType:   'car' | 'electric' | 'motorcycle' | 'bus' | ...
 *
 * Returns:
 *   {
 *     hasTolls: boolean,
 *     count: number,
 *     costInr: number,
 *     currency: 'INR',
 *     tolls: [{ name, road, costInr }],
 *   }
 * or null on failure / unconfigured.
 */
const estimateForRoute = async (routeGeometry, vehicleType = 'car') => {
  if (!isConfigured()) return null;
  if (!Array.isArray(routeGeometry) || routeGeometry.length < 2) return null;

  // TollGuru expects [{lat, lng}] or polyline string. Use lat/lng objects.
  const polyline = routeGeometry
    .filter((c) => Array.isArray(c) && c.length >= 2)
    .map((c) => ({ lat: c[0], lng: c[1] }));

  if (polyline.length < 2) return null;

  // Sample heavily-long polylines (TollGuru is happier with <500 points).
  const MAX_POINTS = 300;
  const sampled = polyline.length > MAX_POINTS
    ? polyline.filter((_, i) => i % Math.ceil(polyline.length / MAX_POINTS) === 0)
    : polyline;

  try {
    const { data } = await axios.post(
      `${TOLLGURU_URL}/origin-destination-waypoints`,
      {
        from: sampled[0],
        to: sampled[sampled.length - 1],
        waypoints: sampled.slice(1, -1),
        vehicleType: vehicleToTollGuru(vehicleType),
        departure_time: Math.floor(Date.now() / 1000),
      },
      {
        headers: {
          'x-api-key': config.tollGuruApiKey,
          'content-type': 'application/json',
        },
        timeout: 8000,
      }
    );

    const route = (data.routes || [])[0];
    if (!route) return null;

    const tolls = (route.tolls || []).map((t) => ({
      name: t.name || 'Toll booth',
      road: t.road || '',
      costInr:
        t.cashCost ||
        t.tagCost ||
        t.licensePlateCost ||
        0,
    }));

    const costInr = tolls.reduce((s, t) => s + (t.costInr || 0), 0);

    return {
      hasTolls: tolls.length > 0,
      count: tolls.length,
      costInr: Math.round(costInr),
      currency: route.costs?.currency || 'INR',
      tolls,
      source: 'tollguru',
    };
  } catch (err) {
    console.warn('TollGuru estimate failed:', err.response?.data?.message || err.message);
    return null;
  }
};

module.exports = { estimateForRoute, isConfigured };
