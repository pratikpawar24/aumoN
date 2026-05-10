import api from './api';
import axios from 'axios';

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const PHOTON    = 'https://photon.komoot.io';

const mapService = {
  // ── Backend-proxied calls ────────────────────────────────────────────────
  searchLocations: async (query, lat = null, lng = null) => {
    const res = await api.get('/api/map/search', {
      params: { q: query, lat, lng },
    });
    return res.data;
  },

  getPOIs: async (lat, lng, radius = 1000) => {
    const res = await api.get('/api/map/pois', { params: { lat, lng, radius } });
    return res.data;
  },

  getWeather: async (lat, lng) => {
    const res = await api.get('/api/map/weather', { params: { lat, lng } });
    return res.data;
  },

  getBusStops: async (lat, lng, radius = 1000) => {
    const res = await api.get('/api/map/bus-stops', { params: { lat, lng, radius } });
    return res.data;
  },

  getBuildings: async (lat, lng, radius = 500) => {
    const res = await api.get('/api/map/buildings', { params: { lat, lng, radius } });
    return res.data;
  },

  getShops: async (lat, lng, radius = 1000) => {
    const res = await api.get('/api/map/shops', { params: { lat, lng, radius } });
    return res.data;
  },

  reverseGeocode: async (lat, lng) => {
    const res = await api.get('/api/map/reverse-geocode', { params: { lat, lng } });
    return res.data;
  },

  autocomplete: async (query, lat = null, lng = null) => {
    const res = await api.get('/api/map/autocomplete', {
      params: { q: query, lat, lng },
    });
    return res.data;
  },

  // ── Direct Nominatim (no backend needed) ─────────────────────────────────
  nominatimSearch: async (query, limit = 8) => {
    const res = await axios.get(`${NOMINATIM}/search`, {
      params: { q: query, format: 'json', addressdetails: 1, limit, 'accept-language': 'en' },
      headers: { 'User-Agent': 'AUMO-App/2.0' },
      timeout: 8000,
    });
    return res.data;
  },

  nominatimReverse: async (lat, lng) => {
    const res = await axios.get(`${NOMINATIM}/reverse`, {
      params: { lat, lon: lng, format: 'json', addressdetails: 1 },
      headers: { 'User-Agent': 'AUMO-App/2.0' },
      timeout: 8000,
    });
    return res.data;
  },

  // ── Photon autocomplete ───────────────────────────────────────────────────
  // Returns a richer result list so apartments, roads, building names,
  // landmarks, and addresses all surface usefully. Properties Photon
  // exposes per result: name, street, housenumber, postcode, city, state,
  // country, district, county, type ("street", "house", "place", "POI"...).
  photonSearch: async (query, lat = null, lng = null, limit = 12) => {
    const params = { q: query, limit };
    if (lat && lng) { params.lat = lat; params.lon = lng; }
    const res = await axios.get(`${PHOTON}/api`, { params, timeout: 5000 });
    return (res.data.features || []).map((f) => {
      const p = f.properties || {};
      // Build a primary name: prefer the OSM name; fall back to street +
      // housenumber, then street alone, then the OSM key.
      const primary =
        p.name ||
        [p.housenumber, p.street].filter(Boolean).join(' ') ||
        p.street ||
        p.osm_value ||
        '';
      // Build a "context" line (everything after the primary): district,
      // city, state, country — joined for clarity.
      const context = [
        p.suburb,
        p.district,
        p.city,
        p.state,
        p.country,
      ]
        .filter(Boolean)
        .filter((s, i, arr) => arr.indexOf(s) === i)  // dedupe
        .join(', ');

      return {
        id:       f.properties.osm_id,
        name:     primary,
        display:  context ? `${primary} — ${context}` : primary,
        lat:      f.geometry.coordinates[1],
        lng:      f.geometry.coordinates[0],
        category: p.osm_value || p.type || 'place',
        // Pass through useful raw fields so the SearchBox can render
        // distinct icons for streets vs apartments vs amenities.
        raw: {
          street: p.street,
          housenumber: p.housenumber,
          city: p.city,
          osm_key: p.osm_key,
          osm_value: p.osm_value,
        },
      };
    });
  },

  // ── User location ─────────────────────────────────────────────────────────
  getUserLocation: () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }),
};

export default mapService;