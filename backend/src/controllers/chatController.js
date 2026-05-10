const ChatMessage = require('../models/ChatMessage');
const CarpoolRequest = require('../models/CarpoolRequest');

const TTL_AFTER_RIDE_MS = 24 * 60 * 60 * 1000;  // 24h

// Authorize: user is either the ride creator OR a passenger who has been
// matched to the ride. Anyone outside this set is rejected.
const isParticipant = async (rideId, userId) => {
  const ride = await CarpoolRequest.findById(rideId).lean();
  if (!ride) return { ok: false, reason: 'Ride not found', status: 404 };

  // Creator always allowed.
  if (String(ride.userId) === String(userId)) return { ok: true, ride };

  // Matched passengers — anyone listed in matchedWith on the ride
  // OR matched together via matchId.
  const isMatched = (ride.matchedWith || []).some(
    (id) => String(id) === String(userId)
  );
  if (isMatched) return { ok: true, ride };

  // Co-passengers: same matchId
  if (ride.matchId) {
    const sibling = await CarpoolRequest.findOne({
      matchId: ride.matchId,
      userId,
    }).lean();
    if (sibling) return { ok: true, ride };
  }

  return { ok: false, reason: 'Not a participant of this ride', status: 403 };
};

exports.listMessages = async (req, res, next) => {
  try {
    const { rideId } = req.params;
    const auth = await isParticipant(rideId, req.user._id);
    if (!auth.ok) {
      return res.status(auth.status).json({ success: false, message: auth.reason });
    }
    const messages = await ChatMessage.find({ rideId })
      .sort({ createdAt: 1 })
      .populate('userId', 'name avatar')
      .limit(500)
      .lean();
    res.json({ success: true, messages });
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

    const auth = await isParticipant(rideId, req.user._id);
    if (!auth.ok) {
      return res.status(auth.status).json({ success: false, message: auth.reason });
    }

    const expiresAt = new Date(
      new Date(auth.ride.departureTime).getTime() + TTL_AFTER_RIDE_MS
    );

    const msg = await ChatMessage.create({
      rideId,
      userId: req.user._id,
      body: body.trim(),
      expiresAt,
    });
    await msg.populate('userId', 'name avatar');

    // Real-time fanout to anyone listening in this room.
    const io = req.app.get('io');
    if (io) {
      io.to(`chat_${rideId}`).emit('chat-message', msg);
    }

    res.status(201).json({ success: true, message: msg });
  } catch (err) {
    next(err);
  }
};
