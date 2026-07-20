const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const {
  applyToJob, getMyApplications, withdrawApplication, getApplicationsForJob, updateApplicationStatus,
} = require('../controllers/applicationController');
const { protect } = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { CANDIDATE, COMPANY } = require('../constants/roles');

router.post(
  '/',
  protect,
  authorize(CANDIDATE),
  body('jobId').isMongoId(),
  body('coverLetter').optional().trim().isLength({ max: 2000 }),
  validateRequest,
  applyToJob
);

router.get('/me', protect, authorize(CANDIDATE), getMyApplications);
router.delete('/:id', protect, authorize(CANDIDATE), withdrawApplication);

router.get('/job/:jobId', protect, authorize(COMPANY), getApplicationsForJob);
router.patch(
  '/:id/status',
  protect,
  authorize(COMPANY),
  body('status').isIn(['applied', 'shortlisted', 'rejected', 'hired']),
  validateRequest,
  updateApplicationStatus
);

module.exports = router;
