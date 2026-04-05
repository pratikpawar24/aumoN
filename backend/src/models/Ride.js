const mongoose = require('mongoose');

const coordinateSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String, default: '' },
  },
  { _id: false }
);

const rideSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    origin: { type: coordinateSchema, required: true },
    destination: { type: coordinateSchema, required: true },

    // Route data
    routeGeometry: {
      type: [[Number]],
      default: [],
    },
    distanceKm: { type: Number, required: true, min: 0 },
    timeMinutes: { type: Number, required: true, min: 0 },

    // Emission data
    co2Emissions: { type: Number, default: 0, min: 0 },
    co2Saved: { type: Number, default: 0, min: 0 },
    baselineEmission: { type: Number, default: 0 },

    // Vehicle & optimization
    vehicleType: {
      type: String,
      enum: ['car', 'electric', 'bus', 'bike', 'walk', 'motorcycle'],
      default: 'car',
    },
    optimizeFor: {
      type: String,
      enum: ['carbon', 'time', 'distance', 'balanced'],
      default: 'carbon',
    },

    // Green score
    greenScore: { type: Number, default: 50, min: 0, max: 100 },

    // Carpool
    isCarpooled: { type: Boolean, default: false },
    carpoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CarpoolMatch',
      default: null,
    },
    passengerCount: { type: Number, default: 1 },

    // Route details
    instructions: { type: Array, default: [] },
    trafficConditions: { type: Array, default: [] },
    alternativeRoutes: { type: Array, default: [] },

    // Status
    status: {
      type: String,
      enum: ['planned', 'active', 'completed', 'cancelled'],
      default: 'completed',
    },
    departureTime: { type: Date, default: Date.now },
    arrivalTime: { type: Date, default: null },

    // Algorithm used
    algorithm: { type: String, default: 'astar_carbon_aware' },
    profile: { type: String, default: 'carbon' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Indexes
rideSchema.index({ userId: 1, createdAt: -1 });
rideSchema.index({ createdAt: -1 });
rideSchema.index({ status: 1 });
rideSchema.index({ isCarpooled: 1 });

// Virtual: emission savings percent
rideSchema.virtual('savingsPercent').get(function () {
  if (!this.baselineEmission || this.baselineEmission === 0) return 0;
  return Math.round((this.co2Saved / this.baselineEmission) * 100);
});

module.exports = mongoose.model('Ride', rideSchema);