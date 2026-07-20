const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  sendPhoneOtp, verifyPhoneOtp, sendEmailOtp, verifyEmailOtp,
} = require('../controllers/otpController');
const { protect } = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { CANDIDATE, COMPANY } = require('../constants/roles');

// Phone/email OTP verification is available to every plan, including Free.
router.use(protect, authorize(CANDIDATE, COMPANY));

router.post('/phone/send', body('phone').notEmpty().withMessage('Phone number is required'), validateRequest, sendPhoneOtp);
router.post(
  '/phone/verify',
  body('phone').notEmpty(),
  body('code').isLength({ min: 6, max: 6 }).withMessage('Code must be 6 digits'),
  validateRequest,
  verifyPhoneOtp
);
router.post('/email/send', body('email').isEmail().withMessage('Valid email is required'), validateRequest, sendEmailOtp);
router.post(
  '/email/verify',
  body('email').isEmail(),
  body('code').isLength({ min: 6, max: 6 }).withMessage('Code must be 6 digits'),
  validateRequest,
  verifyEmailOtp
);

module.exports = router;
