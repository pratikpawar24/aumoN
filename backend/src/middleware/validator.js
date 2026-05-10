const { body, query, param, validationResult } = require('express-validator');

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

const registerValidation = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('mobile')
    .optional({ values: 'falsy' })
    .matches(/^(\+?\d{1,3}[\s-]?)?\d{10}$/)
    .withMessage('Mobile must be a valid 10-digit number'),
  body('vehicleType')
    .optional()
    .isIn(['car', 'electric', 'bus', 'bike', 'walk', 'motorcycle'])
    .withMessage('Invalid vehicle type'),
  handleValidation,
];

const verifyEmailValidation = [
  body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be 6 digits'),
  handleValidation,
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidation,
];

const routeValidation = [
  body('origin.lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid origin latitude'),
  body('origin.lng').isFloat({ min: -180, max: 180 }).withMessage('Invalid origin longitude'),
  body('destination.lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid destination latitude'),
  body('destination.lng').isFloat({ min: -180, max: 180 }).withMessage('Invalid destination longitude'),
  body('vehicleType')
    .optional()
    .isIn(['car', 'electric', 'bus', 'bike', 'walk', 'motorcycle'])
    .withMessage('Invalid vehicle type'),
  body('optimizeFor')
    .optional()
    .isIn(['carbon', 'time', 'distance', 'balanced'])
    .withMessage('Invalid optimization profile'),
  handleValidation,
];

const carpoolValidation = [
  body('pickup.lat').isFloat({ min: -90, max: 90 }),
  body('pickup.lng').isFloat({ min: -180, max: 180 }),
  body('dropoff.lat').isFloat({ min: -90, max: 90 }),
  body('dropoff.lng').isFloat({ min: -180, max: 180 }),
  body('departureTime').notEmpty().withMessage('Departure time required'),
  handleValidation,
];

const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  handleValidation,
];

module.exports = {
  registerValidation,
  loginValidation,
  verifyEmailValidation,
  routeValidation,
  carpoolValidation,
  paginationValidation,
  handleValidation,
};