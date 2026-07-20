const mongoose = require('mongoose');
const { VERIFICATION_STATUS } = require('../constants/status');

/**
 * Tracks admin verification workflow for candidates and companies.
 * `profileId` + `role` together identify the requester, since candidates
 * and companies live in separate collections (see Candidate.js for the
 * rationale). The `verificationStatus` field on Candidate/Company mirrors
 * the latest decision here for fast reads; this collection is the audit trail.
 */
const verificationSchema = new mongoose.Schema(
  {
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'role',
    },
    role: {
      type: String,
      enum: ['Candidate', 'Company'],
      required: true,
    },
    documents: [{ type: String }], // Cloudinary URLs
    status: {
      type: String,
      enum: Object.values(VERIFICATION_STATUS),
      default: VERIFICATION_STATUS.PENDING,
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    reviewNote: { type: String, trim: true, default: '' },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

verificationSchema.index({ status: 1 });

module.exports = mongoose.model('Verification', verificationSchema);
