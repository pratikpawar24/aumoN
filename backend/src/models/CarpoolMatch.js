const mongoose = require('mongoose');

const carpoolMatchSchema = new mongoose.Schema(
  {
    groupId: { type: String, required: true, unique: true },
    passengers: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'CarpoolRequest' },
        pickup: {
          lat: Number,
          lng: Number,
          address: { type: String, default: '' },
        },
        dropoff: {
          lat: Number,
          lng: Number,
          address: { type: String, default: '' },
        },
        pickupOrder: { type: Number, default: 0 },
      },
    ],
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    vehicleType: { type: String, default: 'car' },
    passengerCount: { type: Number, required: true },

    // Route
    sharedRoute: {
      waypoints: { type: Array, default: [] },
      totalDistanceKm: { type: Number, default: 0 },
      estimatedTimeMin: { type: Number, default: 0 },
      routeGeometry: { type: Array, default: [] },
    },

    // Emissions
    totalEmissionG: { type: Number, default: 0 },
    co2SavedG: { type: Number, default: 0 },
    savingsPercent: { type: Number, default: 0 },
    perPassengerEmissionG: { type: Number, default: 0 },
    greenScore: { type: Number, default: 50 },

    status: {
      type: String,
      enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled'],
      default: 'pending',
    },
    scheduledDeparture: { type: Date, default: null },
    actualDeparture: { type: Date, default: null },
    actualArrival: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

carpoolMatchSchema.index({ status: 1 });
carpoolMatchSchema.index({ driverId: 1 });

module.exports = mongoose.model('CarpoolMatch', carpoolMatchSchema);