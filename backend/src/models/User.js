const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    mobile: {
      type: String,
      trim: true,
      default: '',
      // Accept 10-digit Indian numbers, with optional +country and spaces/dashes.
      // Empty string is allowed so existing users aren't broken on save.
      match: [
        /^$|^(\+?\d{1,3}[\s-]?)?\d{10}$/,
        'Please enter a valid 10-digit mobile number',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    avatar: {
      type: String,
      default: '',
    },
    vehicleType: {
      type: String,
      enum: ['car', 'electric', 'bus', 'bike', 'walk', 'motorcycle'],
      default: 'car',
    },
    homeLocation: {
      address: { type: String, default: '' },
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    workLocation: {
      address: { type: String, default: '' },
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    // Green metrics
    greenScore: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
    totalCO2Saved: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalCO2Emitted: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalTrips: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalDistanceKm: {
      type: Number,
      default: 0,
      min: 0,
    },
    carpoolsJoined: {
      type: Number,
      default: 0,
      min: 0,
    },
    carpoolsOffered: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Preferences
    preferences: {
      optimizeFor: {
        type: String,
        enum: ['carbon', 'time', 'distance', 'balanced'],
        default: 'carbon',
      },
      avoidCongestion: { type: Boolean, default: true },
      maxDetourMinutes: { type: Number, default: 10 },
      genderPreference: {
        type: String,
        enum: ['any', 'male', 'female'],
        default: 'any',
      },
      notifications: {
        carpoolMatch: { type: Boolean, default: true },
        tripComplete: { type: Boolean, default: true },
        weeklyReport: { type: Boolean, default: true },
      },
    },
    // Auth
    emailVerified: { type: Boolean, default: false },
    // Verification audit — set when an admin manually verifies a user, so the
    // admin UI can show who/when/how rather than just a boolean.
    verificationMethod: {
      type: String,
      enum: ['otp', 'admin_manual', null],
      default: null,
    },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    verifiedAt: { type: Date, default: null },
    verificationOtp: { type: String, select: false },
    verificationOtpExpires: { type: Date, select: false },
    verificationLastSentAt: { type: Date, select: false },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date, default: null },
    refreshToken: { type: String, select: false },

    // Roles & moderation
    role: {
      type: String,
      enum: ['user', 'admin_secondary', 'admin_master'],
      default: 'user',
      index: true,
    },
    isBlocked: { type: Boolean, default: false, index: true },
    blockedAt: { type: Date, default: null },
    blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    blockReason: { type: String, default: '' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ greenScore: -1 });
userSchema.index({ totalCO2Saved: -1 });

// Virtual: rank label
userSchema.virtual('greenRank').get(function () {
  const s = this.greenScore;
  if (s >= 80) return 'Eco Champion 🌟';
  if (s >= 60) return 'Green Commuter 🟢';
  if (s >= 40) return 'Eco Aware 🟡';
  return 'Getting Started 🌱';
});

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Update green metrics
userSchema.methods.updateGreenMetrics = async function (tripData) {
  this.totalTrips += 1;
  this.totalDistanceKm += tripData.distanceKm || 0;
  this.totalCO2Emitted += tripData.co2Emitted || 0;
  this.totalCO2Saved += tripData.co2Saved || 0;

  // Honest 0-100 score: lifetime savings ratio against the baseline
  // (saved + emitted). A user who never saves anything gets 0; one
  // who emits zero gets 100. The previous formula `50 + ratio * 50`
  // floored everyone at 50.
  const total = this.totalCO2Emitted + this.totalCO2Saved;
  const ratio = total > 0 ? this.totalCO2Saved / total : 0;
  this.greenScore = Math.round(Math.max(0, Math.min(100, ratio * 100)));

  await this.save();
};

// Remove sensitive fields from JSON
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);