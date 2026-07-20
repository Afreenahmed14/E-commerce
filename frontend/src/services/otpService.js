import api from './api';

export const otpService = {
  sendPhoneOtp: (phone) => api.post('/otp/phone/send', { phone }).then((r) => r.data),
  verifyPhoneOtp: (phone, code) => api.post('/otp/phone/verify', { phone, code }).then((r) => r.data),
  sendEmailOtp: (email) => api.post('/otp/email/send', { email }).then((r) => r.data),
  verifyEmailOtp: (email, code) => api.post('/otp/email/verify', { email, code }).then((r) => r.data),
};
