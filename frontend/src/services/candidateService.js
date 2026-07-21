import api from './api';

export const candidateService = {
  search: (params) => api.get('/candidates/search', { params }).then((r) => r.data),
  getById: (id) => api.get(`/candidates/${id}`, { suppressAuthRedirect: true }).then((r) => r.data),
  getMyProfile: () => api.get('/candidates/me/profile').then((r) => r.data),
  updateMyProfile: (payload) => api.put('/candidates/me/profile', payload).then((r) => r.data),
  deleteMyProfile: () => api.delete('/candidates/me/profile').then((r) => r.data),
  uploadResume: (file) => {
    const formData = new FormData();
    formData.append('resume', file);
    return api.post('/candidates/me/resume', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/candidates/me/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
  // Hire Now (company) / Get Project Partner (candidate) — role-aware on
  // the backend, so the same call works for both dashboards.
  hire: (candidateId) => api.post(`/candidates/${candidateId}/hire`).then((r) => r.data),
  // Candidate dashboard: companies/candidates who have hired ME.
  getHiredBy: () => api.get('/candidates/me/hired-by').then((r) => r.data),
  // Candidate dashboard: fellow engineers I've hired as project partners.
  getMyProjectPartners: () => api.get('/candidates/me/project-partners').then((r) => r.data),
};
