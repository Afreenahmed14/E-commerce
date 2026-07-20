import api from './api';

export const subscriptionService = {
  getPlans: (forRole) => api.get('/subscription/plans', { params: forRole ? { for: forRole } : {} }).then((r) => r.data),
  getStatus: () => api.get('/subscription/status').then((r) => r.data),
  createOrder: (product, tier) => api.post('/subscription/order', { product, tier }).then((r) => r.data),
  verifyPayment: (payload) => api.post('/subscription/verify', payload).then((r) => r.data),
  cancel: () => api.post('/subscription/cancel').then((r) => r.data),
};
