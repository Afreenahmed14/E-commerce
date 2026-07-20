const ApiError = require('../utils/ApiError');
const MESSAGES = require('../constants/messages');

/**
 * Restricts a route to one or more roles. Must run after `protect`.
 * Usage: router.get('/admin/stats', protect, authorize('admin'), handler)
 */
const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized(MESSAGES.AUTH.UNAUTHORIZED));
  }
  if (!allowedRoles.includes(req.user.role)) {
    return next(ApiError.forbidden(MESSAGES.AUTH.FORBIDDEN));
  }
  next();
};

module.exports = authorize;
