const axios = require('axios');
const { config } = require('../config/env');

// Multiple public OSRM mirrors. The "official" demo at project-osrm.org
// is rate-limited from many hosted-app IP ranges and routinely times out;
// we try each mirror in turn before falling through to ORS / straight-line.
const OSRM_MIRRORS = [
  'https://router.project-osrm.org',
  'https://routing.openstreetmap.de/routed-car',  // driving profile only
];
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
  //
  // OSRM has only a single driving profile, so by default eco/fastest/
  // shortest/balanced all look identical. To still give users a *visibly*
  // different polyline per profile, we ask OSRM for up to 3 alternatives
  // and pick a different one based on the requested optimizeFor:
  //   time      → fastest (shortest duration)
  //   distance  → shortest (smallest distance)
  //   carbon    → "eco" heuristic: most turns / least average step length
  //               (proxy for non-highway routing)
  //   balanced  → middle by composite (duration + distance) score
  //
  // The other alternatives are returned as `alternatives` so users can flip
  // between them.
  async getOSRMRoute(origin, destination, options = {}) {
    try {
      const profile = this._osrmProfile(options.vehicleType);
      const path = `/route/v1/${profile}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
      let lastError = null;
      let res = null;

      for (const base of OSRM_MIRRORS) {
        if (base.includes('routed-car') && profile !== 'car') continue;
        const url = `${base}${path}`;
        try {
          res = await axios.get(url, {
            params: {
              overview: 'full',
              geometries: 'geojson',
              steps: true,
              annotations: false,
              // Ask for alternatives. The number is best-effort; some mirrors
              // ignore "alternatives.max_paths" but accept the boolean.
              alternatives: 3,
            },
            headers: {
              'User-Agent': 'AUMO-App/2.0 (urban-mobility-optimizer)',
              'Accept': 'application/json',
            },
            timeout: 10000,
            validateStatus: (s) => s >= 200 && s < 300,
          });
          if (res.data?.routes?.length) break;
          lastError = new Error(`OSRM ${base}: empty result`);
          res = null;
        } catch (err) {
          const status = err.response?.status;
          lastError = new Error(
            `OSRM ${base} failed: ${err.message || ''}${status ? ` [HTTP ${status}]` : ''}`
          );
          continue;
        }
      }

      if (!res || !res.data?.routes?.length) {
        throw lastError || new Error('No OSRM mirror returned a route');
      }

      const optimizeFor = options.optimizeFor || 'carbon';
      const vehicleType = options.vehicleType || 'car';
      const allRoutes = res.data.routes;
      const picked = this._pickAlternativeForProfile(allRoutes, optimizeFor);
      const primary = this._osrmRouteToShape(picked.route, vehicleType, optimizeFor, picked.label);

      // Build other alternatives — same shape, different label/color so the
      // map can render them and users can switch.
      const alternatives = allRoutes
        .map((r, i) => ({ r, i }))
        .filter(({ i }) => i !== picked.index)
        .slice(0, 3)
        .map(({ r }, i) => {
          const altProfile = this._altProfileForIndex(i, optimizeFor);
          return this._osrmRouteToShape(r, vehicleType, altProfile, this._labelForProfile(altProfile));
        });

      return {
        primary_route: primary,
        alternatives,
        modal_comparison: this._modalComparison(primary.total_distance_km, primary.total_time_minutes),
        source: 'osrm_fallback',
      };
    } catch (err) {
      // Better diagnostics so the Render logs actually tell you why OSRM
      // dropped to a straight line.
      const status = err.response?.status;
      const body = err.response?.data;
      console.error(
        'OSRM error:',
        err.message || '(no message)',
        status ? `[HTTP ${status}]` : '',
        body && typeof body === 'string' ? body.slice(0, 200) : ''
      );

      // Try OpenRouteService as a second fallback if a key is configured.
      if (config.orsApiKey) {
        const ors = await this._convertORSToRoute(origin, destination, options);
        if (ors) return ors;
      }

      // Last resort: straight-line estimate.
      return this._straightLineEstimate(origin, destination, options);
    }
  }

  // ── ORS-style route, converted to our internal shape ──────────────────────
  async _convertORSToRoute(origin, destination, options = {}) {
    try {
      const data = await this.getORSRoute(origin, destination, options.vehicleType);
      if (!data?.features?.[0]) return null;
      const feat = data.features[0];
      const coords = feat.geometry.coordinates.map((c) => [c[1], c[0]]);
      const summary = feat.properties.summary || {};
      const distanceKm = (summary.distance || 0) / 1000;
      const timeMinutes = (summary.duration || 0) / 60;
      const vehicleType = options.vehicleType || 'car';
      const ef = this._getEmissionFactor(vehicleType);
      const co2 = distanceKm * ef;
      const baseline = distanceKm * 150;
      const co2Saved = Math.max(0, baseline - co2);
      const savingsPct = baseline > 0
        ? (co2Saved / baseline) * 100
        : (vehicleType === 'bike' || vehicleType === 'walk' ? 100 : 0);
      const greenScore = Math.max(0, Math.min(100, savingsPct));

      return {
        primary_route: {
          route_geometry: coords,
          total_distance_km: Math.round(distanceKm * 100) / 100,
          total_time_minutes: Math.round(timeMinutes * 10) / 10,
          total_emissions_g: Math.round(co2),
          carbon_saved_g: Math.round(co2Saved),
          baseline_emission_g: Math.round(baseline),
          co2_savings_percent: Math.round(savingsPct * 10) / 10,
          green_score: Math.round(greenScore * 10) / 10,
          instructions: [],
          label: 'ORS Route',
          color: '#3b82f6',
          profile: options.optimizeFor || 'balanced',
          vehicle_type: vehicleType,
          algorithm: 'ors_fallback',
        },
        alternatives: [],
        modal_comparison: this._modalComparison(distanceKm, timeMinutes),
        source: 'ors_fallback',
      };
    } catch (e) {
      console.error('ORS conversion error:', e.message);
      return null;
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

  // ── Alternative-picking + shaping helpers ─────────────────────────────────
  _pickAlternativeForProfile(routes, optimizeFor) {
    if (!Array.isArray(routes) || routes.length === 0) return null;
    const indexed = routes.map((r, i) => ({
      r, i,
      duration: r.duration ?? 0,
      distance: r.distance ?? 0,
      steps: (r.legs?.[0]?.steps || []).length,
    }));

    let chosen;
    if (optimizeFor === 'time') {
      // Fastest = lowest duration.
      chosen = indexed.slice().sort((a, b) => a.duration - b.duration)[0];
    } else if (optimizeFor === 'distance') {
      // Shortest = lowest distance.
      chosen = indexed.slice().sort((a, b) => a.distance - b.distance)[0];
    } else if (optimizeFor === 'carbon') {
      // Eco heuristic: prefer the alt with the LOWEST average step length
      // (i.e. more, shorter steps => more turns => less highway). This is
      // imperfect but deterministically different from "fastest" most of
      // the time.
      chosen = indexed.slice().sort((a, b) => {
        const avgA = a.steps > 0 ? a.distance / a.steps : a.distance;
        const avgB = b.steps > 0 ? b.distance / b.steps : b.distance;
        return avgA - avgB;
      })[0];
    } else {
      // Balanced: composite score, duration in min + distance in km.
      chosen = indexed.slice().sort((a, b) => {
        const sa = (a.duration / 60) + (a.distance / 1000);
        const sb = (b.duration / 60) + (b.distance / 1000);
        return sa - sb;
      })[Math.min(1, indexed.length - 1)]; // middle-ranked when possible
    }

    return {
      route: chosen.r,
      index: chosen.i,
      label: this._labelForProfile(optimizeFor),
    };
  }

  _altProfileForIndex(i, primaryProfile) {
    // Cycle through the *other* profiles for alternatives so each labelled
    // alternative shows a different optimization than the primary.
    const all = ['carbon', 'time', 'distance', 'balanced'];
    const others = all.filter((p) => p !== primaryProfile);
    return others[i % others.length] || 'balanced';
  }

  _labelForProfile(profile) {
    return ({
      carbon:   'Eco Route',
      time:     'Fastest Route',
      distance: 'Shortest Route',
      balanced: 'Balanced Route',
    }[profile]) || 'Route';
  }

  _colorForProfile(profile) {
    return ({
      carbon:   '#22c55e',
      time:     '#ef4444',
      distance: '#3b82f6',
      balanced: '#f59e0b',
    }[profile]) || '#3b82f6';
  }

  _osrmRouteToShape(route, vehicleType, profile, label) {
    const distanceKm = (route.distance ?? 0) / 1000;
    const timeMinutes = (route.duration ?? 0) / 60;
    const ef = this._getEmissionFactor(vehicleType);
    const co2Grams = distanceKm * ef;
    const baseline = distanceKm * 150;
    const co2Saved = Math.max(0, baseline - co2Grams);
    const savingsPct = baseline > 0 ? (co2Saved / baseline) * 100 : 0;

    const geometry = (route.geometry?.coordinates || []).map((c) => [c[1], c[0]]);
    const instructions = (route.legs?.[0]?.steps || []).map((s, i) => ({
      step: i + 1,
      instruction: `${s.maneuver?.type || 'continue'} on ${s.name || 'unnamed road'}`,
      distance_m: Math.round(s.distance ?? 0),
      duration_s: Math.round(s.duration ?? 0),
      type: s.maneuver?.type,
    }));

    return {
      route_geometry: geometry,
      total_distance_km: Math.round(distanceKm * 100) / 100,
      total_time_minutes: Math.round(timeMinutes * 10) / 10,
      total_emissions_g: Math.round(co2Grams),
      carbon_saved_g: Math.round(co2Saved),
      baseline_emission_g: Math.round(baseline),
      co2_savings_percent: Math.round(savingsPct * 10) / 10,
      green_score: Math.round(Math.max(0, Math.min(100, savingsPct)) * 10) / 10,
      instructions,
      label: label || this._labelForProfile(profile),
      color: this._colorForProfile(profile),
      profile,
      vehicle_type: vehicleType,
      algorithm: 'osrm_alternatives',
    };
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
    const co2Saved = Math.max(0, baseline - emission);
    const savingsPct = baseline > 0
      ? (co2Saved / baseline) * 100
      : (vehicleType === 'bike' || vehicleType === 'walk' ? 100 : 0);
    const greenScore = Math.max(0, Math.min(100, savingsPct));

    return {
      primary_route: {
        route_geometry: [[origin.lat, origin.lng], [destination.lat, destination.lng]],
        total_distance_km: Math.round(distanceKm * 100) / 100,
        total_time_minutes: Math.round(timeMin * 10) / 10,
        total_emissions_g: Math.round(emission),
        carbon_saved_g: Math.round(co2Saved),
        baseline_emission_g: Math.round(baseline),
        co2_savings_percent: Math.round(savingsPct * 10) / 10,
        green_score: Math.round(greenScore * 10) / 10,
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