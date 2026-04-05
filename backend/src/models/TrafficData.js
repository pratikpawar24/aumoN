const mongoose = require('mongoose');

const trafficDataSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    radiusKm: { type: Number, default: 5 },
    hour: { type: Number, required: true },
    dayOfWeek: { type: Number, required: true },
    segments: { type: Array, default: [] },
    summary: { type: Object, default: {} },
    // TTL: auto-delete after 1 hour (traffic data goes stale)
    fetchedAt: {
      type: Date,
      default: Date.now,
      index: { expireAfterSeconds: 3600 },
    },
  },
  { timestamps: true }
);

trafficDataSchema.index({ lat: 1, lng: 1, hour: 1 });

module.exports = mongoose.model('TrafficData', trafficDataSchema);