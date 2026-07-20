/**
 * Canonical role identifiers used across auth, middleware, and models.
 * Keeping these as constants avoids typo-prone magic strings.
 */
module.exports = {
  ADMIN: 'admin',
  CANDIDATE: 'candidate',
  COMPANY: 'company',
  ALL: ['admin', 'candidate', 'company'],
};
