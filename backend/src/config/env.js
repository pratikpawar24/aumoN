const required = [
  'MONGODB_URI',
  'JWT_SECRET',
];

const optional = [
  'AI_SERVICE_URL',
  'FRONTEND_URL',
  'ORS_API_KEY',
  'PORT',
  'NODE_ENV',
  // Phase 1 additions — feature-flagged: app boots without these
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'EMAIL_FROM',
  'BREVO_API_KEY',
  'BREVO_SENDER_EMAIL',
  'BREVO_SENDER_NAME',
  'CLOUDINARY_URL',
  // Phase 2
  'TOMTOM_API_KEY',
  // Phase 4 — master admin seeding
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
  'ADMIN_NAME',
  // Phase 7
  'OPENWEATHER_API_KEY',
  'TOLLGURU_API_KEY',
];

const validateEnv = () => {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  optional.forEach((key) => {
    if (!process.env[key]) {
      console.warn(`⚠️  Optional env var not set: ${key}`);
    }
  });

  console.log('✅ Environment variables validated');
};

const config = {
  port: parseInt(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:7860',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  orsApiKey: process.env.ORS_API_KEY || '',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'AUMO <no-reply@aumo.app>',
  },

  brevoApiKey: process.env.BREVO_API_KEY || '',
  // Verified Brevo sender. BREVO_SENDER_EMAIL must match a sender verified in
  // the Brevo dashboard (e.g. admin.aumo@gmail.com) or Brevo rejects the send.
  brevoSenderEmail: process.env.BREVO_SENDER_EMAIL || '',
  brevoSenderName: process.env.BREVO_SENDER_NAME || 'AumoN Team',

  // OTP tuning (used by the email verification flow).
  otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES) || 10,
  otpLength: parseInt(process.env.OTP_LENGTH) || 6,
  cloudinaryUrl: process.env.CLOUDINARY_URL || '',

  tomtomApiKey: process.env.TOMTOM_API_KEY || '',

  adminEmail: process.env.ADMIN_EMAIL || '',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  adminName: process.env.ADMIN_NAME || 'AumoN Master Admin',

  openWeatherApiKey: process.env.OPENWEATHER_API_KEY || '',
  tollGuruApiKey: process.env.TOLLGURU_API_KEY || '',
};

module.exports = { validateEnv, config };
