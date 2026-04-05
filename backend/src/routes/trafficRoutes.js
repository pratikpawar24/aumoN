const express = require('express');
const router = express.Router();
const trafficController = require('../controllers/trafficController');
const { mapLimiter } = require('../middleware/rateLimiter');

router.get('/predict', mapLimiter, trafficController.predictTraffic);
router.get('/current', trafficController.getCurrentTraffic);

module.exports = router;