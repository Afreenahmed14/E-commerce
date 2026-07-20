import api from './api';

export const applicationService = {
  apply: (jobId, coverLetter) => api.post('/applications', { jobId, coverLetter }).then((r) => r.data),
  getMine: () => api.get('/applications/me').then((r) => r.data),
  withdraw: (id) => api.delete(`/applications/${id}`).then((r) => r.data),
  getForJob: (jobId) => api.get(`/applications/job/${jobId}`).then((r) => r.data),
  updateStatus: (id, status) => api.patch(`/applications/${id}/status`, { status }).then((r) => r.data),
};
