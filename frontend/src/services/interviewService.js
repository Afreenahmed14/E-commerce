import api from './api';

/**
 * Feature 9 — Interview management (schedule / accept / reject / reschedule).
 */
export const interviewService = {
  // Candidate-facing
  getMine: () => api.get('/interviews/me').then((r) => r.data),
  respond: (id, action) => api.patch(`/interviews/${id}/respond`, { action }).then((r) => r.data),
  requestReschedule: (id, proposedAt, note = '') =>
    api.patch(`/interviews/${id}/reschedule`, { proposedAt, note }).then((r) => r.data),

  // Company-facing
  getCompany: () => api.get('/interviews/company').then((r) => r.data),
  schedule: (payload) => api.post('/interviews', payload).then((r) => r.data),
  confirmReschedule: (id, scheduledAt) =>
    api.patch(`/interviews/${id}/reschedule/confirm`, { scheduledAt }).then((r) => r.data),
  cancel: (id) => api.patch(`/interviews/${id}/cancel`).then((r) => r.data),
};
