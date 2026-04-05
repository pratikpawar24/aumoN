const CarpoolRequest = require('../models/CarpoolRequest');
const CarpoolMatch = require('../models/CarpoolMatch');
const carpoolMatchingService = require('../services/carpoolMatchingService');

exports.createRequest = async (req, res, next) => {
  try {
    const {
      pickup, dropoff, departureTime, timeWindowMinutes,
      maxDetourMinutes, seatsNeeded, role, preferences, vehicleType,
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
      role: role || 'passenger',
      preferences: preferences || {},
      vehicleType: vehicleType || 'car',
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
    const { lat, lng, radius = 5 } = req.query;
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
      .sort({ departureTime: 1 })
      .limit(20);

    // Filter by proximity if lat/lng provided
    let filtered = rides;
    if (lat && lng) {
      filtered = rides.filter((r) => {
        const dist = carpoolMatchingService._haversine(
          parseFloat(lat), parseFloat(lng), r.pickup.lat, r.pickup.lng
        );
        return dist <= parseFloat(radius);
      });
    }

    res.json({ success: true, rides: filtered });
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
    const requests = await CarpoolRequest.find({
      userId: req.user._id,
      status: { $in: ['completed', 'matched'] },
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('matchId')
      .lean();
    res.json({ success: true, requests });
  } catch (err) {
    next(err);
  }
};