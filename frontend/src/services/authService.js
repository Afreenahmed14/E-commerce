import api from './api';

/**
 * Candidates, companies, and admins each have their own register/login
 * endpoints on the backend (separate collections — no shared users table),
 * so the frontend mirrors that with explicit per-role methods rather than
 * one generic call with a role field.
 */
export const authService = {
  registerCandidate: (payload) => api.post('/auth/candidate/register', payload).then((r) => r.data),
  registerCompany: (payload) => api.post('/auth/company/register', payload).then((r) => r.data),

  loginCandidate: (payload) => api.post('/auth/candidate/login', payload).then((r) => r.data),
  loginCompany: (payload) => api.post('/auth/company/login', payload).then((r) => r.data),
  loginAdmin: (payload) => api.post('/auth/admin/login', payload).then((r) => r.data),

  // Firebase-verified sign-in (Google / Phone OTP / Email magic-link). Same
  // endpoint handles both login and first-time registration on the backend —
  // see firebaseAuthController.js. `extra` only matters on first sign-in:
  // { hourlyRate } for candidate, { companyName } for company.
  firebaseCandidate: (idToken, extra = {}) =>
    api.post('/auth/candidate/firebase', { idToken, ...extra }).then((r) => r.data),
  firebaseCompany: (idToken, extra = {}) =>
    api.post('/auth/company/firebase', { idToken, ...extra }).then((r) => r.data),
  firebaseAdmin: (idToken) =>
    api.post('/auth/admin/firebase', { idToken }).then((r) => r.data),

  logout: () => api.post('/auth/logout').then((r) => r.data),
  getMe: () => api.get('/auth/me').then((r) => r.data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }).then((r) => r.data),
  resetPassword: (payload) => api.post('/auth/reset-password', payload).then((r) => r.data),
};
