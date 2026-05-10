const CarpoolRequest = require('../models/CarpoolRequest');
const CarpoolMatch = require('../models/CarpoolMatch');
const carpoolMatchingService = require('../services/carpoolMatchingService');

exports.createRequest = async (req, res, next) => {
  try {
    const {
      pickup, dropoff, departureTime, timeWindowMinutes,
      maxDetourMinutes, seatsNeeded, seatsAvailable, role,
      preferences, vehicleType, price, notes,
    } = req.body;

    const depDate = new Date(departureTime);
    const timeStr = `${String(depDate.getHours()).padStart(2, '0')}:${String(depDate.getMinutes()).padStart(2, '0')}`;

    const request = await CarpoolRequest.create({
      userId: req.user._id,
      pickup,
      dropoff,
      departureTime: depDate,
      departureTimeStr: timeStr,
      timeWindowMinutes: timeWindowMinutes || 30,
      maxDetourMinutes: maxDetourMinutes || 10,
      seatsNeeded: seatsNeeded || 1,
      seatsAvailable: role === 'driver' ? (seatsAvailable ?? 1) : 0,
      role: role || 'passenger',
      preferences: preferences || {},
      vehicleType: vehicleType || 'car',
      price: price != null && price !== '' ? Number(price) : null,
      notes: notes || '',
      status: 'pending',
    });

    // Immediately try to find matches
    const candidates = await carpoolMatchingService.findMatches(request);
    let matchResult = null;

    if (candidates.length > 0) {
      const allRequests = [request, ...candidates];
      const aiResult = await carpoolMatchingService.matchViaAI(allRequests);

      if (aiResult.groups && aiResult.groups.length > 0) {
        const group = aiResult.groups[0];
        const reqIds = group.passengers.map((p) => p.id).filter(Boolean);
        const requestDocs = await CarpoolRequest.find({ _id: { $in: reqIds } });

        if (requestDocs.length >= 2) {
          const match = await carpoolMatchingService.createMatchDocument(group, requestDocs);
          await carpoolMatchingService.updateRequestStatuses(
            requestDocs.map((r) => r._id),
            match._id,
            requestDocs.map((r) => r.userId)
          );
          matchResult = match;
        }
      }
    }

    res.status(201).json({
      success: true,
      request,
      match: matchResult,
      message: matchResult
        ? `🎉 Matched with ${matchResult.passengerCount - 1} other passenger(s)!`
        : 'Request submitted. We\'ll notify you when a match is found.',
    });
  } catch (err) {
    next(err);
  }
};

exports.getMyRequests = async (req, res, next) => {
  try {
    const requests = await CarpoolRequest.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('matchId')
      .lean();
    res.json({ success: true, requests });
  } catch (err) {
    next(err);
  }
};

exports.getAvailableRides = async (req, res, next) => {
  try {
    const {
      // Legacy: single point + radius (still supported)
      lat, lng, radius = 5,
      // New: separate from/to filters with their own radii
      fromLat, fromLng, toLat, toLng, fromRadius, toRadius,
      // relevance | time | price | proximity
      sort = 'time',
      limit = 30,
    } = req.query;

    const now = new Date();
    const query = {
      status: 'pending',
      role: 'driver',
      userId: { $ne: req.user._id },
      departureTime: { $gte: now },
      seatsAvailable: { $gte: 1 },
    };

    const rides = await CarpoolRequest.find(query)
      .populate('userId', 'name avatar vehicleType greenScore')
      .limit(parseInt(limit, 10) || 30)
      .lean();

    const haversine = carpoolMatchingService._haversine;
    const fr = parseFloat(fromRadius || radius || 5);
    const tr = parseFloat(toRadius || radius || 5);

    // Compute per-ride scores: distance from user's from→pickup and to→dropoff.
    const enriched = rides.map((r) => {
      let pickupDistKm = null;
      let dropoffDistKm = null;
      if (fromLat && fromLng) {
        pickupDistKm = haversine(parseFloat(fromLat), parseFloat(fromLng), r.pickup.lat, r.pickup.lng);
      } else if (lat && lng) {
        pickupDistKm = haversine(parseFloat(lat), parseFloat(lng), r.pickup.lat, r.pickup.lng);
      }
      if (toLat && toLng) {
        dropoffDistKm = haversine(parseFloat(toLat), parseFloat(toLng), r.dropoff.lat, r.dropoff.lng);
      }
      return { ...r, _pickupDistKm: pickupDistKm, _dropoffDistKm: dropoffDistKm };
    });

    // Apply proximity filter: any provided endpoint must be within its radius.
    let filtered = enriched.filter((r) => {
      if (r._pickupDistKm != null && r._pickupDistKm > fr) return false;
      if (r._dropoffDistKm != null && r._dropoffDistKm > tr) return false;
      return true;
    });

    // Sort
    const sorters = {
      time: (a, b) => new Date(a.departureTime) - new Date(b.departureTime),
      price: (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity),
      proximity: (a, b) => (a._pickupDistKm ?? Infinity) - (b._pickupDistKm ?? Infinity),
      // Relevance: pickup-near + dropoff-near + soonest (lower = better)
      relevance: (a, b) => {
        const sa = (a._pickupDistKm ?? 0) + (a._dropoffDistKm ?? 0);
        const sb = (b._pickupDistKm ?? 0) + (b._dropoffDistKm ?? 0);
        if (sa !== sb) return sa - sb;
        return new Date(a.departureTime) - new Date(b.departureTime);
      },
    };
    filtered.sort(sorters[sort] || sorters.time);

    // Round distances for display, drop internal underscored keys.
    const out = filtered.map((r) => ({
      ...r,
      pickupDistanceKm: r._pickupDistKm != null ? Math.round(r._pickupDistKm * 10) / 10 : null,
      dropoffDistanceKm: r._dropoffDistKm != null ? Math.round(r._dropoffDistKm * 10) / 10 : null,
      _pickupDistKm: undefined,
      _dropoffDistKm: undefined,
    }));

    res.json({ success: true, rides: out, sort });
  } catch (err) {
    next(err);
  }
};

exports.getMatchDetails = async (req, res, next) => {
  try {
    const match = await CarpoolMatch.findById(req.params.id)
      .populate('passengers.userId', 'name avatar vehicleType greenScore')
      .populate('driverId', 'name avatar vehicleType');

    if (!match) return res.status(404).json({ success: false, message: 'Match not found.' });

    // Verify user is part of this match
    const isParticipant = match.passengers.some(
      (p) => p.userId?._id?.toString() === req.user._id.toString()
    );
    if (!isParticipant && match.driverId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    res.json({ success: true, match });
  } catch (err) {
    next(err);
  }
};

exports.cancelRequest = async (req, res, next) => {
  try {
    const request = await CarpoolRequest.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });
    if (['completed', 'cancelled'].includes(request.status)) {
      return res.status(400).json({ success: false, message: `Cannot cancel a ${request.status} request.` });
    }
    request.status = 'cancelled';
    await request.save();
    res.json({ success: true, message: 'Request cancelled.' });
  } catch (err) {
    next(err);
  }
};

exports.getCarpoolHistory = async (req, res, next) => {
  try {
    const { from, to, status, role, limit = 50 } = req.query;
    const filter = { userId: req.user._id };

    if (status) {
      filter.status = { $in: status.split(',').map((s) => s.trim()) };
    } else {
      filter.status = { $in: ['completed', 'matched', 'cancelled'] };
    }

    if (role && ['driver', 'passenger'].includes(role)) {
      filter.role = role;
    }

    if (from || to) {
      filter.departureTime = {};
      if (from) filter.departureTime.$gte = new Date(from);
      if (to) filter.departureTime.$lte = new Date(to);
    }

    const requests = await CarpoolRequest.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(parseInt(limit, 10) || 50, 100))
      .populate('matchId')
      .lean();
    res.json({ success: true, requests });
  } catch (err) {
    next(err);
  }
};