const trafficService = require('../services/trafficService');
const aiProxyService = require('../services/aiProxyService');

exports.predictTraffic = async (req, res, next) => {
  try {
    const { lat, lng, radius_km = 5 } = req.query;
    if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat and lng required.' });
    const data = await trafficService.getTrafficPrediction(
      parseFloat(lat), parseFloat(lng), parseFloat(radius_km)
    );
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

exports.getCurrentTraffic = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    const hour = new Date().getHours();
    const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
    res.json({
      success: true,
      currentConditions: {
        hour,
        isRushHour,
        generalLevel: isRushHour ? 'heavy' : 'moderate',
        recommendation: isRushHour
          ? 'Rush hour - consider carpooling or alternative routes'
          : 'Normal traffic conditions',
      },
    });
  } catch (err) {
    next(err);
  }
};