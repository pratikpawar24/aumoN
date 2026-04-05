const geocodingService = require('../services/geocodingService');
const poiService = require('../services/poiService');

exports.searchLocations = async (req, res, next) => {
  try {
    const { q, lat, lng, limit = 10 } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Query must be at least 2 characters.' });
    }

    const results = await poiService.searchAll(
      q.trim(),
      lat ? parseFloat(lat) : null,
      lng ? parseFloat(lng) : null
    );

    // Group results by category
    const grouped = {
      addresses: results.filter((r) => r.category === 'address' || r.source === 'nominatim'),
      shops: results.filter((r) => r.category?.startsWith('shop')),
      busStops: results.filter((r) => r.category === 'bus_stop'),
      buildings: results.filter((r) => r.category === 'building'),
      other: results.filter((r) => !['address', 'bus_stop', 'building'].includes(r.category) && !r.category?.startsWith('shop')),
    };

    res.json({ success: true, results, grouped, total: results.length });
  } catch (err) {
    next(err);
  }
};

exports.geocode = async (req, res, next) => {
  try {
    const { q, limit } = req.query;
    if (!q) return res.status(400).json({ success: false, message: 'Query required.' });
    const results = await geocodingService.geocode(q, parseInt(limit) || 10);
    res.json({ success: true, results });
  } catch (err) {
    next(err);
  }
};

exports.reverseGeocode = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat and lng required.' });
    const result = await geocodingService.reverseGeocode(parseFloat(lat), parseFloat(lng));
    if (!result) return res.status(404).json({ success: false, message: 'No address found.' });
    res.json({ success: true, result });
  } catch (err) {
    next(err);
  }
};

exports.getPOIs = async (req, res, next) => {
  try {
    const { lat, lng, radius = 1000 } = req.query;
    if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat and lng required.' });

    const data = await poiService.getNearbyAll(
      parseFloat(lat), parseFloat(lng), parseInt(radius)
    );
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

exports.getBusStops = async (req, res, next) => {
  try {
    const { lat, lng, radius = 1000 } = req.query;
    const stops = await geocodingService.getBusStops(parseFloat(lat), parseFloat(lng), parseInt(radius));
    res.json({ success: true, stops });
  } catch (err) {
    next(err);
  }
};

exports.getBuildings = async (req, res, next) => {
  try {
    const { lat, lng, radius = 500 } = req.query;
    const buildings = await geocodingService.getBuildings(parseFloat(lat), parseFloat(lng), parseInt(radius));
    res.json({ success: true, buildings });
  } catch (err) {
    next(err);
  }
};

exports.getShops = async (req, res, next) => {
  try {
    const { lat, lng, radius = 1000 } = req.query;
    const shops = await geocodingService.getShops(parseFloat(lat), parseFloat(lng), parseInt(radius));
    res.json({ success: true, shops });
  } catch (err) {
    next(err);
  }
};

exports.getStreets = async (req, res, next) => {
  try {
    const { lat, lng, radius = 500 } = req.query;
    // Use Nominatim to search for street names
    const results = await geocodingService.geocode(`street near ${lat},${lng}`, 10);
    res.json({ success: true, streets: results });
  } catch (err) {
    next(err);
  }
};

exports.autocomplete = async (req, res, next) => {
  try {
    const { q, lat, lng } = req.query;
    if (!q || q.length < 2) return res.json({ success: true, results: [] });
    const results = await geocodingService.autocomplete(
      q, lat ? parseFloat(lat) : null, lng ? parseFloat(lng) : null
    );
    res.json({ success: true, results });
  } catch (err) {
    next(err);
  }
};