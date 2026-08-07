import api from './api';

/**
 * Feature 2 & 3 — ATS Resume Checker + AI Job Matching.
 * `analyze` uploads a resume (PDF/DOCX/image) and returns the ATS score,
 * suggestions, improved summary, and bucketed job matches.
 */
export const atsService = {
  analyzeResume: (file, jobId) => {
    const formData = new FormData();
    formData.append('resume', file);
    if (jobId) formData.append('jobId', jobId);
    return api.post('/ats/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
  matchResume: (file, jobId) => {
    const formData = new FormData();
    formData.append('resume', file);
    if (jobId) formData.append('jobId', jobId);
    return api.post('/ats/match', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
  getHistory: () => api.get('/ats/history').then((r) => r.data),
};
