const mongoose = require('mongoose');

/**
 * A single OTP challenge for phone or email verification. Reachable by
 * any logged-in candidate/company account, on any plan — see otpRoutes.js.
 *
 * A fresh document is created on every "send OTP" call; previous
 * unverified codes for the same target are left in place and simply
 * ignored once superseded (expiresAt naturally makes stale ones unusable).
 */
const otpSchema = new mongoose.Schema(
  {
    profileId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'role' },
    role: { type: String, enum: ['Candidate', 'Company'], required: true },
    target: { type: String, enum: ['phone', 'email'], required: true },
    // The phone number or email address the code was sent to.
    destination: { type: String, required: true, trim: true },
    code: { type: String, required: true },
    verified: { type: Boolean, default: false },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

otpSchema.index({ profileId: 1, target: 1, createdAt: -1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // auto-cleanup

module.exports = mongoose.model('Otp', otpSchema);
