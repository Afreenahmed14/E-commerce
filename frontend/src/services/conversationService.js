// import api from './api';

// /**
//  * Feature 4 — Company <-> Candidate realtime chat.
//  */
// export const conversationService = {
//   list: () => api.get('/conversations').then((r) => r.data),
//   // Company caller: start({ candidateId, jobId }) — Candidate caller: start({ companyId, jobId })
//   start: ({ candidateId, companyId, jobId } = {}) =>
//     api.post('/conversations', { candidateId, companyId, jobId }).then((r) => r.data),
//   getMessages: (id) => api.get(`/conversations/${id}/messages`).then((r) => r.data),
//   sendMessage: (id, text) => api.post(`/conversations/${id}/messages`, { text }).then((r) => r.data),
//   markRead: (id) => api.patch(`/conversations/${id}/read`).then((r) => r.data),
//   toggleMute: (id, muted) => api.patch(`/conversations/${id}/mute`, { muted }).then((r) => r.data),
//   delete: (id) => api.delete(`/conversations/${id}`).then((r) => r.data),
//   upload: (id, file) => {
//     const formData = new FormData();
//     formData.append('file', file);
//     return api.post(`/conversations/${id}/upload`, formData, {
//       headers: { 'Content-Type': 'multipart/form-data' },
//     }).then((r) => r.data);
//   },
// };
import api from './api';

/**
 * Feature 4 — Company <-> Candidate realtime chat.
 */
export const conversationService = {
  list: () => api.get('/conversations').then((r) => r.data),
  // Company caller: start({ candidateId, jobId }) — Candidate caller: start({ companyId, jobId })
  start: ({ candidateId, companyId, jobId } = {}) =>
    api.post('/conversations', { candidateId, companyId, jobId }).then((r) => r.data),
  getMessages: (id) => api.get(`/conversations/${id}/messages`).then((r) => r.data),
  sendMessage: (id, text) => api.post(`/conversations/${id}/messages`, { text }).then((r) => r.data),
  markRead: (id) => api.patch(`/conversations/${id}/read`).then((r) => r.data),
  toggleMute: (id, muted) => api.patch(`/conversations/${id}/mute`, { muted }).then((r) => r.data),
  delete: (id) => api.delete(`/conversations/${id}`).then((r) => r.data),
  upload: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/conversations/${id}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
};