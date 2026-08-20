import api from './api';

/**
 * Candidate <-> Project Partner meetings — peer-to-peer scheduling
 * between two candidates who have an active project-partner relationship.
 * Mirrors interviewService's shape, but either side may organize or
 * respond, since neither candidate is a hiring authority over the other.
 */
export const partnerMeetingService = {
  getMine: () => api.get('/partner-meetings/me').then((r) => r.data),
  schedule: (payload) => api.post('/partner-meetings', payload).then((r) => r.data),
  respond: (id, action) => api.patch(`/partner-meetings/${id}/respond`, { action }).then((r) => r.data),
  requestReschedule: (id, proposedAt, note = '') =>
    api.patch(`/partner-meetings/${id}/reschedule`, { proposedAt, note }).then((r) => r.data),
  confirmReschedule: (id, scheduledAt) =>
    api.patch(`/partner-meetings/${id}/reschedule/confirm`, { scheduledAt }).then((r) => r.data),
  cancel: (id) => api.patch(`/partner-meetings/${id}/cancel`).then((r) => r.data),
};
