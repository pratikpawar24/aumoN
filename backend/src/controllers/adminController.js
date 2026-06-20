const User = require('../models/User');
const Ride = require('../models/Ride');
const Trip = require('../models/Trip');
const CarpoolRequest = require('../models/CarpoolRequest');
const AdminLog = require('../models/AdminLog');
const emailService = require('../services/emailService');

const ADMIN_FIELDS = 'name email mobile avatar role isActive isBlocked blockedAt blockReason vehicleType greenScore totalCO2Saved totalCO2Emitted totalTrips totalDistanceKm carpoolsJoined carpoolsOffered emailVerified verificationMethod verifiedBy verifiedAt createdAt lastLogin';

const log = async (req, action, target = {}) => {
  try {
    await AdminLog.create({
      actorId: req.user._id,
      actorRole: req.user.role,
      action,
      targetType: target.type || 'user',
      targetId: target.id || null,
      metadata: target.meta || {},
    });
  } catch (e) {
    console.error('AdminLog write failed:', e.message);
  }
};

// ── Overview / stats ─────────────────────────────────────────────────────────
exports.getStats = async (req, res, next) => {
  try {
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [
      userCount, blockedCount, verifiedCount,
      activeTrips, ridesToday, totalRides,
      activeCarpools,
      totalCo2SavedAgg,
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'user', isBlocked: true }),
      User.countDocuments({ role: 'user', emailVerified: true }),
      Trip.countDocuments({ status: 'active' }),
      Ride.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }),
      Ride.countDocuments({}),
      CarpoolRequest.countDocuments({ status: { $in: ['pending', 'matching', 'matched'] } }),
      Ride.aggregate([
        { $match: { createdAt: { $gte: since30d } } },
        { $group: { _id: null, total: { $sum: '$co2Saved' } } },
      ]),
    ]);

    res.json({
      success: true,
      stats: {
        users: { total: userCount, blocked: blockedCount, verified: verifiedCount },
        rides: { activeTrips, today: ridesToday, total: totalRides },
        carpool: { active: activeCarpools },
        emissions: {
          co2SavedG_30d: totalCo2SavedAgg[0]?.total || 0,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── Reports: app-wide + per-user rollups ─────────────────────────────────────
exports.getReports = async (req, res, next) => {
  try {
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [userAgg, carpoolRides, topUsers, searchTotal, searchDaily, scheduledByStatus, scheduledByRole] = await Promise.all([
      User.aggregate([
        { $match: { role: 'user' } },
        {
          $group: {
            _id: null,
            users: { $sum: 1 },
            verified: { $sum: { $cond: ['$emailVerified', 1, 0] } },
            blocked: { $sum: { $cond: ['$isBlocked', 1, 0] } },
            totalTrips: { $sum: '$totalTrips' },
            totalDistanceKm: { $sum: '$totalDistanceKm' },
            totalCO2SavedG: { $sum: '$totalCO2Saved' },
          },
        },
      ]),
      CarpoolRequest.countDocuments({}),
      User.find({ role: 'user' })
        .select('name email totalTrips totalCO2Saved totalDistanceKm carpoolsJoined')
        .sort({ totalCO2Saved: -1 })
        .limit(50)
        .lean(),
      Ride.countDocuments({}),
      Ride.aggregate([
        { $match: { createdAt: { $gte: since30d } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      CarpoolRequest.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      CarpoolRequest.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    ]);

    const a = userAgg[0] || {};
    const toMap = (arr) => arr.reduce((m, x) => { m[x._id || 'unknown'] = x.count; return m; }, {});
    res.json({
      success: true,
      app: {
        users: a.users || 0,
        verified: a.verified || 0,
        blocked: a.blocked || 0,
        totalTrips: a.totalTrips || 0,
        totalDistanceKm: Math.round(a.totalDistanceKm || 0),
        totalCO2SavedKg: Math.round((a.totalCO2SavedG || 0) / 1000),
        carpoolRides,
      },
      searches: {
        total: searchTotal,
        last30dDaily: searchDaily.map((d) => ({ date: d._id, count: d.count })),
      },
      scheduled: {
        total: carpoolRides,
        byStatus: toMap(scheduledByStatus),
        byRole: toMap(scheduledByRole),
      },
      topUsers: topUsers.map((u) => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        totalTrips: u.totalTrips || 0,
        totalCO2SavedKg: Math.round((u.totalCO2Saved || 0) / 1000),
        totalDistanceKm: Math.round(u.totalDistanceKm || 0),
        carpoolsJoined: u.carpoolsJoined || 0,
      })),
    });
  } catch (err) {
    next(err);
  }
};

// ── Reports: route-search breakdown (from durable Ride records) ───────────────
exports.getSearchesReport = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const match = {};
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) match.createdAt.$lte = new Date(to);
    }
    const [total, daily, byVehicleType, byOptimizeFor] = await Promise.all([
      Ride.countDocuments(match),
      Ride.aggregate([
        { $match: match },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Ride.aggregate([
        { $match: match },
        { $group: { _id: '$vehicleType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Ride.aggregate([
        { $match: match },
        { $group: { _id: '$optimizeFor', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);
    res.json({
      success: true,
      total,
      daily: daily.map((d) => ({ date: d._id, count: d.count })),
      byVehicleType: byVehicleType.map((d) => ({ type: d._id || 'unknown', count: d.count })),
      byOptimizeFor: byOptimizeFor.map((d) => ({ mode: d._id || 'unknown', count: d.count })),
    });
  } catch (err) {
    next(err);
  }
};

// ── Reports: scheduled carpool rides in detail ───────────────────────────────
exports.getScheduledReport = async (req, res, next) => {
  try {
    const { from, to, status, role, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (status) filter.status = { $in: String(status).split(',').map((s) => s.trim()) };
    if (role && ['driver', 'passenger'].includes(role)) filter.role = role;
    if (from || to) {
      filter.departureTime = {};
      if (from) filter.departureTime.$gte = new Date(from);
      if (to) filter.departureTime.$lte = new Date(to);
    }
    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    const skip = (parseInt(page, 10) - 1) * lim;
    const [docs, total] = await Promise.all([
      CarpoolRequest.find(filter)
        .sort({ departureTime: -1 })
        .skip(skip)
        .limit(lim)
        .populate('userId', 'name email')
        .lean(),
      CarpoolRequest.countDocuments(filter),
    ]);
    const rides = docs.map((r) => ({
      _id: r._id,
      riderName: r.userId?.name || '',
      riderEmail: r.userId?.email || '',
      pickup: r.pickup?.address || `${r.pickup?.lat},${r.pickup?.lng}`,
      dropoff: r.dropoff?.address || `${r.dropoff?.lat},${r.dropoff?.lng}`,
      departureTime: r.departureTime,
      role: r.role,
      status: r.status,
      seats: r.role === 'driver' ? r.seatsAvailable : r.seatsNeeded,
      price: r.price,
      createdAt: r.createdAt,
    }));
    res.json({ success: true, total, rides, pagination: { page: parseInt(page, 10), limit: lim, total } });
  } catch (err) {
    next(err);
  }
};

// ── Users ───────────────────────────────────────────────────────────────────
exports.listUsers = async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 25 } = req.query;
    const filter = { role: 'user' };
    if (search) {
      const re = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: re }, { email: re }, { mobile: re }];
    }
    if (status === 'blocked') filter.isBlocked = true;
    if (status === 'unverified') filter.emailVerified = false;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [users, total] = await Promise.all([
      User.find(filter)
        .select(ADMIN_FIELDS)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      users,
      pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total },
    });
  } catch (err) {
    next(err);
  }
};

exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select(ADMIN_FIELDS)
      .populate('verifiedBy', 'name email');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Recent ride history (last 50)
    const rides = await Ride.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // CO2 savings timeseries (last 30 days, daily buckets)
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const series = await Ride.aggregate([
      { $match: { userId: user._id, createdAt: { $gte: since30d } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          co2Saved: { $sum: '$co2Saved' },
          rides: { $sum: 1 },
          distance: { $sum: '$distanceKm' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Carpool requests this user scheduled/joined (last 50, newest first).
    const carpools = await CarpoolRequest.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({ success: true, user, rides, series, carpools });
  } catch (err) {
    next(err);
  }
};

exports.blockUser = async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: 'User not found' });
    if (target.role === 'admin_master') {
      return res.status(403).json({ success: false, message: 'Master admin cannot be blocked.' });
    }
    if (target.role === 'admin_secondary' && req.user.role !== 'admin_master') {
      return res.status(403).json({ success: false, message: 'Only the master admin can act on other admins.' });
    }

    target.isBlocked = true;
    target.blockedAt = new Date();
    target.blockedBy = req.user._id;
    target.blockReason = req.body?.reason || '';
    await target.save();

    await log(req, 'user.block', { type: target.role.startsWith('admin') ? 'admin' : 'user', id: target._id, meta: { reason: target.blockReason } });
    res.json({ success: true, user: target.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

exports.unblockUser = async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: 'User not found' });

    target.isBlocked = false;
    target.blockedAt = null;
    target.blockReason = '';
    await target.save();

    await log(req, 'user.unblock', { type: target.role.startsWith('admin') ? 'admin' : 'user', id: target._id });
    res.json({ success: true, user: target.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

exports.removeUser = async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: 'User not found' });
    if (target.role === 'admin_master') {
      return res.status(403).json({ success: false, message: 'Master admin cannot be removed.' });
    }
    if (target.role === 'admin_secondary' && req.user.role !== 'admin_master') {
      return res.status(403).json({ success: false, message: 'Only the master admin can remove other admins.' });
    }
    // Soft delete: deactivate rather than hard-delete to preserve history.
    target.isActive = false;
    target.isBlocked = true;
    target.blockedAt = new Date();
    target.blockedBy = req.user._id;
    target.blockReason = req.body?.reason || 'Removed by admin';
    await target.save();

    await log(req, 'user.remove', { type: target.role.startsWith('admin') ? 'admin' : 'user', id: target._id });
    res.json({ success: true, message: 'User removed.' });
  } catch (err) {
    next(err);
  }
};

// ── Manual email verification ────────────────────────────────────────────────
// Lets an admin (master or secondary) mark a user's email as verified without
// the OTP flow — e.g. when a user can't receive the OTP. Records who/when for
// the audit trail and best-effort notifies the user.
exports.verifyUser = async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: 'User not found' });

    if (target.emailVerified) {
      return res.status(400).json({ success: false, message: 'User is already verified.' });
    }

    target.emailVerified = true;
    target.verificationMethod = 'admin_manual';
    target.verifiedBy = req.user._id;
    target.verifiedAt = new Date();
    // Clear any pending OTP so it can't be reused.
    target.verificationOtp = undefined;
    target.verificationOtpExpires = undefined;
    await target.save();

    await log(req, 'user.verify', {
      type: 'user',
      id: target._id,
      meta: { email: target.email, method: 'admin_manual' },
    });

    // Best-effort notification — never fails the request.
    try {
      await emailService.sendMail({
        to: target.email,
        subject: 'Your AUMO account has been verified ✅',
        text: `Hi ${target.name || 'there'},\n\nGood news — your AUMO account has been verified by our team. You now have full access, including the carpool features.\n\n— AUMO`,
        html: `<p>Hi ${target.name || 'there'},</p><p>Good news — your AUMO account has been <strong>verified by our team</strong>. You now have full access, including the carpool features.</p><p>— AUMO</p>`,
      });
    } catch (e) {
      console.warn('Verification notification email skipped:', e.message);
    }

    res.json({ success: true, user: target.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

// ── Active rides feed ────────────────────────────────────────────────────────
exports.activeRides = async (req, res, next) => {
  try {
    const trips = await Trip.find({ status: 'active' })
      .sort({ startedAt: -1 })
      .limit(50)
      .populate('userId', 'name avatar')
      .lean();
    res.json({ success: true, trips });
  } catch (err) {
    next(err);
  }
};

// ── Master-only: secondary admin management ──────────────────────────────────
exports.listAdmins = async (req, res, next) => {
  try {
    const admins = await User.find({ role: 'admin_secondary' })
      .select(ADMIN_FIELDS)
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, admins });
  } catch (err) {
    next(err);
  }
};

exports.createAdmin = async (req, res, next) => {
  try {
    const { name, email, password, mobile } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'name, email, password required' });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already in use' });
    }
    const admin = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      mobile: mobile || '',
      role: 'admin_secondary',
      emailVerified: true,
      isActive: true,
    });
    await log(req, 'admin.create', { type: 'admin', id: admin._id, meta: { email: admin.email } });
    res.status(201).json({ success: true, admin: admin.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

exports.adminActivity = async (req, res, next) => {
  try {
    const { adminId, limit = 100 } = req.query;
    const filter = {};
    if (adminId) filter.actorId = adminId;
    const logs = await AdminLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(parseInt(limit, 10) || 100, 500))
      .populate('actorId', 'name email role')
      .lean();
    res.json({ success: true, logs });
  } catch (err) {
    next(err);
  }
};
