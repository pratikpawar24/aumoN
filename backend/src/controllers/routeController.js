const Ride = require('../models/Ride');
const EmissionLog = require('../models/EmissionLog');
const Route = require('../models/Route');
const routingService = require('../services/routingService');
const carbonService = require('../services/carbonService');

exports.calculateRoute = async (req, res, next) => {
  try {
    const {
      origin, destination, vehicleType = 'car',
      optimizeFor = 'carbon', departureTime,
      avoidCongestion = true, saveRoute = true,
    } = req.body;

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