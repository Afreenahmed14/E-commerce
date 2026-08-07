import api from './api';

/**
 * Feature 10 — Admin AI Dashboard analytics.
 */
export const adminInsightsService = {
  get: () => api.get('/admin-insights').then((r) => r.data),
  getInsights: () => api.get('/admin-insights').then((r) => r.data),
};
