/**
 * One-off script to create (or reset the password of) the Admin account,
 * since there is no public admin-registration endpoint (see
 * routes/authRoutes.js).
 *
 * Usage:
 *   node src/utils/seed.js --name "Jane Admin" --email admin@hourlyrecruit.com --password Str0ngPass123
 *
 * If an admin with that email already exists, this UPDATES its password
 * (and name) instead of failing — safe to re-run any time you're not sure
 * what password is currently set.
 *
 * Requires MONGO_URI to be set (loaded from .env via dotenv, same as server.js).
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const parseArgs = () => {
  const args = process.argv.slice(2);
  const parsed = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    parsed[key] = args[i + 1];
  }
  return parsed;
};

const run = async () => {
  const { name, email, password } = parseArgs();

  if (!name || !email || !password) {
    console.error('Usage: node src/utils/seed.js --name "Admin" --email hourlyadmin@gmail.com --password "hourly@2026"');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('[Seed] Connected to MongoDB');
  console.log(`[Seed] Target database: ${mongoose.connection.name}`);

  const existing = await Admin.findOne({ email }).select('+password');
  if (existing) {
    existing.name = name;
    existing.password = password; // pre-save hook re-hashes since it's modified
    existing.isVerified = true;
    await existing.save();
    console.log(`[Seed] Existing admin updated (password reset): ${existing.email} (${existing._id})`);
  } else {
    const admin = await Admin.create({ name, email, password, isVerified: true });
    console.log(`[Seed] Admin created: ${admin.email} (${admin._id})`);
  }

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('[Seed] Failed:', err.message);
  process.exit(1);
});
