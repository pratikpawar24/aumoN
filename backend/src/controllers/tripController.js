const Trip = require('../models/Trip');

// Threshold for deviation alert. ~50m off the planned polyline counts as
// "off-route". Tweak per real-world testing.
const DEVIATION_M = 50;
const EARTH_M = 6371000;

const haversineMeters = (a, b) => {
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_M * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
};

// Min distance from a point to any vertex on a polyline. Cheap approximation
// of distance-to-segment; good enough for deviation detection at our scale.
const minDistToPolyline = (point, polyline) => {
  if (!polyline?.length) return Infinity;
  let best = Infinity;
  for (const v of polyline) {
    if (!v || v.length < 2) continue;
    const d = haversineMeters(point, v);
    if (d < best) best = d;
  }
  return best;
};

exports.startTrip = async (req, res, next) => {
  try {
    const { origin, destination, plannedGeometry, rideId } = req.body;
    if (!origin || !destination) {
      return res.status(400).json({ success: false, message: 'origin and destination required' });
    }

    // Cancel any existing active trip for this user — only one at a time.
    await Trip.updateMany(
      { userId: req.user._id, status: 'active' },
      { $set: { status: 'abandoned', endedAt: new Date() } }
    );

    const trip = await Trip.create({
      userId: req.user._id,
      rideId: rideId || null,
      origin,
      destination,
      plannedGeometry: Array.isArray(plannedGeometry) ? plannedGeometry : [],
    });

    res.status(201).json({ success: true, trip });
  } catch (err) {
    next(err);
  }
};

exports.appendWaypoint = async (req, res, next) => {
  try {
    const { lat, lng, speedMps, accuracyM } = req.body;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ success: false, message: 'lat and lng required' });
    }

    const trip = await Trip.findOne({
      _id: req.params.id,
      userId: req.user._id,
      status: 'active',
    });
    if (!trip) return res.status(404).json({ success: false, message: 'Active trip not found' });

    const last = trip.waypoints[trip.waypoints.length - 1];
    if (last) {
      // Add segment distance only when accuracy is reasonable.
      const segM = haversineMeters([last.lat, last.lng], [lat, lng]);
      if (!accuracyM || accuracyM < 100) {
        trip.distanceTraveledKm += segM / 1000;
      }
    }
    trip.waypoints.push({ lat, lng, speedMps, accuracyM, t: new Date() });

    // Deviation check: distance from new waypoint to planned polyline
    const distM = minDistToPolyline([lat, lng], trip.plannedGeometry);
    let deviated = false;
    if (Number.isFinite(distM) && distM > DEVIATION_M) {
      trip.deviationCount += 1;
      deviated = true;
    }

    await trip.save();

    // Real-time emit so peers (carpool, dashboard) can subscribe later.
    const io = req.app.get('io');
    if (io) {
      io.to(`trip_${trip._id}`).emit('trip-waypoint', {
        tripId: trip._id,
        lat, lng, t: new Date(),
        deviated, deviationDistanceM: Math.round(distM),
      });
    }

    res.json({
      success: true,
      tripId: trip._id,
      waypointCount: trip.waypoints.length,
      distanceTraveledKm: Math.round(trip.distanceTraveledKm * 100) / 100,
      deviated,
      deviationDistanceM: Math.round(distM),
      shouldReroute: deviated && trip.deviationCount >= 2,
    });
  } catch (err) {
    next(err);
  }
};

exports.endTrip = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    if (trip.status !== 'active') {
      return res.json({ success: true, trip, alreadyEnded: true });
    }
    trip.status = 'completed';
    trip.endedAt = new Date();
    await trip.save();
    res.json({ success: true, trip });
  } catch (err) {
    next(err);
  }
};

exports.getActiveTrip = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({ userId: req.user._id, status: 'active' })
      .sort({ startedAt: -1 });
    res.json({ success: true, trip });
  } catch (err) {
    next(err);
  }
};
