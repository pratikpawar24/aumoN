const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const emailService = require('../services/emailService');
const uploadService = require('../services/uploadService');

const OTP_TTL_MS = 10 * 60 * 1000;            // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000;         // 1 minute between sends

const issueOtpForUser = async (user) => {
  const otp = emailService.generateOtp();
  user.verificationOtp = otp;
  user.verificationOtpExpires = new Date(Date.now() + OTP_TTL_MS);
  user.verificationLastSentAt = new Date();
  await user.save({ validateBeforeSave: false });
  await emailService.sendVerificationOtp({ to: user.email, name: user.name, otp });
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, mobile, vehicleType } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const user = await User.create({
      name,
      email,
      password,
      mobile: mobile || '',
      vehicleType: vehicleType || 'car',
    });

    // Send verification OTP. We don't fail registration if email delivery fails —
    // user can request a resend from the verification screen.
    try {
      await issueOtpForUser(user);
    } catch (e) {
      console.error('Failed to send verification email on register:', e.message);
    }

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Registration successful! Check your email for a verification code.',
      token,
      user: user.toSafeObject(),
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);
    res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: user.toSafeObject(),
    });
  } catch (err) {
    next(err);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const allowedFields = [
      'name', 'mobile', 'vehicleType', 'homeLocation', 'workLocation', 'preferences', 'avatar',
    ];
    const updates = {};
    allowedFields.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    // If password change
    if (req.body.newPassword) {
      const user = await User.findById(req.user._id).select('+password');
      if (!(await user.comparePassword(req.body.currentPassword))) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
      }
      user.password = req.body.newPassword;
      Object.assign(user, updates);
      await user.save();
      return res.json({ success: true, user: user.toSafeObject() });
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true, runValidators: true,
    });
    res.json({ success: true, user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

exports.deleteAccount = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { isActive: false });
    res.json({ success: true, message: 'Account deactivated.' });
  } catch (err) {
    next(err);
  }
};

exports.verifyToken = async (req, res) => {
  res.json({ success: true, user: req.user.toSafeObject() });
};

// ── Email verification ─────────────────────────────────────────────────────
exports.sendVerification = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select(
      '+verificationOtp +verificationOtpExpires +verificationLastSentAt'
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (user.emailVerified) {
      return res.json({ success: true, alreadyVerified: true, message: 'Email is already verified.' });
    }

    if (
      user.verificationLastSentAt &&
      Date.now() - user.verificationLastSentAt.getTime() < RESEND_COOLDOWN_MS
    ) {
      const waitSec = Math.ceil(
        (RESEND_COOLDOWN_MS - (Date.now() - user.verificationLastSentAt.getTime())) / 1000
      );
      return res.status(429).json({
        success: false,
        message: `Please wait ${waitSec}s before requesting another code.`,
        retryAfter: waitSec,
      });
    }

    try {
      await issueOtpForUser(user);
    } catch (mailErr) {
      // Surface the actual provider error to the client so they can see
      // why delivery failed (bad SMTP creds, unverified sender, etc).
      return res.status(502).json({
        success: false,
        message: `Could not send verification email: ${mailErr.message}`,
        code: 'EMAIL_SEND_FAILED',
      });
    }
    res.json({
      success: true,
      message: 'Verification code sent.',
      devFallback: !emailService.isConfigured(),
    });
  } catch (err) {
    next(err);
  }
};

exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image uploaded.' });
    }
    const { url } = await uploadService.uploadAvatar({
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      userId: req.user._id,
    });
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: url },
      { new: true, runValidators: true }
    );
    res.json({ success: true, avatarUrl: url, user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

exports.verifyEmail = async (req, res, next) => {
  try {
    const { otp } = req.body;
    const user = await User.findById(req.user._id).select(
      '+verificationOtp +verificationOtpExpires'
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (user.emailVerified) {
      return res.json({ success: true, alreadyVerified: true, user: user.toSafeObject() });
    }

    if (!user.verificationOtp || !user.verificationOtpExpires) {
      return res.status(400).json({
        success: false,
        message: 'No verification code on record. Request a new one.',
      });
    }

    if (user.verificationOtpExpires.getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'Verification code expired. Request a new one.',
        code: 'OTP_EXPIRED',
      });
    }

    if (user.verificationOtp !== String(otp)) {
      return res.status(400).json({ success: false, message: 'Incorrect verification code.' });
    }

    user.emailVerified = true;
    user.verificationOtp = undefined;
    user.verificationOtpExpires = undefined;
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, message: 'Email verified.', user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};