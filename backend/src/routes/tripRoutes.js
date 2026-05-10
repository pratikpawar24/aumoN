const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');
const { protect } = require('../middleware/auth');

router.get('/active', protect, tripController.getActiveTrip);
router.post('/start', protect, tripController.startTrip);
router.patch('/:id/waypoint', protect, tripController.appendWaypoint);
router.post('/:id/end', protect, tripController.endTrip);

module.exports = router;
