const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { verifyAccessToken } = require('../services/jwtService');
const { getModelForRole } = require('../utils/findAccountByEmail');
const MESSAGES = require('../constants/messages');
const { USER_STATUS } = require('../constants/status');

/**
 * Verifies the Bearer access token, resolves which collection
 * (Candidate/Company/Admin) the token's role points to, loads that
 * account, and attaches it to req.user. Rejects suspended/deleted
 * accounts even with a valid token.
 */
const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized(MESSAGES.AUTH.UNAUTHORIZED);
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    throw ApiError.unauthorized(MESSAGES.AUTH.TOKEN_INVALID);
  }

  const Model = getModelForRole(decoded.role);
  const user = Model && await Model.findById(decoded.id);
  if (!user) {
    throw ApiError.unauthorized(MESSAGES.AUTH.TOKEN_INVALID);
  }

  if (user.status === USER_STATUS.SUSPENDED || user.status === USER_STATUS.DELETED) {
    throw ApiError.forbidden(MESSAGES.AUTH.ACCOUNT_SUSPENDED);
  }

  req.user = user; // full Mongoose doc (Candidate | Company | Admin)
  next();
});

/**
 * Like `protect`, but does not reject the request if no/invalid token is
 * present — it simply leaves req.user undefined. Used on public routes
 * (e.g. candidate profile view) that behave differently for logged-in
 * companies without requiring authentication.
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
    const Model = getModelForRole(decoded.role);
    const user = Model && await Model.findById(decoded.id);
    if (user && user.status === USER_STATUS.ACTIVE) {
      req.user = user;
    }
  } catch {
    // Invalid/expired token on an optional route — proceed unauthenticated.
  }
  next();
});

module.exports = { protect, optionalAuth };
