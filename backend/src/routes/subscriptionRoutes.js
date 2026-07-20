const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  getPlans, getStatus, createSubscriptionOrder, verifySubscriptionPayment, cancelSubscription,
} = require('../controllers/subscriptionController');
const { protect } = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { COMPANY, CANDIDATE } = require('../constants/roles');
const { PRODUCTS, TIERS } = require('../constants/plans');

// Public plan catalog. ?for=candidate|company narrows the response.
router.get('/plans', getPlans);

router.use(protect, authorize(COMPANY, CANDIDATE));

router.get('/status', getStatus);

const productTierValidators = [
  body('product').isIn(Object.values(PRODUCTS)).withMessage('product must be a valid subscription product'),
  body('tier').isIn([TIERS.MONTHLY, TIERS.YEARLY]).withMessage('tier must be "monthly" or "yearly"'),
];

router.post('/order', ...productTierValidators, validateRequest, createSubscriptionOrder);

router.post(
  '/verify',
  body('razorpay_order_id').notEmpty(),
  body('razorpay_payment_id').notEmpty(),
  body('razorpay_signature').notEmpty(),
  ...productTierValidators,
  validateRequest,
  verifySubscriptionPayment
);

router.post('/cancel', cancelSubscription);

module.exports = router;
