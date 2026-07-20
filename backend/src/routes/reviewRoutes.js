const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  createReview, updateReview, deleteReview, getCandidateReviews, getCompanyReviews,
} = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { COMPANY, CANDIDATE } = require('../constants/roles');

router.get('/candidate/:candidateId', getCandidateReviews); // public
router.get('/company/:companyId', getCompanyReviews); // public

// Either a company (reviewing the engineer) or a candidate (reviewing the
// company) may post a review — createReview determines the direction from
// req.user.role and validates the reviewer was actually party to the
// referenced engagement.
router.post(
  '/',
  protect,
  authorize(COMPANY, CANDIDATE),
  body('candidateId').optional().isMongoId(),
  body('companyId').optional().isMongoId(),
  body('rating').isInt({ min: 1, max: 5 }),
  body('review').optional().trim().isLength({ max: 1000 }),
  validateRequest,
  createReview
);

router.put('/:id', protect, authorize(COMPANY, CANDIDATE), updateReview);
router.delete('/:id', protect, authorize(COMPANY, CANDIDATE), deleteReview);

module.exports = router;
