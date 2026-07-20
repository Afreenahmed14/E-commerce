/**
 * OTP generation + "sending". No real SMS/Email provider is wired up yet —
 * sendSms/sendEmail just log the code server-side, and the code is also
 * returned in the API response (only when NODE_ENV !== 'production') so
 * the flow is fully testable end-to-end today. To go live with a real
 * provider, replace the bodies of sendSms/sendEmail with e.g. Twilio /
 * SendGrid calls and stop returning `devOtp` from otpController.
 */
const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 10;

const generateCode = () => String(Math.floor(Math.random() * 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0');

const getExpiry = () => new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

/** Mock SMS sender — replace with a real provider (Twilio, MSG91, etc). */
const sendSms = async (phone, code) => {
  console.log(`[OTP][mock-sms] ${phone} -> ${code}`);
  return true;
};

/** Mock email sender — replace with a real provider (SendGrid, SES, etc). */
const sendEmail = async (email, code) => {
  console.log(`[OTP][mock-email] ${email} -> ${code}`);
  return true;
};

module.exports = {
  OTP_TTL_MINUTES,
  generateCode,
  getExpiry,
  sendSms,
  sendEmail,
};
