const express = require('express');
const router = express.Router();
const routeController = require('../controllers/routeController');
const { protect, optionalAuth } = require('../middleware/auth');
const { routeLimiter } = require('../middleware/rateLimiter');
const { routeValidation } = require('../middleware/validator');

router.post('/calculate', routeLimiter, optionalAuth, routeValidation, routeController.calculateRoute);
router.get('/history', protect, routeController.getRideHistory);
router.get('/favorites', protect, routeController.getFavoriteRoutes);
router.post('/favorites', protect, routeController.saveFavoriteRoute);
router.get('/:id', protect, routeController.getRideById);
router.post('/multimodal', routeLimiter, routeController.getMultiModalComparison);

module.exports = router;