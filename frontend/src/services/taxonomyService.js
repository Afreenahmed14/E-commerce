import api from './api';

export const taxonomyService = {
  getSkills: () => api.get('/taxonomy/skills').then((r) => r.data),
  getCategories: () => api.get('/taxonomy/categories').then((r) => r.data),
  getDeveloperTypes: () => api.get('/taxonomy/developer-types').then((r) => r.data),
};
