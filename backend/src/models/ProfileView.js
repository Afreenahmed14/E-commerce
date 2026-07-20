const mongoose = require('mongoose');

/**
 * One row per (candidate, viewer) pair — updated on every profile view.
 * `lastNotifiedAt` lets candidateController#getCandidateById throttle the
 * "someone viewed your profile" notification so a viewer refreshing the
 * page repeatedly doesn't spam the candidate; a fresh notification only
 * goes out once the throttle window (see PROFILE_VIEW_NOTIFY_COOLDOWN_MS)
 * has passed since the last one for that same viewer.
 */
const profileViewSchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
    viewerId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'viewerModel' },
    viewerModel: { type: String, enum: ['Candidate', 'Company'], required: true },
    lastViewedAt: { type: Date, default: Date.now },
    lastNotifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

profileViewSchema.index({ candidateId: 1, viewerId: 1, viewerModel: 1 }, { unique: true });

module.exports = mongoose.model('ProfileView', profileViewSchema);
