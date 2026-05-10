const User = require('../models/User');
const { config } = require('./env');

/**
 * Seed (or refresh) the master admin from env vars.
 *
 * Idempotent: safe to call on every boot.
 *  - First boot with vars set  → creates the master admin.
 *  - Existing master, password unchanged in env → no-op.
 *  - Existing master, password changed in env  → password updated.
 *
 * Skipped silently if ADMIN_EMAIL or ADMIN_PASSWORD are not set, so the
 * server still boots without admin features in dev. The admin login flow
 * simply won't work until the env vars are set.
 */
const seedMasterAdmin = async () => {
  const email = (config.adminEmail || '').trim().toLowerCase();
  const password = config.adminPassword;

  if (!email || !password) {
    console.warn('⚠️  ADMIN_EMAIL / ADMIN_PASSWORD not set — master admin not seeded.');
    return;
  }

  const existing = await User.findOne({ email }).select('+password');

  if (!existing) {
    // Create — User pre-save hook bcrypts the password.
    const admin = await User.create({
      name: config.adminName,
      email,
      password,
      role: 'admin_master',
      emailVerified: true,
      isActive: true,
    });
    console.log(`👑 Master admin created: ${admin.email}`);
    return;
  }

  // If the user exists but isn't a master, promote them. This is intentional —
  // makes recovery from a misconfigured DB simple.
  let dirty = false;
  if (existing.role !== 'admin_master') {
    existing.role = 'admin_master';
    dirty = true;
  }
  if (existing.isBlocked) {
    existing.isBlocked = false;
    existing.blockedAt = null;
    dirty = true;
  }
  if (!existing.emailVerified) {
    existing.emailVerified = true;
    dirty = true;
  }

  // If env password no longer matches what's in the DB, rotate it. Compare
  // against the bcrypt hash via the model's compare method.
  const passwordMatches = await existing.comparePassword(password);
  if (!passwordMatches) {
    existing.password = password;  // pre-save hook will hash
    dirty = true;
    console.log(`🔑 Master admin password rotated from env`);
  }

  if (dirty) {
    await existing.save();
    console.log(`👑 Master admin synced: ${existing.email}`);
  } else {
    console.log(`👑 Master admin already in sync: ${existing.email}`);
  }
};

module.exports = { seedMasterAdmin };
