const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { routeLimiter } = require('../middleware/rateLimiter');

router.post('/route/optimize', routeLimiter, aiController.proxyRouteOptimize);
router.post('/carpool/match', routeLimiter, aiController.proxyCarpoolMatch);
router.post('/traffic/predict', routeLimiter, aiController.proxyTrafficPredict);
router.get('/health', aiController.aiHealthCheck);

module.exports = router;