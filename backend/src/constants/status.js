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
};
