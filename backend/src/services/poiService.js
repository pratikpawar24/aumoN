const geocodingService = require('./geocodingService');

// ── Overpass throttling ──────────────────────────────────────────────────────
// Overpass is aggressively rate-limited (429) and slow on heavy queries (504).
// Two measures keep us well under its limits:
//   1. A short-lived in-memory cache keyed by a coarse lat/lng grid + radius,
//      so panning around the same block reuses one result instead of refetching.
//   2. In-flight de-duplication, so concurrent identical requests share a single
//      upstream call.
// Combined with doing ONE Overpass query (getPOIs already returns shops, bus
// stops and buildings) instead of four, this cuts Overpass traffic by ~10x+.
const CACHE_TTL_MS = 5 * 60 * 1000;   // 5 minutes for a good result
const EMPTY_TTL_MS = 30 * 1000;       // 30s for an empty/failed result (retry soon)
const MAX_CACHE_ENTRIES = 500;

const cache = new Map();      // key -> { data, expires }
const inflight = new Map();   // key -> Promise

const getCached = (key) => {
  const e = cache.get(key);
  if (e && e.expires > Date.now()) return e.data;
  if (e) cache.delete(key);
  return null;
};

const setCached = (key, data, ttl = CACHE_TTL_MS) => {
  cache.set(key, { data, expires: Date.now() + ttl });
  if (cache.size > MAX_CACHE_ENTRIES) {
    // Drop the oldest entry (Map preserves insertion order).
    cache.delete(cache.keys().next().value);
  }
};

const isShop = (c) => c === 'shop' || (typeof c === 'string' && c.startsWith('shop'));

class POIService {
  async searchAll(query, lat, lng) {
    const [geocodeResults, photonResults] = await Promise.allSettled([
      geocodingService.geocode(query, 5),
      geocodingService.autocomplete(query, lat, lng, 5),
    ]);

    const results = [];
    const seen = new Set();

    const addResult = (item) => {
      const key = `${Math.round(item.lat * 1000)}_${Math.round(item.lng * 1000)}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push(item);
      }
    };

    if (geocodeResults.status === 'fulfilled') {
      geocodeResults.value.forEach(addResult);
    }
    if (photonResults.status === 'fulfilled') {
      photonResults.value.forEach(addResult);
    }

    return results.slice(0, 15);
  }

  async getNearbyAll(lat, lng, radius = 1000) {
    // ~110 m grid + 500 m radius buckets → nearby pans share a cache entry.
    const rLat = Math.round(lat * 1000) / 1000;
    const rLng = Math.round(lng * 1000) / 1000;
    const rRad = (Math.round(radius / 500) * 500) || 500;
    const key = `nearby:${rLat}:${rLng}:${rRad}`;

    const cached = getCached(key);
    if (cached) return cached;
    if (inflight.has(key)) return inflight.get(key);

    const promise = (async () => {
      // ONE Overpass query — getPOIs already covers amenities, shops, bus
      // stops and named buildings — then split by category instead of firing
      // three more Overpass requests.
      let pois = [];
      try {
        pois = await geocodingService.getPOIs(lat, lng, radius);
      } catch (e) {
        console.warn('POI fetch failed:', e.message);
      }

      const result = {
        pois,
        busStops: pois.filter((p) => p.category === 'bus_stop'),
        buildings: pois.filter((p) => p.category === 'building'),
        shops: pois.filter((p) => isShop(p.category)),
      };
      // Cache a good result for 5 min; an empty one only briefly so a transient
      // Overpass 429/504 doesn't blank out POIs for the full window.
      setCached(key, result, pois.length ? CACHE_TTL_MS : EMPTY_TTL_MS);
      return result;
    })();

    inflight.set(key, promise);
    try {
      return await promise;
    } finally {
      inflight.delete(key);
    }
  }
}

module.exports = new POIService();
