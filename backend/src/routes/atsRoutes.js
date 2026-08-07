const express = require('express');
const router = express.Router();

const {
  analyzeResumeHandler,
  matchAllJobsHandler,
  getMyAnalyses,
} = require('../controllers/atsController');
const { protect } = require('../middleware/authMiddleware');
const { CANDIDATE } = require('../constants/roles');
const aiRateLimit = require('../middleware/aiRateLimit');
const { uploadResume } = require('../middleware/uploadMiddleware');

// ATS resume analysis + job matching. AI-powered, so gated by aiRateLimit.
// Only candidates analyze/match their own resumes.
router.use(protect);

router.post(
  '/analyze',
  aiRateLimit,
  uploadResume.single('resume'),
  analyzeResumeHandler
);

router.post(
  '/match',
  aiRateLimit,
  uploadResume.single('resume'),
  matchAllJobsHandler
);

router.get('/history', aiRateLimit, getMyAnalyses);

module.exports = router;
