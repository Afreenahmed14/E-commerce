import api from './api';

export const reviewService = {
  getForCandidate: (candidateId) => api.get(`/reviews/candidate/${candidateId}`).then((r) => r.data),
  getForCompany: (companyId) => api.get(`/reviews/company/${companyId}`).then((r) => r.data),
  create: (payload) => api.post('/reviews', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/reviews/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/reviews/${id}`).then((r) => r.data),
};
