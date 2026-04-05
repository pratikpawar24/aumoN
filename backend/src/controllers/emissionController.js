const carbonService = require('../services/carbonService');
const EmissionLog = require('../models/EmissionLog');

exports.getUserStats = async (req, res, next) => {
  try {
    const stats = await carbonService.getUserStats(req.user._id);
    res.json({ success: true, stats });
  } catch (err) {
    next(err);
  }
};

exports.getLeaderboard = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const leaderboard = await carbonService.getLeaderboard(limit);

    // Add rank
    const ranked = leaderboard.map((user, idx) => ({
      rank: idx + 1,
      ...user,
      medal: idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`,
    }));

    res.json({ success: true, leaderboard: ranked });
  } catch (err) {
    next(err);
  }
};

exports.getGlobalStats = async (req, res, next) => {
  try {
    const stats = await carbonService.getGlobalStats();
    res.json({ success: true, stats });
  } catch (err) {
    next(err);
  }
};

exports.getEmissionHistory = async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;
    const now = new Date();
    let startDate;

    if (period === 'week') startDate = new Date(now.setDate(now.getDate() - 7));
    else if (period === 'month') startDate = new Date(now.setMonth(now.getMonth() - 1));
    else if (period === 'year') startDate = new Date(now.setFullYear(now.getFullYear() - 1));
    else startDate = new Date(0);

    const logs = await EmissionLog.find({
      userId: req.user._id,
      date: { $gte: startDate },
    }).sort({ date: -1 }).lean();

    res.json({ success: true, logs, period });
  } catch (err) {
    next(err);
  }
};

exports.estimateEmission = async (req, res, next) => {
  try {
    const { distanceKm, vehicleType, congestionLevel } = req.body;
    const ef = carbonService.getEmissionFactor(vehicleType);
    const multipliers = { free_flow: 1.0, moderate: 1.3, heavy: 1.6, gridlock: 2.2 };
    const mult = multipliers[congestionLevel] || 1.0;
    const emissionG = Math.round(distanceKm * ef * mult);
    const baseline = Math.round(distanceKm * 150);
    const saved = Math.max(0, baseline - emissionG);

    res.json({
      success: true,
      emission_g: emissionG,
      baseline_g: baseline,
      saved_g: saved,
      green_score: carbonService.calculateGreenScore(emissionG, baseline),
      ef_g_per_km: ef * mult,
    });
  } catch (err) {
    next(err);
  }
};