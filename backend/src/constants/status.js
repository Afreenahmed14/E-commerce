/**
 * Shared status enums used by users and verification.
 */
module.exports = {
  USER_STATUS: {
    ACTIVE: 'active',
    SUSPENDED: 'suspended',
    PENDING: 'pending',
    DELETED: 'deleted',
  },
  VERIFICATION_STATUS: {
    UNVERIFIED: 'unverified',
    PENDING: 'pending',
    VERIFIED: 'verified',
    REJECTED: 'rejected',
  },
  VISIBILITY: {
    PUBLIC: 'public',
    PRIVATE: 'private',
  },
  // Who did the hiring in a ContactUnlock (hire) record — a Company hiring
  // a Candidate for work, or a Candidate hiring a fellow Candidate as a
  // project partner.
  HIRER_TYPE: {
    COMPANY: 'company',
    CANDIDATE: 'candidate',
  },
  // Whether a hire record still grants the hirer access to the hired
  // candidate's contact details. Revoked is reserved for future
  // admin/moderation use (e.g. fraudulent hire); every hire created today
  // starts (and normally stays) ACTIVE.
  UNLOCK_STATUS: {
    ACTIVE: 'active',
    REVOKED: 'revoked',
  },
};
