const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const Candidate = require('../models/Candidate');
const Company = require('../models/Company');
const {
  findAccountByFirebaseUid,
  findAccountByPhone,
  findAccountByEmailForRole,
} = require('../utils/findAccountByEmail');
const { verifyFirebaseToken, mapSignInProvider } = require('../utils/verifyFirebaseToken');
const { issueTokenPair } = require('../services/jwtService');
const jwtConfig = require('../config/jwt');
const MESSAGES = require('../constants/messages');

const setRefreshCookie = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, jwtConfig.cookieOptions);
};

const respondWithSession = (res, statusCode, account, message) => {
  const { accessToken, refreshToken } = issueTokenPair(account);
  setRefreshCookie(res, refreshToken);
  return new ApiResponse(statusCode, { user: account.toSafeObject(), accessToken }, message).send(res);
};

/**
 * Finds an existing document for this role by, in order: firebaseUid (the
 * durable link once established), then email, then phone. Both frontend
 * login and register buttons hit the same endpoint — whichever one matches
 * decides whether this is a "log an existing account in (and link Firebase
 * if not linked yet)" or a "create a new account" flow.
 */
const findExistingAccount = async (role, decoded) => {
  const byUid = await findAccountByFirebaseUid(role, decoded.uid);
  if (byUid) return byUid;

  if (decoded.email) {
    const byEmail = await findAccountByEmailForRole(role, decoded.email);
    if (byEmail) return byEmail;
  }

  if (decoded.phone_number) {
    const byPhone = await findAccountByPhone(role, decoded.phone_number);
    if (byPhone) return byPhone;
  }

  return null;
};

/**
 * Links Firebase identity onto an existing local (or previously-linked)
 * account and logs it in. Backfills email/phone if Firebase has one the
 * record doesn't, so e.g. a phone-only signup that later verifies email via
 * Google keeps a single, richer account rather than a duplicate.
 */
const linkAndLogin = async (res, account, decoded, provider) => {
  let changed = false;

  if (!account.firebaseUid) {
    account.firebaseUid = decoded.uid;
    account.authProvider = provider;
    changed = true;
  }
  if (!account.email && decoded.email) {
    account.email = decoded.email;
    changed = true;
  }
  if (!account.phone && decoded.phone_number) {
    account.phone = decoded.phone_number;
    changed = true;
  }
  if ((decoded.email_verified || provider === 'phone') && !account.isVerified) {
    account.isVerified = true;
    changed = true;
  }

  account.lastLogin = new Date();
  changed = true;

  if (changed) await account.save({ validateBeforeSave: false });

  return respondWithSession(res, 200, account, MESSAGES.AUTH.LOGIN_SUCCESS);
};

/**
 * POST /api/v1/auth/candidate/firebase
 * POST /api/v1/auth/company/firebase
 * Body: { idToken, ...role-specific extra fields used only on first sign-in }
 *   candidate first sign-in needs: hourlyRate
 *   company first sign-in needs:   companyName
 */
const firebaseAuthForSelfServeRole = (role, Model, buildNewDoc) =>
  asyncHandler(async (req, res) => {
    const decoded = await verifyFirebaseToken(req.body.idToken);
    const provider = mapSignInProvider(decoded);

    const existing = await findExistingAccount(role, decoded);
    if (existing) {
      return linkAndLogin(res, existing, decoded, provider);
    }

    // No matching account. The Login pages send createIfMissing: false so
    // "log in with Google" on a page that isn't Register never silently
    // creates a new account — it fails clearly and tells the person to
    // register instead. The Register page omits the flag (defaults true).
    if (req.body.createIfMissing === false) {
      throw ApiError.unauthorized(MESSAGES.AUTH.FIREBASE_ACCOUNT_NOT_FOUND);
    }

    const doc = await Model.create(buildNewDoc(decoded, req.body, provider));
    return respondWithSession(res, 201, doc, MESSAGES.AUTH.REGISTER_SUCCESS);
  });

const firebaseAuthCandidate = firebaseAuthForSelfServeRole('candidate', Candidate, (decoded, body, provider) => {
  // Unlike the classic local register form, Google/Phone/Email-link sign-up
  // doesn't force the hourly-rate field first — the dashboard prompts for
  // it right after login if it's still missing (see HourlyRatePrompt.jsx /
  // candidateController.updateMyProfile). This keeps "continue with Google"
  // a true one-click flow instead of erroring out when the field is empty.
  const hasHourlyRate = body.hourlyRate !== undefined && body.hourlyRate !== null && body.hourlyRate !== '';
  let hourlyRate = null;
  if (hasHourlyRate) {
    const parsed = Number(body.hourlyRate);
    if (Number.isNaN(parsed) || parsed < 0) {
      throw ApiError.badRequest(MESSAGES.AUTH.FIREBASE_MISSING_HOURLY_RATE);
    }
    hourlyRate = parsed;
  }
  return {
    name: decoded.name || body.name || 'New Engineer',
    email: decoded.email || body.email || undefined,
    phone: decoded.phone_number || body.phone || undefined,
    profileImage: decoded.picture || '',
    firebaseUid: decoded.uid,
    authProvider: provider,
    isVerified: Boolean(decoded.email_verified) || provider === 'phone',
    hourlyRate,
  };
});

const firebaseAuthCompany = firebaseAuthForSelfServeRole('company', Company, (decoded, body, provider) => {
  if (!body.companyName || !body.companyName.trim()) {
    throw ApiError.badRequest(MESSAGES.AUTH.FIREBASE_MISSING_COMPANY_NAME);
  }
  return {
    name: decoded.name || body.name || 'New Company Contact',
    email: decoded.email || body.email || undefined,
    phone: decoded.phone_number || body.phone || undefined,
    firebaseUid: decoded.uid,
    authProvider: provider,
    isVerified: Boolean(decoded.email_verified) || provider === 'phone',
    companyName: body.companyName.trim(),
  };
});

/**
 * POST /api/v1/auth/admin/firebase
 * Admins are never created here — only linked/logged in. See models/Admin.js:
 * the first admin account always comes from the seed script / direct DB
 * insert, and its email or phone must already match the Firebase identity
 * for this to succeed.
 */
const firebaseAuthAdmin = asyncHandler(async (req, res) => {
  const decoded = await verifyFirebaseToken(req.body.idToken);
  const provider = mapSignInProvider(decoded);

  const existing = await findExistingAccount('admin', decoded);
  if (!existing) {
    throw ApiError.forbidden(MESSAGES.AUTH.FIREBASE_ADMIN_NOT_PROVISIONED);
  }

  return linkAndLogin(res, existing, decoded, provider);
});

module.exports = { firebaseAuthCandidate, firebaseAuthCompany, firebaseAuthAdmin };
