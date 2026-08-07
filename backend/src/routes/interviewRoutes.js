const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const {
  createInterview,
  getMyInterviews,
  getCompanyInterviews,
  respondToInterview,
  requestReschedule,
  confirmReschedule,
  cancelInterview,
} = require('../controllers/interviewController');
const { protect } = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { CANDIDATE, COMPANY } = require('../constants/roles');

// Both candidates and companies use the interview module.
router.use(protect);

// Candidate-facing
router.get('/me', authorize(CANDIDATE), getMyInterviews);
router.patch(
  '/:id/respond',
  authorize(CANDIDATE),
  body('action').isIn(['accept', 'reject']),
  validateRequest,
  respondToInterview
);
router.patch(
  '/:id/reschedule',
  authorize(CANDIDATE),
  body('proposedAt').isISO8601(),
  validateRequest,
  requestReschedule
);

// Company-facing
router.get(
  '/company',
  authorize(COMPANY),
  getCompanyInterviews
);
router.post(
  '/',
  authorize(COMPANY),
  body('applicationId').isMongoId(),
  body('platform').optional().isIn(['google-meet', 'zoom', 'teams']),
  body('scheduledAt').isISO8601(),
  body('durationMinutes').optional().isInt({ min: 15, max: 240 }),
  validateRequest,
  createInterview
);
router.patch(
  '/:id/reschedule/confirm',
  authorize(COMPANY),
  body('scheduledAt').isISO8601(),
  validateRequest,
  confirmReschedule
);
router.patch('/:id/cancel', authorize(COMPANY), cancelInterview);

module.exports = router;
