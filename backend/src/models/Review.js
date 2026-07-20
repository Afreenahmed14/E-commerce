const mongoose = require('mongoose');

/**
 * A review left by either side of a marketplace relationship:
 *  - reviewerType 'company'   → the company reviewing an engineer (candidate)
 *  - reviewerType 'candidate' → the engineer reviewing a company
 *
 * One review per (reviewer, subject) pair — enforced by the compound
 * unique index below.
 */
const reviewSchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    // Who WROTE this review — the other party is who it's ABOUT.
    reviewerType: {
      type: String,
      enum: ['company', 'candidate'],
      required: true,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

reviewSchema.index({ candidateId: 1, companyId: 1, reviewerType: 1 }, { unique: true });
reviewSchema.index({ candidateId: 1, reviewerType: 1 });
reviewSchema.index({ companyId: 1, reviewerType: 1 });

module.exports = mongoose.model('Review', reviewSchema);
