const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const {
  addQuestions,
  updateQuestion,
  deleteQuestion,
  generateJobQuestions,
  getCompanyJobQuestions,
} = require('../controllers/mcqController');
const { protect } = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const validateRequest = require('../middleware/validateRequest');
const aiRateLimit = require('../middleware/aiRateLimit');
const { COMPANY } = require('../constants/roles');

// Company-only question management. Mounted under /api/v1/companies in
// server.js, so these become:
//   GET    /api/v1/companies/jobs/:jobId/questions
//   POST   /api/v1/companies/jobs/:jobId/questions
//   POST   /api/v1/companies/jobs/:jobId/questions/generate
//   PUT    /api/v1/companies/jobs/questions/:questionId
//   DELETE /api/v1/companies/jobs/questions/:questionId
router.use(protect, authorize(COMPANY));

router.get('/jobs/:jobId/questions', getCompanyJobQuestions);

router.post(
  '/jobs/:jobId/questions',
  body('questions').isArray({ min: 1 }),
  validateRequest,
  addQuestions
);

router.post(
  '/jobs/:jobId/questions/generate',
  aiRateLimit,
  body('count').optional().isInt({ min: 1, max: 20 }),
  body('focus').optional().trim().isLength({ max: 200 }),
  validateRequest,
  generateJobQuestions
);

router.put(
  '/jobs/questions/:questionId',
  validateRequest,
  updateQuestion
);

router.delete('/jobs/questions/:questionId', deleteQuestion);

module.exports = router;
