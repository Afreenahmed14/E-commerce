const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const Review = require('../models/Review');
const Candidate = require('../models/Candidate');
const Company = require('../models/Company');
const Notification = require('../models/Notification');

/** Recalculates and persists a candidate's aggregate rating from reviews written ABOUT them (by companies). */
const recalculateCandidateRating = async (candidateId) => {
  const stats = await Review.aggregate([
    { $match: { candidateId, reviewerType: 'company' } },
    { $group: { _id: '$candidateId', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  const avgRating = stats.length ? Math.round(stats[0].avgRating * 10) / 10 : 0;
  const count = stats.length ? stats[0].count : 0;

  await Candidate.findByIdAndUpdate(candidateId, { rating: avgRating, reviewsCount: count });
};

/** Recalculates and persists a company's aggregate rating from reviews written ABOUT them (by candidates). */
const recalculateCompanyRating = async (companyId) => {
  const stats = await Review.aggregate([
    { $match: { companyId, reviewerType: 'candidate' } },
    { $group: { _id: '$companyId', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  const avgRating = stats.length ? Math.round(stats[0].avgRating * 10) / 10 : 0;
  const count = stats.length ? stats[0].count : 0;

  await Company.findByIdAndUpdate(companyId, { rating: avgRating, reviewsCount: count });
};

/**
 * POST /api/v1/reviews
 * req.user is either a Company or a Candidate document (see authMiddleware).
 * The review is ABOUT whichever party req.user is NOT:
 *  - a company posts { candidateId, rating, review } to review an engineer
 *  - a candidate posts { companyId, rating, review } to review a company
 */
const createReview = asyncHandler(async (req, res) => {
  const { rating, review } = req.body;
  const reviewerType = req.user.role; // 'company' | 'candidate'

  let candidateId;
  let companyId;

  if (reviewerType === 'company') {
    candidateId = req.body.candidateId;
    companyId = req.user._id;
    if (!candidateId) throw ApiError.badRequest('candidateId is required');
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) throw ApiError.notFound('Candidate not found');
  } else if (reviewerType === 'candidate') {
    companyId = req.body.companyId;
    candidateId = req.user._id;
    if (!companyId) throw ApiError.badRequest('companyId is required');
    const company = await Company.findById(companyId);
    if (!company) throw ApiError.notFound('Company not found');
  } else {
    throw ApiError.forbidden('Only companies and engineers can leave reviews');
  }

  const existing = await Review.findOne({ candidateId, companyId, reviewerType });
  if (existing) throw ApiError.conflict('You have already reviewed this profile');

  const newReview = await Review.create({
    candidateId,
    companyId,
    reviewerType,
    rating,
    review,
  });

  if (reviewerType === 'company') {
    await recalculateCandidateRating(candidateId);
    await Notification.create({
      userId: candidateId,
      userModel: 'Candidate',
      title: 'New review received',
      message: `${req.user.companyName} left you a ${rating}-star review.`,
      type: 'review',
    });
  } else {
    await recalculateCompanyRating(companyId);
    await Notification.create({
      userId: companyId,
      userModel: 'Company',
      title: 'New review received',
      message: `${req.user.name} left your company a ${rating}-star review.`,
      type: 'review',
    });
  }

  return new ApiResponse(201, { review: newReview }, 'Review submitted').send(res);
});

/**
 * PUT /api/v1/reviews/:id
 */
const updateReview = asyncHandler(async (req, res) => {
  const reviewerType = req.user.role;
  const ownerMatch = reviewerType === 'company' ? { companyId: req.user._id } : { candidateId: req.user._id };

  const review = await Review.findOne({ _id: req.params.id, reviewerType, ...ownerMatch });
  if (!review) throw ApiError.notFound('Review not found');

  if (req.body.rating !== undefined) review.rating = req.body.rating;
  if (req.body.review !== undefined) review.review = req.body.review;
  await review.save();

  if (reviewerType === 'company') {
    await recalculateCandidateRating(review.candidateId);
  } else {
    await recalculateCompanyRating(review.companyId);
  }

  return new ApiResponse(200, { review }, 'Review updated').send(res);
});

/**
 * DELETE /api/v1/reviews/:id
 */
const deleteReview = asyncHandler(async (req, res) => {
  const reviewerType = req.user.role;
  const ownerMatch = reviewerType === 'company' ? { companyId: req.user._id } : { candidateId: req.user._id };

  const review = await Review.findOneAndDelete({ _id: req.params.id, reviewerType, ...ownerMatch });
  if (!review) throw ApiError.notFound('Review not found');

  if (reviewerType === 'company') {
    await recalculateCandidateRating(review.candidateId);
  } else {
    await recalculateCompanyRating(review.companyId);
  }

  return new ApiResponse(200, null, 'Review deleted').send(res);
});

/**
 * GET /api/v1/reviews/candidate/:candidateId
 * Public — reviews written ABOUT this candidate, i.e. by companies.
 */
const getCandidateReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ candidateId: req.params.candidateId, reviewerType: 'company' })
    .populate('companyId', 'companyName logo')
    .sort('-createdAt');

  return new ApiResponse(200, { reviews }, 'Reviews fetched').send(res);
});

/**
 * GET /api/v1/reviews/company/:companyId
 * Public — reviews written ABOUT this company, i.e. by engineers.
 */
const getCompanyReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ companyId: req.params.companyId, reviewerType: 'candidate' })
    .populate('candidateId', 'name headline profileImage')
    .sort('-createdAt');

  return new ApiResponse(200, { reviews }, 'Reviews fetched').send(res);
});

module.exports = {
  createReview, updateReview, deleteReview, getCandidateReviews, getCompanyReviews,
};
