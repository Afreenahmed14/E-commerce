import api from './api';

/**
 * Features 5 & 6 — Job application questions + AI auto-generated MCQs.
 */
export const mcqService = {
  // Company: manage questions for a job
  getForJob: (jobId) => api.get(`/companies/jobs/${jobId}/questions`).then((r) => r.data),
  addQuestions: (jobId, questions) => api.post(`/companies/jobs/${jobId}/questions`, { questions }).then((r) => r.data),
  generate: (jobId, count = 10, focus = '') =>
    api.post(`/companies/jobs/${jobId}/questions/generate`, { count, focus }).then((r) => r.data),
  updateQuestion: (questionId, payload) => api.put(`/companies/jobs/questions/${questionId}`, payload).then((r) => r.data),
  deleteQuestion: (questionId) => api.delete(`/companies/jobs/questions/${questionId}`).then((r) => r.data),

  // Candidate: fetch questions when applying (public, no answers included)
  getForApply: (jobId) => api.get(`/jobs/${jobId}/questions`).then((r) => r.data),
};
