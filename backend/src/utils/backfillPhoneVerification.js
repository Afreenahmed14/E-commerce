/**
 * One-off backfill: for any Candidate/Company that already has
 * phoneVerified: true (verified before promoteVerificationIfEligible in
 * otpController.js was changed to only require phone, not phone+email),
 * flip verificationStatus to 'verified' — unless it was already 'verified'
 * or an admin explicitly 'rejected' it, which this never overrides.
 *
 * Usage:
 *   node src/utils/backfillPhoneVerification.js
 *
 * Requires MONGO_URI to be set (loaded from .env via dotenv, same as server.js).
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Candidate = require('../models/Candidate');
const Company = require('../models/Company');
const { VERIFICATION_STATUS } = require('../constants/status');

const backfill = async (Model, label) => {
  const result = await Model.updateMany(
    {
      phoneVerified: true,
      verificationStatus: { $nin: [VERIFICATION_STATUS.VERIFIED, VERIFICATION_STATUS.REJECTED] },
    },
    { $set: { verificationStatus: VERIFICATION_STATUS.VERIFIED } }
  );
  console.log(`${label}: matched ${result.matchedCount}, updated ${result.modifiedCount}`);
};

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  await backfill(Candidate, 'Candidates');
  await backfill(Company, 'Companies');

  await mongoose.disconnect();
  console.log('Done.');
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
