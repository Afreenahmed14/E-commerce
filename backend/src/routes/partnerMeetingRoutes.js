const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const {
  createPartnerMeeting,
  getMyPartnerMeetings,
  respondToPartnerMeeting,
  requestReschedulePartnerMeeting,
  confirmReschedulePartnerMeeting,
  cancelPartnerMeeting,
} = require('../controllers/partnerMeetingController');
const { protect } = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { CANDIDATE } = require('../constants/roles');

// Partner meetings are a candidate-only, peer-to-peer flow — unlike
// interviews, there's no company side here.
router.use(protect, authorize(CANDIDATE));

router.get('/me', getMyPartnerMeetings);

router.post(
  '/',
  body('partnerId').isMongoId(),
  body('platform').optional().isIn(['google-meet', 'zoom', 'teams']),
  body('scheduledAt').isISO8601(),
  body('durationMinutes').optional().isInt({ min: 15, max: 240 }),
  validateRequest,
  createPartnerMeeting
);

router.patch(
  '/:id/respond',
  body('action').isIn(['accept', 'decline']),
  validateRequest,
  respondToPartnerMeeting
);

router.patch(
  '/:id/reschedule',
  body('proposedAt').isISO8601(),
  validateRequest,
  requestReschedulePartnerMeeting
);

router.patch(
  '/:id/reschedule/confirm',
  body('scheduledAt').isISO8601(),
  validateRequest,
  confirmReschedulePartnerMeeting
);

router.patch('/:id/cancel', cancelPartnerMeeting);

module.exports = router;
