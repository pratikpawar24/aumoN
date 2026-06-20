const RideBooking = require('../models/RideBooking');
const CarpoolRequest = require('../models/CarpoolRequest');
const pushService = require('../services/pushService');

const POP_RIDE = { path: 'rideId', select: 'pickup dropoff departureTime price seatsAvailable status role' };
const POP_PASSENGER = { path: 'passengerId', select: 'name avatar' };
const POP_DRIVER = { path: 'driverId', select: 'name avatar' };

// Passenger requests N seats on a driver's ride offer.
exports.createBooking = async (req, res, next) => {
  try {
    const { rideId } = req.params;
    const seats = parseInt(req.body.seats, 10);
    if (!Number.isInteger(seats) || seats < 1 || seats > 6) {
      return res.status(400).json({ success: false, message: 'Choose between 1 and 6 seats.' });
    }

    const ride = await CarpoolRequest.findById(rideId);
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found.' });
    if (ride.role !== 'driver') {
      return res.status(400).json({ success: false, message: 'This ride is not offering seats.' });
    }
    if (String(ride.userId) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: "You can't book your own ride." });
    }
    if (['completed', 'cancelled'].includes(ride.status)) {
      return res.status(400).json({ success: false, message: `This ride is ${ride.status}.` });
    }
    if ((ride.seatsAvailable || 0) < seats) {
      return res.status(400).json({ success: false, message: `Only ${ride.seatsAvailable} seat(s) left.` });
    }

    // One active booking per passenger per ride.
    const existing = await RideBooking.findOne({
      rideId, passengerId: req.user._id, status: { $in: ['requested', 'confirmed'] },
    });
    if (existing) {
      return res.status(409).json({ success: false, message: 'You already have a booking on this ride.' });
    }

    const booking = await RideBooking.create({
      rideId,
      driverId: ride.userId,
      passengerId: req.user._id,
      seats,
      agreedPrice: ride.price,
    });

    pushService.sendToUser(ride.userId, {
      title: 'New seat request 🚗',
      body: `${req.user.name || 'A passenger'} requested ${seats} seat(s) on your ride.`,
      data: { type: 'booking', bookingId: String(booking._id), rideId: String(rideId) },
    });

    res.status(201).json({ success: true, booking });
  } catch (err) {
    next(err);
  }
};

// Incoming (rides I drive) + outgoing (rides I requested) bookings.
exports.listMyBookings = async (req, res, next) => {
  try {
    const me = req.user._id;
    const [incoming, outgoing] = await Promise.all([
      RideBooking.find({ driverId: me, status: { $ne: 'cancelled' } })
        .sort({ createdAt: -1 }).limit(100)
        .populate(POP_RIDE).populate(POP_PASSENGER).lean(),
      RideBooking.find({ passengerId: me })
        .sort({ createdAt: -1 }).limit(100)
        .populate(POP_RIDE).populate(POP_DRIVER).lean(),
    ]);
    res.json({ success: true, incoming, outgoing });
  } catch (err) {
    next(err);
  }
};

// Driver confirms — the second side. Deducts seats, marks the passenger matched,
// mirrors a passenger CarpoolRequest so it shows in their history.
exports.confirmBooking = async (req, res, next) => {
  try {
    const booking = await RideBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    if (String(booking.driverId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the ride owner can confirm.' });
    }
    if (booking.status !== 'requested') {
      return res.status(400).json({ success: false, message: `Booking is already ${booking.status}.` });
    }

    const ride = await CarpoolRequest.findById(booking.rideId);
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found.' });
    if (['completed', 'cancelled'].includes(ride.status)) {
      return res.status(400).json({ success: false, message: `This ride is ${ride.status}.` });
    }
    if ((ride.seatsAvailable || 0) < booking.seats) {
      return res.status(400).json({ success: false, message: `Only ${ride.seatsAvailable} seat(s) left.` });
    }

    ride.seatsAvailable -= booking.seats;
    if (!(ride.matchedWith || []).some((id) => String(id) === String(booking.passengerId))) {
      ride.matchedWith = [...(ride.matchedWith || []), booking.passengerId];
    }
    if (ride.seatsAvailable <= 0) ride.status = 'matched';
    await ride.save();

    // Mirror into the passenger's history (best-effort).
    let passengerRequestId = null;
    try {
      const mirror = await CarpoolRequest.create({
        userId: booking.passengerId,
        pickup: ride.pickup,
        dropoff: ride.dropoff,
        departureTime: ride.departureTime,
        departureTimeStr: ride.departureTimeStr,
        role: 'passenger',
        status: 'matched',
        seatsNeeded: booking.seats,
        vehicleType: ride.vehicleType,
        price: booking.agreedPrice != null ? booking.agreedPrice : ride.price,
        matchedWith: [ride.userId],
        notes: 'Booked via seat request',
      });
      passengerRequestId = mirror._id;
    } catch (e) {
      console.warn('Mirror passenger request failed:', e.message);
    }

    booking.status = 'confirmed';
    booking.passengerRequestId = passengerRequestId;
    await booking.save();

    pushService.sendToUser(booking.passengerId, {
      title: 'Booking confirmed ✅',
      body: `Your ${booking.seats}-seat booking was confirmed by the driver.`,
      data: { type: 'booking', bookingId: String(booking._id), rideId: String(ride._id) },
    });

    res.json({ success: true, booking });
  } catch (err) {
    next(err);
  }
};

// Driver declines a still-pending request (no seat change — seats weren't taken).
exports.declineBooking = async (req, res, next) => {
  try {
    const booking = await RideBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    if (String(booking.driverId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the ride owner can decline.' });
    }
    if (booking.status !== 'requested') {
      return res.status(400).json({ success: false, message: `Booking is already ${booking.status}.` });
    }
    booking.status = 'declined';
    await booking.save();

    pushService.sendToUser(booking.passengerId, {
      title: 'Booking declined',
      body: 'The driver could not take your seat request this time.',
      data: { type: 'booking', bookingId: String(booking._id) },
    });

    res.json({ success: true, booking });
  } catch (err) {
    next(err);
  }
};

// Either side cancels. If it was confirmed, restore the seats and un-match.
exports.cancelBooking = async (req, res, next) => {
  try {
    const booking = await RideBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    const me = String(req.user._id);
    if (me !== String(booking.passengerId) && me !== String(booking.driverId)) {
      return res.status(403).json({ success: false, message: 'Not your booking.' });
    }
    if (['declined', 'cancelled'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: `Booking is already ${booking.status}.` });
    }

    if (booking.status === 'confirmed') {
      const ride = await CarpoolRequest.findById(booking.rideId);
      if (ride) {
        ride.seatsAvailable = Math.min(6, (ride.seatsAvailable || 0) + booking.seats);
        ride.matchedWith = (ride.matchedWith || []).filter((id) => String(id) !== String(booking.passengerId));
        if (ride.status === 'matched' && ride.seatsAvailable > 0) ride.status = 'pending';
        await ride.save();
      }
      if (booking.passengerRequestId) {
        await CarpoolRequest.updateOne({ _id: booking.passengerRequestId }, { status: 'cancelled' });
      }
    }

    booking.status = 'cancelled';
    await booking.save();

    const other = me === String(booking.passengerId) ? booking.driverId : booking.passengerId;
    pushService.sendToUser(other, {
      title: 'Booking cancelled',
      body: 'A seat booking on your ride was cancelled.',
      data: { type: 'booking', bookingId: String(booking._id) },
    });

    res.json({ success: true, booking });
  } catch (err) {
    next(err);
  }
};
