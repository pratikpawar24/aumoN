const mongoose = require('mongoose');

/**
 * Chat scoped to a carpool ride (CarpoolRequest). Auto-deletes 24 hours
 * after the scheduled departure via the `expiresAt` TTL index.
 */
const chatMessageSchema = new mongoose.Schema(
  {
    rideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CarpoolRequest',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    // TTL: MongoDB removes the doc when wall-clock passes this Date.
    // Set on creation to (ride.departureTime + 24h).
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
  },
  { timestamps: true }
);

chatMessageSchema.index({ rideId: 1, createdAt: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
