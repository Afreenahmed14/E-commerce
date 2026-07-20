const mongoose = require('mongoose');
const authFieldsPlugin = require('./plugins/authFields');
const { VERIFICATION_STATUS } = require('../constants/status');

/**
 * Company document — owns both its login credentials and its profile data,
 * mirroring the same self-contained pattern as Candidate. See Candidate.js
 * for the rationale on why this is split from a shared `users` collection.
 */
const companySchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, trim: true, maxlength: 150 },
    logo: { type: String, default: '' },
    website: { type: String, trim: true, default: '' },
    industry: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, maxlength: 2000 },
    contactPerson: {
      name: { type: String, trim: true },
      designation: { type: String, trim: true },
      phone: { type: String, trim: true },
    },
    location: {
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      country: { type: String, trim: true },
    },
    gstNumber: { type: String, trim: true, default: '' },
    // Mirrors Candidate.rating/reviewsCount — companies can now be reviewed
    // by engineers after a completed, paid engagement (bidirectional reviews).
    rating: { type: Number, default: 4, min: 0, max: 5 },
    reviewsCount: { type: Number, default: 0, min: 0 },
    verificationStatus: {
      type: String,
      enum: Object.values(VERIFICATION_STATUS),
      default: VERIFICATION_STATUS.UNVERIFIED,
    },
    bookmarkedCandidates: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' },
    ],
  },
  { timestamps: true }
);

companySchema.plugin(authFieldsPlugin, { role: 'company' });

companySchema.index({ companyName: 'text' });

module.exports = mongoose.model('Company', companySchema);
