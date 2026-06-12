const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter, otpLimiter } = require('../middleware/rateLimiter');
const {
  registerValidation,
  loginValidation,
  verifyEmailValidation,
} = require('../middleware/validator');
const { handleAvatarUpload } = require('../middleware/upload');

router.post('/register', authLimiter, registerValidation, authController.register);
router.post('/login', authLimiter, loginValidation, authController.login);
router.get('/profile', protect, authController.getProfile);
router.put('/profile', protect, authController.updateProfile);
router.delete('/account', protect, authController.deleteAccount);
router.get('/verify', protect, authController.verifyToken);
router.post('/push-token', protect, authController.savePushToken);

// Email verification
router.post('/send-verification', protect, otpLimiter, authController.sendVerification);
router.post('/verify-email', protect, authLimiter, verifyEmailValidation, authController.verifyEmail);

// Avatar upload (multipart/form-data, field name "avatar")
router.post('/avatar', protect, handleAvatarUpload, authController.uploadAvatar);

module.exports = router;