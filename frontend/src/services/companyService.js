import api from './api';

export const companyService = {
  getMyProfile: () => api.get('/companies/me/profile').then((r) => r.data),
  updateMyProfile: (payload) => api.put('/companies/me/profile', payload).then((r) => r.data),
  uploadLogo: (file) => {
    const formData = new FormData();
    formData.append('logo', file);
    return api.post('/companies/me/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
  getBookmarks: () => api.get('/companies/me/bookmarks').then((r) => r.data),
  bookmarkCandidate: (candidateId) => api.post(`/companies/me/bookmarks/${candidateId}`).then((r) => r.data),
  removeBookmark: (candidateId) => api.delete(`/companies/me/bookmarks/${candidateId}`).then((r) => r.data),
};
