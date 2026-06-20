const ChatMessage = require('../models/ChatMessage');
const CarpoolRequest = require('../models/CarpoolRequest');
const User = require('../models/User');
const pushService = require('../services/pushService');

const TTL_AFTER_RIDE_MS = 24 * 60 * 60 * 1000;  // keep history 24h past departure

// Compute the TTL for a message: 24h after the ride's departure (≈ after the
// ride completes). Negotiation messages sent before departure get the same
// expiry so the whole thread disappears together.
const expiryForRide = (ride) =>
  new Date(new Date(ride.departureTime).getTime() + TTL_AFTER_RIDE_MS);

/**
 * Resolve which chat thread a request targets and whether the caller may use
 * it. A thread is (rideId, peerId):
 *   - peerId set  → 1:1 negotiation between the driver (ride owner) and that
 *                   passenger. Only the owner or that passenger may access it.
 *   - peerId null → the shared group room of an AI-matched ride (legacy). Open
 *                   to the owner and any matched participant.
 */
const resolveThread = async (rideId, userId, peerIdRaw) => {
  const ride = await CarpoolRequest.findById(rideId).lean();
  if (!ride) return { ok: false, status: 404, reason: 'Ride not found' };

  const isOwner = String(ride.userId) === String(userId);

  // Explicit 1:1 thread.
  if (peerIdRaw) {
    const peerId = String(peerIdRaw);
    if (peerId === String(ride.userId)) {
      return { ok: false, status: 400, reason: 'The driver cannot be the passenger party.' };
    }
    if (!isOwner && String(userId) !== peerId) {
      return { ok: false, status: 403, reason: 'Not a participant of this conversation.' };
    }
    return { ok: true, ride, isOwner, peerId, group: false };
  }

  // No peerId: matched participants (and the owner) get the group room;
  // an outside passenger gets their own negotiation thread.
  const inMatchedWith = (ride.matchedWith || []).some((id) => String(id) === String(userId));
  let matched = isOwner || inMatchedWith;
  if (!matched && ride.matchId) {
    matched = await CarpoolRequest.exists({ matchId: ride.matchId, userId });
  }
  if (matched) return { ok: true, ride, isOwner, peerId: null, group: true };

  return { ok: true, ride, isOwner, peerId: String(userId), group: false };
};

exports.listMessages = async (req, res, next) => {
  try {
    const { rideId } = req.params;
    const t = await resolveThread(rideId, req.user._id, req.query.peerId);
    if (!t.ok) return res.status(t.status).json({ success: false, message: t.reason });

    const messages = await ChatMessage.find({ rideId, peerId: t.peerId })
      .sort({ createdAt: 1 })
      .populate('userId', 'name avatar')
      .limit(500)
      .lean();

    res.json({ success: true, messages, peerId: t.peerId, isDriver: t.isOwner });
  } catch (err) {
    next(err);
  }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const { rideId } = req.params;
    const { body } = req.body;
    if (!body || !body.trim()) {
      return res.status(400).json({ success: false, message: 'Empty message' });
    }

    const t = await resolveThread(rideId, req.user._id, req.body.peerId || req.query.peerId);
    if (!t.ok) return res.status(t.status).json({ success: false, message: t.reason });

    const msg = await ChatMessage.create({
      rideId,
      userId: req.user._id,
      peerId: t.peerId,
      body: body.trim(),
      expiresAt: expiryForRide(t.ride),
    });
    await msg.populate('userId', 'name avatar');

    const io = req.app.get('io');
    if (io) io.to(`chat_${rideId}`).emit('chat-message', msg);

    // Notify the other party of the 1:1 thread (driver ↔ this passenger).
    if (t.peerId) {
      const recipient = String(req.user._id) === String(t.peerId) ? t.ride.userId : t.peerId;
      if (String(recipient) !== String(req.user._id)) {
        pushService.sendToUser(recipient, {
          title: `${req.user.name || 'New message'}`,
          body: body.trim().slice(0, 140),
          data: { type: 'chat', rideId: String(rideId), peerId: String(t.peerId) },
        });
      }
    }

    res.status(201).json({ success: true, message: msg });
  } catch (err) {
    next(err);
  }
};

// ── Inbox: all of the caller's 1:1 conversations ─────────────────────────────
// Threads where the caller is the passenger (peerId === me) or the driver
// (they own the ride). One entry per (rideId, peerId) with the last message.
exports.listThreads = async (req, res, next) => {
  try {
    const me = req.user._id;
    const myRides = await CarpoolRequest.find({ userId: me, role: 'driver' })
      .select('_id').lean();
    const myRideIds = myRides.map((r) => r._id);

    const grouped = await ChatMessage.aggregate([
      {
        $match: {
          peerId: { $ne: null },
          $or: [{ peerId: me }, { rideId: { $in: myRideIds } }],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: { rideId: '$rideId', peerId: '$peerId' },
          lastBody: { $first: '$body' },
          lastAt: { $first: '$createdAt' },
          lastSender: { $first: '$userId' },
          count: { $sum: 1 },
        },
      },
      { $sort: { lastAt: -1 } },
      { $limit: 100 },
    ]);

    // Hydrate ride + peer details in bulk.
    const rideIds = [...new Set(grouped.map((g) => String(g._id.rideId)))];
    const peerIds = [...new Set(grouped.map((g) => String(g._id.peerId)))];
    const [rides, peers] = await Promise.all([
      CarpoolRequest.find({ _id: { $in: rideIds } })
        .select('userId pickup dropoff departureTime price seatsAvailable status role vehicleType matchedWith')
        .populate('userId', 'name avatar').lean(),
      User.find({ _id: { $in: peerIds } }).select('name avatar').lean(),
    ]);
    const rideMap = Object.fromEntries(rides.map((r) => [String(r._id), r]));
    const peerMap = Object.fromEntries(peers.map((u) => [String(u._id), u]));

    const threads = grouped.map((g) => {
      const ride = rideMap[String(g._id.rideId)];
      const peer = peerMap[String(g._id.peerId)];
      const iAmDriver = ride && String(ride.userId?._id || ride.userId) === String(me);
      const confirmed = ride && (ride.matchedWith || []).some(
        (id) => String(id) === String(g._id.peerId)
      );
      return {
        rideId: g._id.rideId,
        peerId: g._id.peerId,
        ride,
        peer,                 // the passenger party
        iAmDriver,
        confirmed,
        lastBody: g.lastBody,
        lastAt: g.lastAt,
        count: g.count,
      };
    }).filter((t) => t.ride);

    res.json({ success: true, threads });
  } catch (err) {
    next(err);
  }
};

// ── Driver confirms a passenger for the ride ─────────────────────────────────
// Decrements an available seat, records the passenger, creates a matched
// passenger request (so it shows in their history) and posts a system message.
exports.confirmRide = async (req, res, next) => {
  try {
    const { rideId } = req.params;
    const { passengerId, agreedPrice } = req.body;
    if (!passengerId) {
      return res.status(400).json({ success: false, message: 'passengerId required' });
    }

    const ride = await CarpoolRequest.findById(rideId);
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });
    if (String(ride.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the ride owner can confirm.' });
    }
    if (ride.role !== 'driver') {
      return res.status(400).json({ success: false, message: 'Only driver rides can confirm passengers.' });
    }
    if (['completed', 'cancelled'].includes(ride.status)) {
      return res.status(400).json({ success: false, message: `Ride is ${ride.status}.` });
    }
    if ((ride.matchedWith || []).some((id) => String(id) === String(passengerId))) {
      return res.status(400).json({ success: false, message: 'Passenger already confirmed.' });
    }
    if ((ride.seatsAvailable || 0) < 1) {
      return res.status(400).json({ success: false, message: 'No seats left on this ride.' });
    }

    ride.seatsAvailable -= 1;
    ride.matchedWith = [...(ride.matchedWith || []), passengerId];
    if (ride.seatsAvailable <= 0) ride.status = 'matched';
    await ride.save();

    // Best-effort: track how many carpools this passenger has joined.
    User.updateOne({ _id: passengerId }, { $inc: { carpoolsJoined: 1 } }).catch(
      (e) => console.warn('carpoolsJoined increment failed:', e.message)
    );

    // Mirror as a matched passenger request so it appears in the passenger's
    // carpool history. Best-effort — never blocks the confirm.
    let passengerRequest = null;
    try {
      passengerRequest = await CarpoolRequest.create({
        userId: passengerId,
        pickup: ride.pickup,
        dropoff: ride.dropoff,
        departureTime: ride.departureTime,
        departureTimeStr: ride.departureTimeStr,
        role: 'passenger',
        status: 'matched',
        seatsNeeded: 1,
        vehicleType: ride.vehicleType,
        price: agreedPrice != null ? Number(agreedPrice) : ride.price,
        matchedWith: [ride.userId],
        notes: 'Confirmed via chat',
      });
    } catch (e) {
      console.warn('Passenger mirror request failed:', e.message);
    }

    // System message in the (ride, passenger) thread.
    const priceLine = agreedPrice != null ? ` Agreed fare: ₹${Number(agreedPrice)}.` : '';
    const sysMsg = await ChatMessage.create({
      rideId: ride._id,
      userId: req.user._id,
      peerId: passengerId,
      kind: 'system',
      body: `✅ Ride confirmed by the driver.${priceLine}`,
      expiresAt: expiryForRide(ride),
    });
    await sysMsg.populate('userId', 'name avatar');

    const io = req.app.get('io');
    if (io) {
      io.to(`chat_${rideId}`).emit('chat-message', sysMsg);
      io.to(`chat_${rideId}`).emit('ride-confirmed', {
        rideId: ride._id, passengerId, seatsAvailable: ride.seatsAvailable,
      });
    }

    pushService.sendToUser(passengerId, {
      title: 'Ride confirmed ✅',
      body: 'A driver confirmed your seat. Tap to view the conversation.',
      data: { type: 'chat', rideId: String(ride._id), peerId: String(passengerId) },
    });

    res.json({
      success: true,
      message: sysMsg,
      ride: { _id: ride._id, seatsAvailable: ride.seatsAvailable, status: ride.status },
      passengerRequest,
    });
  } catch (err) {
    next(err);
  }
};
