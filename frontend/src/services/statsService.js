import api from './api';

export const statsService = {
  getPlatformStats: () => api.get('/stats').then((r) => r.data),
};
