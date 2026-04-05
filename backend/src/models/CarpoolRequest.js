const mongoose = require('mongoose');

const carpoolRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    pickup: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, default: '' },
    },
    dropoff: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, default: '' },
    },
    departureTime: {
      type: Date,
      required: true,
    },
    departureTimeStr: {
      type: String,
      default: '08:00',
    },
    timeWindowMinutes: {
      type: Number,
      default: 30,
      min: 5,
      max: 120,
    },
    maxDetourMinutes: {
      type: Number,
      default: 10,
      min: 0,
      max: 60,
    },
    seatsAvailable: {
      type: Number,
      default: 0,
      min: 0,
      max: 6,
    },
    seatsNeeded: {
      type: Number,
      default: 1,
      min: 1,
      max: 4,
    },
    role: {
      type: String,
      enum: ['driver', 'passenger'],
      default: 'passenger',
    },
    status: {
      type: String,
      enum: ['pending', 'matching', 'matched', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    preferences: {
      genderPreference: {
        type: String,
        enum: ['any', 'male', 'female'],
        default: 'any',
      },
      maxWalkDistanceM: { type: Number, default: 500 },
      allowPets: { type: Boolean, default: false },
      allowSmoking: { type: Boolean, default: false },
    },
    matchedWith: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CarpoolMatch',
      default: null,
    },
    estimatedPickupTime: { type: Date, default: null },
    estimatedArrivalTime: { type: Date, default: null },
    vehicleType: {
      type: String,
      enum: ['car', 'electric', 'motorcycle'],
      default: 'car',
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      index: { expireAfterSeconds: 0 },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Indexes for geospatial and status queries
carpoolRequestSchema.index({ status: 1, departureTime: 1 });
carpoolRequestSchema.index({ userId: 1, status: 1 });
carpoolRequestSchema.index({ 'pickup.lat': 1, 'pickup.lng': 1 });

module.exports = mongoose.model('CarpoolRequest', carpoolRequestSchema);