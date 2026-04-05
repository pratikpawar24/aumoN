const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: { type: String, default: 'My Route' },
    origin: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, default: '' },
    },
    destination: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, default: '' },
    },
    routeGeometry: { type: [[Number]], default: [] },
    distanceKm: { type: Number, default: 0 },
    timeMinutes: { type: Number, default: 0 },
    co2Emissions: { type: Number, default: 0 },
    co2Saved: { type: Number, default: 0 },
    greenScore: { type: Number, default: 50 },
    vehicleType: { type: String, default: 'car' },
    optimizeFor: { type: String, default: 'carbon' },
    profile: { type: String, default: 'carbon' },
    isFavorite: { type: Boolean, default: false },
    isFrequent: { type: Boolean, default: false },
    useCount: { type: Number, default: 1 },
    lastUsed: { type: Date, default: Date.now },
    instructions: { type: Array, default: [] },
    alternativeRoutes: { type: Array, default: [] },
    // TTL cache: auto-delete stale cached routes after 7 days
    cachedAt: {
      type: Date,
      default: Date.now,
      index: { expireAfterSeconds: 604800 },
    },
  },
  { timestamps: true }
);

routeSchema.index({ userId: 1, isFavorite: 1 });
routeSchema.index({ userId: 1, lastUsed: -1 });

module.exports = mongoose.model('Route', routeSchema);