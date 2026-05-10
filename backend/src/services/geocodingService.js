const axios = require('axios');

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const PHOTON_BASE = 'https://photon.komoot.io';

const headers = { 'User-Agent': 'AUMO-App/2.0 (urban-mobility-optimizer)' };

class GeocodingService {
  // ── Nominatim: forward geocode ─────────────────────────────────────────────
  async geocode(query, limit = 10) {
    try {
      const res = await axios.get(`${NOMINATIM_BASE}/search`, {
        params: {
          q: query,
          format: 'json',
          addressdetails: 1,
          extratags: 1,
          namedetails: 1,
          limit,
          'accept-language': 'en',
        },
        headers,
        timeout: 8000,
      });
      return res.data.map(this._formatNominatimResult);
    } catch (err) {
      console.error('Geocode error:', err.message);
      return [];
    }
  }

  // ── Nominatim: reverse geocode ─────────────────────────────────────────────
  async reverseGeocode(lat, lng) {
    try {
      const res = await axios.get(`${NOMINATIM_BASE}/reverse`, {
        params: { lat, lon: lng, format: 'json', addressdetails: 1 },
        headers,
        timeout: 8000,
      });
      return this._formatNominatimResult(res.data);
    } catch (err) {
      console.error('Reverse geocode error:', err.message);
      return null;
    }
  }

  // ── Photon: fast autocomplete ──────────────────────────────────────────────
  async autocomplete(query, lat = null, lng = null, limit = 10) {
    try {
      const params = { q: query, limit };
      if (lat && lng) { params.lat = lat; params.lon = lng; }
      const res = await axios.get(`${PHOTON_BASE}/api`, { params, timeout: 5000 });

      return (res.data.features || []).map((f) => ({
        id: `photon_${f.properties.osm_id}`,
        name: f.properties.name || f.properties.street || '',
        display: [
          f.properties.name,
          f.properties.street,
          f.properties.city,
          f.properties.country,
        ].filter(Boolean).join(', '),
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
        type: f.properties.osm_type || 'place',
        category: f.properties.type || 'address',
        source: 'photon',
      }));
    } catch (err) {
      // Fallback to Nominatim
      return this.geocode(query, limit);
    }
  }

  // ── Overpass: POIs near location ───────────────────────────────────────────
  async getPOIs(lat, lng, radius = 1000) {
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"](around:${radius},${lat},${lng});
        node["shop"](around:${radius},${lat},${lng});
        node["highway"="bus_stop"](around:${radius},${lat},${lng});
        node["public_transport"="stop_position"](around:${radius},${lat},${lng});
        way["building"]["name"](around:${radius},${lat},${lng});
        node["tourism"](around:${radius},${lat},${lng});
        node["office"](around:${radius},${lat},${lng});
        node["leisure"](around:${radius},${lat},${lng});
        node["healthcare"](around:${radius},${lat},${lng});
      );
      out body center;
    `;
    try {
      const res = await axios.post(
        OVERPASS_URL,
        `data=${encodeURIComponent(query)}`,
        { headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'User-Agent': 'AUMO-App/2.0 (urban-mobility-optimizer)',
          },
          timeout: 30000,
        }
      );
      return this._parsePOIs(res.data.elements || []);
    } catch (err) {
      console.error('Overpass POI error:', err.message);
      return [];
    }
  }

  // ── Overpass: bus stops ────────────────────────────────────────────────────
  async getBusStops(lat, lng, radius = 1000) {
    const query = `
      [out:json][timeout:20];
      (
        node["highway"="bus_stop"](around:${radius},${lat},${lng});
        node["public_transport"="stop_position"](around:${radius},${lat},${lng});
        node["public_transport"="platform"](around:${radius},${lat},${lng});
        relation["public_transport"="stop_area"](around:${radius},${lat},${lng});
      );
      out body center;
    `;
    try {
      const res = await axios.post(
        OVERPASS_URL,
        `data=${encodeURIComponent(query)}`,
        { headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'User-Agent': 'AUMO-App/2.0 (urban-mobility-optimizer)',
          },
          timeout: 20000,
        }
      );
      return (res.data.elements || [])
        .filter((el) => el.tags?.name)
        .map((el) => ({
          id: el.id,
          name: el.tags.name,
          lat: el.lat || el.center?.lat,
          lng: el.lon || el.center?.lon,
          routes: el.tags?.route_ref || el.tags?.['route_ref:bus'] || '',
          operator: el.tags?.operator || '',
          ref: el.tags?.ref || '',
          category: 'bus_stop',
          icon: '🚌',
        }))
        .filter((s) => s.lat && s.lng);
    } catch (err) {
      console.error('Bus stops error:', err.message);
      return [];
    }
  }

  // ── Overpass: named buildings ──────────────────────────────────────────────
  async getBuildings(lat, lng, radius = 1000) {
    const query = `
      [out:json][timeout:20];
      (
        way["building"]["name"](around:${radius},${lat},${lng});
        node["building"]["name"](around:${radius},${lat},${lng});
        relation["building"]["name"](around:${radius},${lat},${lng});
      );
      out body center;
    `;
    try {
      const res = await axios.post(
        OVERPASS_URL,
        `data=${encodeURIComponent(query)}`,
        { headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'User-Agent': 'AUMO-App/2.0 (urban-mobility-optimizer)',
          },
          timeout: 20000,
        }
      );
      return (res.data.elements || [])
        .filter((el) => el.tags?.name)
        .map((el) => ({
          id: el.id,
          name: el.tags.name,
          lat: el.lat || el.center?.lat,
          lng: el.lon || el.center?.lon,
          type: el.tags?.building || 'building',
          levels: el.tags?.['building:levels'] || '?',
          category: 'building',
          icon: '🏢',
        }))
        .filter((b) => b.lat && b.lng);
    } catch (err) {
      console.error('Buildings error:', err.message);
      return [];
    }
  }

  // ── Overpass: shops ────────────────────────────────────────────────────────
  async getShops(lat, lng, radius = 1000) {
    const query = `
      [out:json][timeout:20];
      (
        node["shop"](around:${radius},${lat},${lng});
        way["shop"]["name"](around:${radius},${lat},${lng});
      );
      out body center;
    `;
    try {
      const res = await axios.post(
        OVERPASS_URL,
        `data=${encodeURIComponent(query)}`,
        { headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'User-Agent': 'AUMO-App/2.0 (urban-mobility-optimizer)',
          },
          timeout: 20000,
        }
      );
      return (res.data.elements || [])
        .filter((el) => el.tags?.name)
        .map((el) => ({
          id: el.id,
          name: el.tags.name,
          lat: el.lat || el.center?.lat,
          lng: el.lon || el.center?.lon,
          shopType: el.tags?.shop || 'general',
          opening_hours: el.tags?.opening_hours || '',
          phone: el.tags?.phone || el.tags?.['contact:phone'] || '',
          website: el.tags?.website || el.tags?.['contact:website'] || '',
          category: `shop_${el.tags?.shop || 'general'}`,
          icon: this._getShopIcon(el.tags?.shop),
        }))
        .filter((s) => s.lat && s.lng);
    } catch (err) {
      console.error('Shops error:', err.message);
      return [];
    }
  }

  // ── Internal helpers ───────────────────────────────────────────────────────
  _parsePOIs(elements) {
    return elements
      .filter((el) => {
        const tags = el.tags || {};
        return tags.name || tags['name:en'];
      })
      .map((el) => {
        const tags = el.tags || {};
        const lat = el.lat || el.center?.lat;
        const lng = el.lon || el.center?.lon;
        if (!lat || !lng) return null;

        const category = this._categorizePOI(tags);
        return {
          id: el.id,
          type: el.type,
          name: tags.name || tags['name:en'] || 'Unnamed',
          category,
          lat,
          lng,
          address: this._extractAddress(tags),
          icon: this._getPOIIcon(category),
          details: {
            amenity: tags.amenity,
            shop: tags.shop,
            building: tags.building,
            phone: tags.phone || tags['contact:phone'],
            website: tags.website || tags['contact:website'],
            opening_hours: tags.opening_hours,
          },
        };
      })
      .filter(Boolean);
  }

  _categorizePOI(tags) {
    if (tags.highway === 'bus_stop' || tags.public_transport) return 'bus_stop';
    if (tags.shop) return `shop`;
    if (['restaurant', 'cafe', 'fast_food', 'bar', 'pub', 'food_court'].includes(tags.amenity))
      return 'food_drink';
    if (['hospital', 'pharmacy', 'clinic', 'doctors', 'dentist'].includes(tags.amenity))
      return 'health';
    if (['school', 'university', 'college', 'kindergarten', 'library'].includes(tags.amenity))
      return 'education';
    if (['bank', 'atm', 'bureau_de_change'].includes(tags.amenity)) return 'finance';
    if (['fuel', 'car_wash', 'car_rental'].includes(tags.amenity)) return 'automotive';
    if (tags.tourism) return 'tourism';
    if (tags.office) return 'office';
    if (tags.leisure) return 'leisure';
    if (tags.building) return 'building';
    if (tags.amenity) return 'amenity';
    return 'other';
  }

  _extractAddress(tags) {
    return [
      tags['addr:housenumber'],
      tags['addr:street'],
      tags['addr:city'],
      tags['addr:postcode'],
    ].filter(Boolean).join(', ') || tags['addr:full'] || '';
  }

  _getPOIIcon(category) {
    const icons = {
      bus_stop: '🚌', food_drink: '🍽️', health: '🏥',
      education: '🎓', finance: '🏦', automotive: '⛽',
      tourism: '🏛️', office: '🏢', leisure: '🌳',
      building: '🏗️', shop: '🛍️', amenity: '📍',
    };
    return icons[category] || '📍';
  }

  _getShopIcon(shopType) {
    const icons = {
      supermarket: '🛒', convenience: '🏪', bakery: '🥖',
      butcher: '🥩', greengrocer: '🥬', pharmacy: '💊',
      clothes: '👕', shoes: '👟', electronics: '📱',
      books: '📚', hardware: '🔧', car_repair: '🔧',
    };
    return icons[shopType] || '🛍️';
  }

  _formatNominatimResult(item) {
    return {
      id: `nominatim_${item.place_id}`,
      name: item.name || item.display_name?.split(',')[0] || '',
      display: item.display_name || '',
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type || item.class || 'place',
      category: item.class || 'address',
      address: item.address || {},
      boundingbox: item.boundingbox,
      source: 'nominatim',
    };
  }
}

module.exports = new GeocodingService();