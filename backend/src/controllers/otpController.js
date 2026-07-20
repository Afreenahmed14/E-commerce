const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const Otp = require('../models/Otp');
const { VERIFICATION_STATUS } = require('../constants/status');
const {
  generateCode, getExpiry, sendSms, sendEmail, OTP_TTL_MINUTES,
} = require('../services/otpService');

const roleModelName = (role) => (role === 'candidate' ? 'Candidate' : 'Company');
const isProd = () => process.env.NODE_ENV === 'production';

/**
 * Once both phone and email are OTP-verified, the profile earns the
 * "Verified" badge automatically — this is separate from (and in addition
 * to) the manual document-verification flow admins run via the
 * Verification model. Only promotes unverified/pending profiles; never
 * downgrades a rejected one.
 */
const promoteVerificationIfEligible = async (user) => {
  if (
    user.phoneVerified
    && user.emailVerified
    && user.verificationStatus !== VERIFICATION_STATUS.VERIFIED
    && user.verificationStatus !== VERIFICATION_STATUS.REJECTED
  ) {
    user.verificationStatus = VERIFICATION_STATUS.VERIFIED;
  }
};

/**
 * POST /api/v1/otp/phone/send  { phone }
 * Verification is available to any logged-in candidate/company account,
 * regardless of plan.
 */
const sendPhoneOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  if (!phone) throw ApiError.badRequest('Phone number is required');

  const code = generateCode();
  await Otp.create({
    profileId: req.user._id,
    role: roleModelName(req.user.role),
    target: 'phone',
    destination: phone,
    code,
    expiresAt: getExpiry(),
  });

  await sendSms(phone, code);

  return new ApiResponse(
    200,
    { expiresInMinutes: OTP_TTL_MINUTES, ...(isProd() ? {} : { devOtp: code }) },
    'OTP sent to your phone'
  ).send(res);
});

/** POST /api/v1/otp/phone/verify  { phone, code } */
const verifyPhoneOtp = asyncHandler(async (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) throw ApiError.badRequest('Phone number and code are required');

  const otp = await Otp.findOne({
    profileId: req.user._id, target: 'phone', destination: phone, verified: false,
  }).sort('-createdAt');

  if (!otp || otp.expiresAt < new Date()) {
    throw ApiError.badRequest('OTP expired or not found. Please request a new one.');
  }
  if (otp.code !== code) {
    otp.attempts += 1;
    await otp.save();
    throw ApiError.badRequest('Incorrect OTP');
  }

  otp.verified = true;
  await otp.save();

  req.user.phone = phone;
  req.user.phoneVerified = true;
  await promoteVerificationIfEligible(req.user);
  await req.user.save();

  return new ApiResponse(200, { phoneVerified: true, verificationStatus: req.user.verificationStatus }, 'Phone number verified').send(res);
});

/** POST /api/v1/otp/email/send  { email } */
const sendEmailOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw ApiError.badRequest('Email is required');

  const code = generateCode();
  await Otp.create({
    profileId: req.user._id,
    role: roleModelName(req.user.role),
    target: 'email',
    destination: email,
    code,
    expiresAt: getExpiry(),
  });

  await sendEmail(email, code);

  return new ApiResponse(
    200,
    { expiresInMinutes: OTP_TTL_MINUTES, ...(isProd() ? {} : { devOtp: code }) },
    'OTP sent to your email'
  ).send(res);
});

/** POST /api/v1/otp/email/verify  { email, code } */
const verifyEmailOtp = asyncHandler(async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) throw ApiError.badRequest('Email and code are required');

  const otp = await Otp.findOne({
    profileId: req.user._id, target: 'email', destination: email, verified: false,
  }).sort('-createdAt');

  if (!otp || otp.expiresAt < new Date()) {
    throw ApiError.badRequest('OTP expired or not found. Please request a new one.');
  }
  if (otp.code !== code) {
    otp.attempts += 1;
    await otp.save();
    throw ApiError.badRequest('Incorrect OTP');
  }

  otp.verified = true;
  await otp.save();

  req.user.email = email;
  req.user.emailVerified = true;
  await promoteVerificationIfEligible(req.user);
  await req.user.save();

  return new ApiResponse(200, { emailVerified: true, verificationStatus: req.user.verificationStatus }, 'Email verified').send(res);
});

module.exports = {
  sendPhoneOtp, verifyPhoneOtp, sendEmailOtp, verifyEmailOtp,
};
