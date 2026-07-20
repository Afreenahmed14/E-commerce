const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const Candidate = require('../models/Candidate');
const Company = require('../models/Company');
const Admin = require('../models/Admin');
const { findAccountByEmail, getModelForRole } = require('../utils/findAccountByEmail');
const { issueTokenPair, verifyRefreshToken } = require('../services/jwtService');
const jwtConfig = require('../config/jwt');
const MESSAGES = require('../constants/messages');

/**
 * Sets the refresh token as an httpOnly cookie scoped to /api/v1/auth.
 */
const setRefreshCookie = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, jwtConfig.cookieOptions);
};

/**
 * Shared registration logic for the two public-facing roles. Candidates and
 * Companies are separate collections (see models/Candidate.js), so each
 * gets its own endpoint and its own document shape — but the token-issuing
 * mechanics are identical, so that part is factored out here.
 */
const registerAs = (Model, buildDoc) =>
  asyncHandler(async (req, res) => {
    const existing = await findAccountByEmail(req.body.email);
    if (existing) throw ApiError.conflict(MESSAGES.AUTH.EMAIL_IN_USE);

    const doc = await Model.create(buildDoc(req.body));
    const { accessToken, refreshToken } = issueTokenPair(doc);
    setRefreshCookie(res, refreshToken);

    return new ApiResponse(
      201,
      { user: doc.toSafeObject(), accessToken },
      MESSAGES.AUTH.REGISTER_SUCCESS
    ).send(res);
  });

/**
 * POST /api/v1/auth/candidate/register
 */
const registerCandidate = registerAs(Candidate, (body) => ({
  name: body.name,
  email: body.email,
  phone: body.phone || undefined,
  password: body.password,
  hourlyRate: body.hourlyRate || 0,
}));

/**
 * POST /api/v1/auth/company/register
 */
const registerCompany = registerAs(Company, (body) => ({
  name: body.name,
  email: body.email,
  phone: body.phone || undefined,
  password: body.password,
  companyName: body.companyName || body.name,
}));

/**
 * Shared login logic for a specific role's collection.
 */
const loginAs = (Model) =>
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const account = await Model.findOne({ email }).select('+password');
    if (!account || !(await account.comparePassword(password))) {
      throw ApiError.unauthorized(MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    account.lastLogin = new Date();
    await account.save();

    const { accessToken, refreshToken } = issueTokenPair(account);
    setRefreshCookie(res, refreshToken);

    return new ApiResponse(
      200,
      { user: account.toSafeObject(), accessToken },
      MESSAGES.AUTH.LOGIN_SUCCESS
    ).send(res);
  });

const loginCandidate = loginAs(Candidate);
const loginCompany = loginAs(Company);
const loginAdmin = loginAs(Admin);

/**
 * POST /api/v1/auth/logout
 * Bumps tokenVersion on whichever collection req.user came from, then
 * clears the refresh cookie.
 */
const logout = asyncHandler(async (req, res) => {
  if (req.user) {
    req.user.tokenVersion += 1;
    await req.user.save();
  }
  res.clearCookie('refreshToken', { path: '/api/v1/auth' });
  return new ApiResponse(200, null, MESSAGES.AUTH.LOGOUT_SUCCESS).send(res);
});

/**
 * POST /api/v1/auth/refresh
 * The refresh token's payload carries `role`, so we know which collection
 * to re-fetch the account from without needing a shared users table.
 */
const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) throw ApiError.unauthorized(MESSAGES.AUTH.TOKEN_INVALID);

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized(MESSAGES.AUTH.TOKEN_INVALID);
  }

  const Model = getModelForRole(decoded.role);
  const account = Model && await Model.findById(decoded.id);
  if (!account || account.tokenVersion !== decoded.tokenVersion) {
    throw ApiError.unauthorized(MESSAGES.AUTH.TOKEN_INVALID);
  }

  const { accessToken, refreshToken } = issueTokenPair(account);
  setRefreshCookie(res, refreshToken);

  return new ApiResponse(200, { accessToken }, 'Token refreshed').send(res);
});

/**
 * GET /api/v1/auth/me
 */
const getMe = asyncHandler(async (req, res) => {
  return new ApiResponse(200, { user: req.user.toSafeObject() }, 'Current user').send(res);
});

/**
 * POST /api/v1/auth/forgot-password
 * Looks the email up across all three collections since there's no shared
 * users table to query in one go.
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const account = await findAccountByEmail(email);

  const genericResponse = new ApiResponse(
    200,
    null,
    'If an account with that email exists, a reset link has been sent'
  );

  if (!account) return genericResponse.send(res);

  const resetToken = crypto.randomBytes(32).toString('hex');
  account.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  account.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  await account.save({ validateBeforeSave: false });

  // TODO (infra): send `resetToken` via transactional email service.

  return genericResponse.send(res);
});

/**
 * POST /api/v1/auth/reset-password
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const [Candidates, Companies, Admins] = await Promise.all([
    Candidate.findOne({ resetPasswordToken: hashedToken, resetPasswordExpires: { $gt: Date.now() } })
      .select('+resetPasswordToken +resetPasswordExpires +password'),
    Company.findOne({ resetPasswordToken: hashedToken, resetPasswordExpires: { $gt: Date.now() } })
      .select('+resetPasswordToken +resetPasswordExpires +password'),
    Admin.findOne({ resetPasswordToken: hashedToken, resetPasswordExpires: { $gt: Date.now() } })
      .select('+resetPasswordToken +resetPasswordExpires +password'),
  ]);

  const account = Candidates || Companies || Admins;
  if (!account) throw ApiError.badRequest('Reset token is invalid or has expired');

  account.password = password;
  account.resetPasswordToken = undefined;
  account.resetPasswordExpires = undefined;
  account.tokenVersion += 1;
  await account.save();

  return new ApiResponse(200, null, 'Password has been reset successfully').send(res);
});

module.exports = {
  registerCandidate,
  registerCompany,
  loginCandidate,
  loginCompany,
  loginAdmin,
  logout,
  refresh,
  getMe,
  forgotPassword,
  resetPassword,
};
