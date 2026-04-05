const express = require('express');
const router = express.Router();
const emissionController = require('../controllers/emissionController');
const { protect, optionalAuth } = require('../middleware/auth');

router.get('/stats', protect, emissionController.getUserStats);
router.get('/history', protect, emissionController.getEmissionHistory);
router.get('/leaderboard', optionalAuth, emissionController.getLeaderboard);
router.get('/global', emissionController.getGlobalStats);
router.post('/estimate', emissionController.estimateEmission);

module.exports = router;