const express = require('express');
const router = express.Router();
const carpoolController = require('../controllers/carpoolController');
const bookingController = require('../controllers/bookingController');
const { protect } = require('../middleware/auth');
const { carpoolValidation } = require('../middleware/validator');

router.post('/request', protect, carpoolValidation, carpoolController.createRequest);
router.get('/my-requests', protect, carpoolController.getMyRequests);
router.get('/available', protect, carpoolController.getAvailableRides);
router.get('/history', protect, carpoolController.getCarpoolHistory);
router.get('/match/:id', protect, carpoolController.getMatchDetails);
router.patch('/request/:id/cancel', protect, carpoolController.cancelRequest);

// Two-sided seat booking
router.post('/rides/:rideId/book', protect, bookingController.createBooking);
router.get('/bookings', protect, bookingController.listMyBookings);
router.patch('/bookings/:id/confirm', protect, bookingController.confirmBooking);
router.patch('/bookings/:id/decline', protect, bookingController.declineBooking);
router.patch('/bookings/:id/cancel', protect, bookingController.cancelBooking);

module.exports = router;
