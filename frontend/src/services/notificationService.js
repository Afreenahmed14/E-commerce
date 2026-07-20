import api from './api';

export const notificationService = {
  getMy: (params) => api.get('/notifications', { params }).then((r) => r.data),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllAsRead: () => api.patch('/notifications/read-all').then((r) => r.data),
  remove: (id) => api.delete(`/notifications/${id}`).then((r) => r.data),
};
