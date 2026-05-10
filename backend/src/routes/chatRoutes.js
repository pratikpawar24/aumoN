const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

router.get('/:rideId/messages', protect, chatController.listMessages);
router.post('/:rideId/messages', protect, chatController.sendMessage);

module.exports = router;
