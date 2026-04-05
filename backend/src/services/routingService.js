const axios = require('axios');
const { config } = require('../config/env');

const OSRM_BASE = 'https://router.project-osrm.org';
const ORS_BASE = 'https://api.openrouteservice.org/v2';

class RoutingService {
  constructor() {
    this.aiServiceUrl = config.aiServiceUrl;
  }

  // ── Primary: AI Service (Hugging Face) ────────────────────────────────────
  async getOptimizedRoute(origin, destination, options = {}) {
    try {
      const response = await axios.post(
        `${this.aiServiceUrl}/api/route/optimize`,
        {
          origin: { lat: origin.lat, lng: origin.lng },
          destination: { lat: destination.lat, lng: destination.lng },
          vehicle_type: options.vehicleType || 'car',
          optimize_for: options.optimizeFor || 'carbon',
          departure_time: options.departureTime || '08:00',
          avoid_congestion: options.avoidCongestion !== false,
          max_detour_percent: options.maxDetourPercent || 15,
        },
        { timeout: 30000 }
      );
      return { ...response.data, source: 'ai_service' };
    } catch (err) {
      console.warn('AI service unavailable, falling back to OSRM:', err.message);
      return this.getOSRMRoute(origin, destination, options);
    }
  }

  // ── Fallback: OSRM (free, open-source) ────────────────────────────────────
  async getOSRMRoute(origin, destination, options = {}) {
    try {
      const profile = this._osrmProfile(options.vehicleType);
      const url = `${OSRM_BASE}/route/v1/${profile}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
      const res = await axios.get(url, {
        params: {
          overview: 'full',
          geometries: 'geojson',
          steps: true,
          annotations: false,
        },
        timeout: 15000,
      });

      if (!res.data.routes || res.data.routes.length === 0) {
        throw new Error('No route found by OSRM');
      }

      const route = res.data.routes[0];
      const distanceKm = route.distance / 1000;
      const timeMinutes = route.duration / 60;
      const vehicleType = options.vehicleType || 'car';
      const emissionFactor = this._getEmissionFactor(vehicleType);
      const co2Grams = distanceKm * emissionFactor;
      const baseline = distanceKm * 150;
      const co2Saved = Math.max(0, baseline - co2Grams);
      const greenScore = baseline > 0
        ? Math.min(100, ((co2Saved / baseline) * 100) + 50)
        : 50;

      const geometry = route.geometry.coordinates.map((c) => [c[1], c[0]]);
      const instructions = (route.legs[0]?.steps || []).map((s, i) => ({
        step: i + 1,
        instruction: `${s.maneuver.type} on ${s.name || 'unnamed road'}`,
        distance_m: Math.round(s.distance),
        duration_s: Math.round(s.duration),
        type: s.maneuver.type,
      }));

      return {
        primary_route: {
          route_geometry: geometry,
          total_distance_km: Math.round(distanceKm * 100) / 100,
          total_time_minutes: Math.round(timeMinutes * 10) / 10,
          total_emissions_g: Math.round(co2Grams),
          carbon_saved_g: Math.round(co2Saved),
          baseline_emission_g: Math.round(baseline),
          green_score: Math.round(greenScore * 10) / 10,
          instructions,
          label: 'OSRM Route',
          color: '#3b82f6',
          profile: options.optimizeFor || 'balanced',
          vehicle_type: vehicleType,
          algorithm: 'osrm_fallback',
        },
        alternatives: [],
        modal_comparison: this._modalComparison(distanceKm, timeMinutes),
        source: 'osrm_fallback',
      };
    } catch (err) {
      console.error('OSRM error:', err.message);
      // Last resort: straight-line estimate
      return this._straightLineEstimate(origin, destination, options);
    }
  }

  // ── OpenRouteService (2000 req/day free) ──────────────────────────────────
  async getORSRoute(origin, destination, vehicleType = 'car') {
    if (!config.orsApiKey) return null;
    try {
      const profile = this._orsProfile(vehicleType);
      const res = await axios.post(
        `${ORS_BASE}/directions/${profile}/geojson`,
        {
          coordinates: [
            [origin.lng, origin.lat],
            [destination.lng, destination.lat],
          ],
          instructions: true,
          elevation: false,
        },
        {
          headers: { Authorization: config.orsApiKey },
          timeout: 15000,
        }
      );
      return res.data;
    } catch (err) {
      console.error('ORS error:', err.message);
      return null;
    }
  }

  // ── Multi-modal routes ────────────────────────────────────────────────────
  async getMultiModalRoutes(origin, destination) {
    const modes = ['car', 'electric', 'bike', 'walk'];
    const results = await Promise.allSettled(
      modes.map((mode) =>
        this.getOSRMRoute(origin, destination, { vehicleType: mode, optimizeFor: 'carbon' })
      )
    );
    return results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => r.value?.primary_route)
      .filter(Boolean);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  _osrmProfile(vehicleType) {
    const map = { car: 'car', electric: 'car', bike: 'bike', walk: 'foot', bus: 'car' };
    return map[vehicleType] || 'car';
  }

  _orsProfile(vehicleType) {
    const map = {
      car: 'driving-car', electric: 'driving-car',
      bike: 'cycling-regular', walk: 'foot-walking',
      bus: 'driving-car', motorcycle: 'driving-car',
    };
    return map[vehicleType] || 'driving-car';
  }

  _getEmissionFactor(vehicleType) {
    const factors = { car: 150, electric: 55, bus: 90, bike: 0, walk: 0, motorcycle: 100 };
    return factors[vehicleType] || 150;
  }

  _modalComparison(distanceKm, timeMin) {
    return [
      { mode: 'walk', icon: '🚶', label: 'Walk', emission_g: 0, time_min: Math.round(distanceKm / 5 * 60) },
      { mode: 'bike', icon: '🚲', label: 'Cycling', emission_g: 0, time_min: Math.round(distanceKm / 15 * 60) },
      { mode: 'electric', icon: '⚡', label: 'Electric Car', emission_g: Math.round(distanceKm * 55), time_min: Math.round(timeMin) },
      { mode: 'bus', icon: '🚌', label: 'Bus', emission_g: Math.round(distanceKm * 90), time_min: Math.round(distanceKm / 25 * 60) },
      { mode: 'car', icon: '🚗', label: 'Car (Petrol)', emission_g: Math.round(distanceKm * 150), time_min: Math.round(timeMin) },
    ];
  }

  _straightLineEstimate(origin, destination, options = {}) {
    const R = 6371;
    const dLat = ((destination.lat - origin.lat) * Math.PI) / 180;
    const dLng = ((destination.lng - origin.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((origin.lat * Math.PI) / 180) *
        Math.cos((destination.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    const distanceKm = 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const vehicleType = options.vehicleType || 'car';
    const speed = { car: 40, electric: 45, bike: 15, walk: 5, bus: 25, motorcycle: 50 }[vehicleType] || 40;
    const timeMin = (distanceKm / speed) * 60;
    const ef = this._getEmissionFactor(vehicleType);
    const emission = distanceKm * ef;
    const baseline = distanceKm * 150;

    return {
      primary_route: {
        route_geometry: [[origin.lat, origin.lng], [destination.lat, destination.lng]],
        total_distance_km: Math.round(distanceKm * 100) / 100,
        total_time_minutes: Math.round(timeMin * 10) / 10,
        total_emissions_g: Math.round(emission),
        carbon_saved_g: Math.round(Math.max(0, baseline - emission)),
        baseline_emission_g: Math.round(baseline),
        green_score: 50,
        instructions: [],
        label: 'Estimated Route',
        color: '#6b7280',
        algorithm: 'straight_line_estimate',
        fallback: true,
      },
      alternatives: [],
      modal_comparison: this._modalComparison(distanceKm, timeMin),
      source: 'estimate',
    };
  }
}

module.exports = new RoutingService();