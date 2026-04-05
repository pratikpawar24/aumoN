const mongoose = require('mongoose');

const emissionLogSchema = new mongoose.Schema(
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
    },
    co2Emitted: { type: Number, required: true, min: 0 },
    co2Saved: { type: Number, default: 0, min: 0 },
    baselineEmission: { type: Number, default: 0 },
    greenScore: { type: Number, default: 50 },
    vehicleType: { type: String, default: 'car' },
    distance: { type: Number, default: 0 },
    optimizeFor: { type: String, default: 'carbon' },
    isCarpooled: { type: Boolean, default: false },
    carpoolPassengers: { type: Number, default: 1 },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    week: { type: Number, default: () => Math.ceil(new Date().getDate() / 7) },
    month: { type: Number, default: () => new Date().getMonth() + 1 },
    year: { type: Number, default: () => new Date().getFullYear() },
  },
  { timestamps: true }
);

emissionLogSchema.index({ userId: 1, date: -1 });
emissionLogSchema.index({ userId: 1, year: 1, month: 1 });
emissionLogSchema.index({ date: -1 });

module.exports = mongoose.model('EmissionLog', emissionLogSchema);