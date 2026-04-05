const axios = require('axios');
const { config } = require('../config/env');
const TrafficData = require('../models/TrafficData');

class TrafficService {
  async getTrafficPrediction(lat, lng, radiusKm = 5) {
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();

    // Check cache first
    const cached = await TrafficData.findOne({
      lat: { $gte: lat - 0.01, $lte: lat + 0.01 },
      lng: { $gte: lng - 0.01, $lte: lng + 0.01 },
      hour,
    });
    if (cached) return cached;

    try {
      const res = await axios.post(
        `${config.aiServiceUrl}/api/traffic/predict`,
        { lat, lng, radius_km: radiusKm, hour },
        { timeout: 15000 }
      );
      const data = res.data;

      // Cache the result
      const cached = new TrafficData({
        lat, lng, radiusKm, hour, dayOfWeek,
        segments: data.segments || [],
        summary: data.summary || {},
      });
      await cached.save().catch(() => {});

      return data;
    } catch (err) {
      console.warn('Traffic prediction failed:', err.message);
      return this._generateFallbackTraffic(lat, lng, hour);
    }
  }

  _generateFallbackTraffic(lat, lng, hour) {
    const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
    const congestionLevel = isRushHour ? 'heavy' : 'moderate';
    const avgSpeed = isRushHour ? 20 : 40;
    return {
      location: { lat, lng },
      predicted_at: new Date().toISOString(),
      hour,
      segments: [],
      summary: {
        dominant_congestion: congestionLevel,
        average_speed_kmh: avgSpeed,
        segment_count: 0,
      },
      source: 'fallback',
    };
  }
}

module.exports = new TrafficService();