const mongoose = require('mongoose');
const { UNLOCK_STATUS, HIRER_TYPE } = require('../constants/status');

/**
 * Auditable record of every contact-unlock event — the single source of
 * truth for whether a given hirer currently has access to a given
 * Candidate's contact details. Queried on every "view contact" request
 * rather than trusting a cached flag elsewhere.
 *
 * The hirer is either a Company (the usual hiring flow) or another
 * Candidate hiring this one as a project partner — see `hirerType` and
 * `hiringCandidateId`.
 */
const contactUnlockSchema = new mongoose.Schema(
  {
    hirerType: {
      type: String,
      enum: Object.values(HIRER_TYPE),
      required: true,
      default: HIRER_TYPE.COMPANY,
    },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
    // The engineer doing the hiring, when hirerType is 'candidate'.
    hiringCandidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', default: null },
    // The engineer being hired / whose contact was unlocked, in both flows.
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
    unlockDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: Object.values(UNLOCK_STATUS),
      default: UNLOCK_STATUS.ACTIVE,
    },
  },
  { timestamps: true }
);

contactUnlockSchema.pre('validate', function validateHirer(next) {
  if (this.hirerType === HIRER_TYPE.CANDIDATE) {
    if (!this.hiringCandidateId) return next(new Error('hiringCandidateId is required when hirerType is candidate'));
    if (this.hiringCandidateId.toString() === this.candidateId?.toString()) {
      return next(new Error('An engineer cannot hire themselves'));
    }
    this.companyId = null;
  } else {
    if (!this.companyId) return next(new Error('companyId is required when hirerType is company'));
    this.hiringCandidateId = null;
  }
  next();
});

contactUnlockSchema.index(
  { companyId: 1, candidateId: 1 },
  { unique: true, partialFilterExpression: { hirerType: HIRER_TYPE.COMPANY } }
);
contactUnlockSchema.index(
  { hiringCandidateId: 1, candidateId: 1 },
  { unique: true, partialFilterExpression: { hirerType: HIRER_TYPE.CANDIDATE } }
);

module.exports = mongoose.model('ContactUnlock', contactUnlockSchema);
