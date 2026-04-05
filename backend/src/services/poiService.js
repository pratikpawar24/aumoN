const geocodingService = require('./geocodingService');

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
    const [pois, busStops, buildings, shops] = await Promise.allSettled([
      geocodingService.getPOIs(lat, lng, radius),
      geocodingService.getBusStops(lat, lng, radius),
      geocodingService.getBuildings(lat, lng, Math.min(radius, 500)),
      geocodingService.getShops(lat, lng, radius),
    ]);

    return {
      pois: pois.status === 'fulfilled' ? pois.value : [],
      busStops: busStops.status === 'fulfilled' ? busStops.value : [],
      buildings: buildings.status === 'fulfilled' ? buildings.value : [],
      shops: shops.status === 'fulfilled' ? shops.value : [],
    };
  }
}

module.exports = new POIService();