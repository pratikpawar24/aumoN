const mongoose = require('mongoose');

// A passenger's request to take N seats on a specific driver's ride offer
// (a CarpoolRequest with role 'driver'). Two-sided: the passenger creates it
// ('requested'); the driver confirms it ('confirmed'), at which point seats are
// deducted from the ride. Either side can back out before/after confirm.
const rideBookingSchema = new mongoose.Schema(
  {
    rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'CarpoolRequest', required: true, index: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    passengerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    seats: { type: Number, required: true, min: 1, max: 6 },
    status: {
      type: String,
      enum: ['requested', 'confirmed', 'declined', 'cancelled'],
      default: 'requested',
      index: true,
    },
    agreedPrice: { type: Number, default: null },
    // The mirrored passenger CarpoolRequest created on confirm (so it appears in
    // the passenger's history); used to flip its status if the booking cancels.
    passengerRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'CarpoolRequest', default: null },
  },
  { timestamps: true }
);

rideBookingSchema.index({ rideId: 1, passengerId: 1 });
rideBookingSchema.index({ passengerId: 1, status: 1 });

module.exports = mongoose.model('RideBooking', rideBookingSchema);
