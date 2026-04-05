const express = require('express');
const router = express.Router();
const carpoolController = require('../controllers/carpoolController');
const { protect } = require('../middleware/auth');
const { carpoolValidation } = require('../middleware/validator');

router.post('/request', protect, carpoolValidation, carpoolController.createRequest);
router.get('/my-requests', protect, carpoolController.getMyRequests);
router.get('/available', protect, carpoolController.getAvailableRides);
router.get('/history', protect, carpoolController.getCarpoolHistory);
router.get('/match/:id', protect, carpoolController.getMatchDetails);
router.patch('/request/:id/cancel', protect, carpoolController.cancelRequest);

module.exports = router;