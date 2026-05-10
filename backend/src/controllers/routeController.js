const Ride = require('../models/Ride');
const EmissionLog = require('../models/EmissionLog');
const Route = require('../models/Route');
const routingService = require('../services/routingService');
const carbonService = require('../services/carbonService');

// Per-mode max sensible distances. Beyond these, we don't even attempt
// a road route — physical reality (open ocean, missing road networks)
// makes it impossible. The frontend gets a clear error instead of a
// silently-drawn straight line.
const MAX_DISTANCE_KM = {
  car: 2500, electric: 2500, motorcycle: 2000, bus: 1500,
  bike: 200, walk: 50,
};

const haversineKm = (a, b) => {
  const R = 6371;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
};

exports.calculateRoute = async (req, res, next) => {
  try {
    const {
      origin, destination, vehicleType = 'car',
      optimizeFor = 'carbon', departureTime,
      avoidCongestion = true, saveRoute = true,
    } = req.body;

    // Sanity-check: reject obviously-impossible destinations up front.
    const straightKm = haversineKm(origin, destination);
    const maxKm = MAX_DISTANCE_KM[vehicleType] ?? 2500;
    if (straightKm > maxKm) {
      return res.status(422).json({
        success: false,
        message: `That's ${Math.round(straightKm).toLocaleString()} km in a straight line — too far for a road route by ${vehicleType}. Try a destination within ${maxKm.toLocaleString()} km.`,
        code: 'DISTANCE_TOO_FAR',
        straightLineKm: Math.round(straightKm),
        maxKm,
      });
    }

    const result = await routingService.getOptimizedRoute(origin, destination, {
      vehicleType, optimizeFor, departureTime, avoidCongestion,
    });

    const primary = result.primary_route;

    // Save ride to DB if user is authenticated
    if (req.user && saveRoute) {
      const ride = await Ride.create({
        userId: req.user._id,
        origin: { lat: origin.lat, lng: origin.lng, address: origin.address || '' },
        destination: { lat: destination.lat, lng: destination.lng, address: destination.address || '' },
        routeGeometry: primary.route_geometry || [],
        distanceKm: primary.total_distance_km,
        timeMinutes: primary.total_time_minutes,
        co2Emissions: primary.total_emissions_g,
        co2Saved: primary.carbon_saved_g,
        baselineEmission: primary.baseline_emission_g || primary.total_distance_km * 150,
        vehicleType,
        optimizeFor,
        greenScore: primary.green_score,
        instructions: primary.instructions || [],
        alternativeRoutes: result.alternatives || [],
        algorithm: primary.algorithm || 'unknown',
        profile: primary.profile || optimizeFor,
        departureTime: departureTime ? new Date(`1970-01-01T${departureTime}`) : new Date(),
      });

      // Log emission
      await carbonService.logEmission(req.user._id, {
        rideId: ride._id,
        co2Emissions: primary.total_emissions_g,
        co2Saved: primary.carbon_saved_g,
        baselineEmission: primary.baseline_emission_g,
        greenScore: primary.green_score,
        vehicleType,
        distanceKm: primary.total_distance_km,
        optimizeFor,
      });

      // Update user metrics
      await req.user.updateGreenMetrics({
        distanceKm: primary.total_distance_km,
        co2Emitted: primary.total_emissions_g,
        co2Saved: primary.carbon_saved_g,
      });

      result.rideId = ride._id;
    }

    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

exports.getRideHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const skip = (page - 1) * limit;

    const filter = { userId: req.user._id };
    if (req.query.vehicleType) filter.vehicleType = req.query.vehicleType;
    if (req.query.isCarpooled) filter.isCarpooled = req.query.isCarpooled === 'true';

    const [rides, total] = await Promise.all([
      Ride.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Ride.countDocuments(filter),
    ]);

    res.json({
      success: true,
      rides,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

exports.getRideById = async (req, res, next) => {
  try {
    const ride = await Ride.findOne({ _id: req.params.id, userId: req.user._id });
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found.' });
    res.json({ success: true, ride });
  } catch (err) {
    next(err);
  }
};

exports.saveFavoriteRoute = async (req, res, next) => {
  try {
    const { origin, destination, vehicleType, optimizeFor, name } = req.body;
    const route = await Route.findOneAndUpdate(
      { userId: req.user._id, 'origin.lat': origin.lat, 'origin.lng': origin.lng,
        'destination.lat': destination.lat, 'destination.lng': destination.lng },
      { $set: { name: name || 'My Route', isFavorite: true, vehicleType, optimizeFor, lastUsed: new Date() },
        $inc: { useCount: 1 } },
      { new: true, upsert: true }
    );
    res.json({ success: true, route });
  } catch (err) {
    next(err);
  }
};

exports.getFavoriteRoutes = async (req, res, next) => {
  try {
    const routes = await Route.find({ userId: req.user._id, isFavorite: true })
      .sort({ useCount: -1, lastUsed: -1 })
      .limit(10);
    res.json({ success: true, routes });
  } catch (err) {
    next(err);
  }
};

exports.getMultiModalComparison = async (req, res, next) => {
  try {
    const { origin, destination } = req.body;
    const routes = await routingService.getMultiModalRoutes(origin, destination);
    res.json({ success: true, routes });
  } catch (err) {
    next(err);
  }
};

// ── Dashboard analytics ─────────────────────────────────────────────────────
//
// Aggregates a user's Ride history into the buckets the dashboard chart
// components consume. Period controls both the lookback window and the
// granularity of time-series buckets (week → daily; month → daily; year →
// monthly).
//
// Cost saved is derived from CO2 savings + carpool-share. The model:
//   solo cost ≈ distance_km × 8 INR (petrol ₹100/L ÷ 12 km/L mileage)
//   eco savings_inr  = co2SavedG × ₹8 / 150g  (CO2 saved → fuel saved)
//   carpool savings_inr = solo_cost × (1 - 1/passengerCount)
// Pure heuristics — labeled as "estimated" in the UI.
//
// Time saved uses a 25 km/h "average city traffic" baseline vs the actual
// optimized route time:
//   saved_min = max(0, distance_km / 25 * 60 - timeMinutes)
exports.getAnalytics = async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;
    const now = new Date();
    let startDate;
    let bucketBy;
    if (period === 'week')      { startDate = new Date(Date.now() - 7  * 24 * 3600 * 1000); bucketBy = 'day';   }
    else if (period === 'year') { startDate = new Date(Date.now() - 365 * 24 * 3600 * 1000); bucketBy = 'month'; }
    else                        { startDate = new Date(Date.now() - 30 * 24 * 3600 * 1000); bucketBy = 'day';   }

    const userId = req.user._id;
    const filter = { userId, createdAt: { $gte: startDate } };

    const FUEL_INR_PER_KM = 8;          // petrol ₹100/L ÷ 12 km/L
    const INR_PER_G_CO2 = FUEL_INR_PER_KM / 150;  // 0.0533

    // Single pass over rides — small enough that JS aggregation is simpler
    // than a multi-stage Mongo pipeline.
    const Ride = require('../models/Ride');
    const rides = await Ride.find(filter)
      .select('distanceKm timeMinutes co2Saved co2Emissions vehicleType isCarpooled passengerCount profile createdAt')
      .lean();

    const totals = {
      trips: rides.length,
      co2SavedG: 0,
      distanceKm: 0,
      timeSavedMin: 0,
      costSavedInr: 0,
    };

    const vehicleDist = {};   // vehicleType -> count
    const roleSplit   = { driver: 0, passenger: 0 };
    const co2Buckets  = {};   // bucketKey -> { co2SavedG, rides, distanceKm }
    const monthlySaved = {};  // YYYY-MM -> { timeSavedMin, costSavedInr }

    const bucketKey = (d) => {
      const dt = new Date(d);
      if (bucketBy === 'month') {
        return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
      }
      return dt.toISOString().slice(0, 10);
    };
    const monthKey = (d) => {
      const dt = new Date(d);
      return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
    };

    for (const r of rides) {
      // Time saved: optimized route vs naive 25 km/h city avg
      const baselineMin = (r.distanceKm || 0) / 25 * 60;
      const savedMin = Math.max(0, baselineMin - (r.timeMinutes || 0));

      // Cost saved: CO2-derived fuel savings + carpool share
      let savedInr = (r.co2Saved || 0) * INR_PER_G_CO2;
      if (r.isCarpooled && r.passengerCount > 1) {
        const soloCost = (r.distanceKm || 0) * FUEL_INR_PER_KM;
        savedInr += soloCost * (1 - 1 / r.passengerCount);
      }

      totals.co2SavedG    += r.co2Saved || 0;
      totals.distanceKm   += r.distanceKm || 0;
      totals.timeSavedMin += savedMin;
      totals.costSavedInr += savedInr;

      vehicleDist[r.vehicleType || 'car'] = (vehicleDist[r.vehicleType || 'car'] || 0) + 1;

      // Driver / passenger derived from carpool flag — passengers never
      // count as "driver" in the Ride model, so the split is binary.
      // (Carpool driver case is currently the same record — not separated.)
      if (r.isCarpooled) roleSplit.passenger += 1;
      else                roleSplit.driver += 1;

      const k = bucketKey(r.createdAt);
      if (!co2Buckets[k]) co2Buckets[k] = { co2SavedG: 0, rides: 0, distanceKm: 0 };
      co2Buckets[k].co2SavedG  += r.co2Saved || 0;
      co2Buckets[k].rides      += 1;
      co2Buckets[k].distanceKm += r.distanceKm || 0;

      const m = monthKey(r.createdAt);
      if (!monthlySaved[m]) monthlySaved[m] = { timeSavedMin: 0, costSavedInr: 0 };
      monthlySaved[m].timeSavedMin += savedMin;
      monthlySaved[m].costSavedInr += savedInr;
    }

    const co2Series = Object.entries(co2Buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date,
        co2SavedKg: Math.round((v.co2SavedG / 1000) * 100) / 100,
        rides: v.rides,
        distanceKm: Math.round(v.distanceKm * 10) / 10,
      }));

    const monthlySeries = Object.entries(monthlySaved)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        month,
        timeSavedHours: Math.round((v.timeSavedMin / 60) * 10) / 10,
        costSavedInr: Math.round(v.costSavedInr),
      }));

    res.json({
      success: true,
      period,
      totals: {
        trips: totals.trips,
        co2SavedKg: Math.round((totals.co2SavedG / 1000) * 100) / 100,
        distanceKm: Math.round(totals.distanceKm * 10) / 10,
        timeSavedHours: Math.round((totals.timeSavedMin / 60) * 10) / 10,
        costSavedInr: Math.round(totals.costSavedInr),
      },
      vehicleDistribution: Object.entries(vehicleDist).map(([vehicleType, count]) => ({
        vehicleType, count,
      })),
      roleSplit: [
        { name: 'Solo / driver', value: roleSplit.driver },
        { name: 'Carpool',        value: roleSplit.passenger },
      ],
      co2Series,
      monthlySeries,
    });
  } catch (err) {
    next(err);
  }
};