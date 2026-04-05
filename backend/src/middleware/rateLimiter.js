const rateLimit = require('express-rate-limit');

const createLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    message: { success: false, message },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.ip === '127.0.0.1' && process.env.NODE_ENV === 'development',
  });

// General API limiter
const apiLimiter = createLimiter(
  15 * 60 * 1000,   // 15 minutes
  200,
  'Too many requests. Please try again in 15 minutes.'
);

// Auth routes - stricter
const authLimiter = createLimiter(
  15 * 60 * 1000,
  20,
  'Too many auth attempts. Please wait 15 minutes.'
);

// Route calculation - moderate
const routeLimiter = createLimiter(
  1 * 60 * 1000,    // 1 minute
  30,
  'Too many route requests. Please slow down.'
);

// Map/geocoding - moderate
const mapLimiter = createLimiter(
  1 * 60 * 1000,
  60,
  'Too many map requests. Please slow down.'
);

module.exports = { apiLimiter, authLimiter, routeLimiter, mapLimiter };