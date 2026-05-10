const mongoose = require('mongoose');

const waypointSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    speedMps: { type: Number, default: null },
    accuracyM: { type: Number, default: null },
    t: { type: Date, default: Date.now },
  },
  { _id: false }
);

const tripSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    rideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ride',
      default: null,
      index: true,
    },

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

    plannedGeometry: { type: [[Number]], default: [] },  // [[lat,lng], ...]
    waypoints: { type: [waypointSchema], default: [] },

    distanceTraveledKm: { type: Number, default: 0 },
    deviationCount: { type: Number, default: 0 },
    rerouteCount: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ['active', 'completed', 'abandoned'],
      default: 'active',
      index: true,
    },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

tripSchema.index({ userId: 1, status: 1 });
tripSchema.index({ userId: 1, startedAt: -1 });

module.exports = mongoose.model('Trip', tripSchema);
