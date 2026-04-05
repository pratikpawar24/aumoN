const aiProxyService = require('../services/aiProxyService');

exports.proxyRouteOptimize = async (req, res, next) => {
  try {
    const result = await aiProxyService.optimizeRoute(req.body);
    if (!result.success) {
      return res.status(result.status || 503).json({ success: false, error: result.error });
    }
    res.json({ success: true, ...result.data });
  } catch (err) {
    next(err);
  }
};

exports.proxyCarpoolMatch = async (req, res, next) => {
  try {
    const result = await aiProxyService.matchCarpool(req.body);
    if (!result.success) {
      return res.status(result.status || 503).json({ success: false, error: result.error });
    }
    res.json({ success: true, ...result.data });
  } catch (err) {
    next(err);
  }
};

exports.proxyTrafficPredict = async (req, res, next) => {
  try {
    const result = await aiProxyService.predictTraffic(req.body);
    if (!result.success) {
      return res.status(result.status || 503).json({ success: false, error: result.error });
    }
    res.json({ success: true, ...result.data });
  } catch (err) {
    next(err);
  }
};

exports.aiHealthCheck = async (req, res, next) => {
  try {
    const result = await aiProxyService.healthCheck();
    res.json({ aiService: result.success ? 'online' : 'offline', ...result.data });
  } catch (err) {
    next(err);
  }
};