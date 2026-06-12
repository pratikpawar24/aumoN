const EmissionLog = require('../models/EmissionLog');
const User = require('../models/User');

const EMISSION_FACTORS = {
  car: 150, electric: 55, bus: 90, bike: 0, walk: 0, motorcycle: 100,
};

class CarbonService {
  getEmissionFactor(vehicleType) {
    return EMISSION_FACTORS[vehicleType] || 150;
  }

  calculateEmission(distanceKm, vehicleType, congestionMultiplier = 1.0) {
    const ef = this.getEmissionFactor(vehicleType);
    return Math.round(distanceKm * ef * congestionMultiplier);
  }

  calculateGreenScore(actualG, baselineG) {
    if (baselineG <= 0) return 100;
    const ratio = actualG / baselineG;
    return Math.round(Math.min(100, Math.max(0, (2 - ratio) * 50)));
  }

  async logEmission(userId, rideData) {
    const log = new EmissionLog({
      userId,
      rideId: rideData.rideId || null,
      co2Emitted: rideData.co2Emissions || 0,
      co2Saved: rideData.co2Saved || 0,
      baselineEmission: rideData.baselineEmission || 0,
      // ?? not || — a legitimate score of 0 (no savings) was being
      // silently rewritten to 50 because of the falsy-OR fallback,
      // contributing to the "stuck at 50" reports.
      greenScore: rideData.greenScore ?? 0,
      vehicleType: rideData.vehicleType || 'car',
      distance: rideData.distanceKm || 0,
      optimizeFor: rideData.optimizeFor || 'carbon',
      isCarpooled: rideData.isCarpooled || false,
      carpoolPassengers: rideData.passengerCount || 1,
      date: new Date(),
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
    });
    await log.save();
    return log;
  }

  async getUserStats(userId) {
    const logs = await EmissionLog.find({ userId }).sort({ date: -1 }).limit(365);

    if (!logs.length) {
      return { totalEmitted: 0, totalSaved: 0, avgGreenScore: 0, tripCount: 0 };
    }

    const totalEmitted = logs.reduce((s, l) => s + (l.co2Emitted || 0), 0);
    const totalSaved = logs.reduce((s, l) => s + (l.co2Saved || 0), 0);
    const avgGreenScore = Math.round(
      logs.reduce((s, l) => s + (l.greenScore ?? 0), 0) / logs.length
    );

    // Monthly breakdown (last 6 months)
    const monthly = {};
    logs.forEach((l) => {
      const key = `${l.year}-${String(l.month).padStart(2, '0')}`;
      if (!monthly[key]) monthly[key] = { emitted: 0, saved: 0, trips: 0 };
      monthly[key].emitted += l.co2Emitted || 0;
      monthly[key].saved += l.co2Saved || 0;
      monthly[key].trips++;
    });

    // Vehicle breakdown
    const byVehicle = {};
    logs.forEach((l) => {
      if (!byVehicle[l.vehicleType]) byVehicle[l.vehicleType] = { trips: 0, emitted: 0 };
      byVehicle[l.vehicleType].trips++;
      byVehicle[l.vehicleType].emitted += l.co2Emitted || 0;
    });

    return {
      totalEmittedG: Math.round(totalEmitted),
      totalSavedG: Math.round(totalSaved),
      avgGreenScore,
      tripCount: logs.length,
      carpooledTrips: logs.filter((l) => l.isCarpooled).length,
      monthly: Object.entries(monthly)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([month, data]) => ({ month, ...data })),
      byVehicle,
      equivalentTrees: Math.round(totalSaved / 21000),
      equivalentFlights: Math.round(totalSaved / 255000 * 100) / 100,
    };
  }

  async getLeaderboard(limit = 20) {
    // Only regular users belong on the public green leaderboard — exclude
    // master and secondary admin accounts (and any blocked users).
    return User.find({
      isActive: true,
      isBlocked: { $ne: true },
      role: { $nin: ['admin_master', 'admin_secondary'] },
    })
      .select('name avatar greenScore totalCO2Saved totalTrips vehicleType')
      .sort({ totalCO2Saved: -1, greenScore: -1 })
      .limit(limit)
      .lean();
  }

  async getGlobalStats() {
    const result = await EmissionLog.aggregate([
      {
        $group: {
          _id: null,
          totalSaved: { $sum: '$co2Saved' },
          totalEmitted: { $sum: '$co2Emitted' },
          totalTrips: { $sum: 1 },
          avgScore: { $avg: '$greenScore' },
          carpooledTrips: {
            $sum: { $cond: ['$isCarpooled', 1, 0] },
          },
        },
      },
    ]);
    const stats = result[0] || {};
    return {
      totalCO2SavedG: Math.round(stats.totalSaved || 0),
      totalCO2EmittedG: Math.round(stats.totalEmitted || 0),
      totalTrips: stats.totalTrips || 0,
      avgGreenScore: Math.round(stats.avgScore || 50),
      carpooledTrips: stats.carpooledTrips || 0,
      equivalentTrees: Math.round((stats.totalSaved || 0) / 21000),
    };
  }
}

module.exports = new CarbonService();