const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const Candidate = require('../models/Candidate');
const { replaceFile } = require('../helpers/uploadHelper');
const { ensureSubscriptionFresh } = require('./subscriptionController');
const MESSAGES = require('../constants/messages');

/**
 * GET /api/v1/companies/me/profile
 * req.user IS the Company document (see authMiddleware).
 */
const getMyProfile = asyncHandler(async (req, res) => {
  return new ApiResponse(200, { company: req.user.toSafeObject() }, 'Profile fetched').send(res);
});

/**
 * PUT /api/v1/companies/me/profile
 * Companies have no profile-edit quota on any tier — the COMPANY product's
 * quotas are job posts and hires (see constants/plans.js), not edits.
 */
const updateMyProfile = asyncHandler(async (req, res) => {
  await ensureSubscriptionFresh(req.user);

  const allowedFields = [
    'companyName', 'website', 'industry', 'description',
    'contactPerson', 'location', 'gstNumber',
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) req.user[field] = req.body[field];
  });

  req.user.subscription.profileEditCount = (req.user.subscription.profileEditCount || 0) + 1;

  await req.user.save();

  return new ApiResponse(200, { company: req.user.toSafeObject() }, 'Profile updated').send(res);
});

/**
 * POST /api/v1/companies/me/logo
 */
const uploadLogo = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Logo file is required');

  const url = await replaceFile(req.file, 'logos', req.user.logo);
  req.user.logo = url;
  await req.user.save();

  return new ApiResponse(200, { logo: url }, 'Logo uploaded').send(res);
});

/**
 * POST /api/v1/companies/me/bookmarks/:candidateId
 */
const bookmarkCandidate = asyncHandler(async (req, res) => {
  const { candidateId } = req.params;

  const candidate = await Candidate.findById(candidateId);
  if (!candidate) throw ApiError.notFound('Candidate not found');

  const alreadyBookmarked = req.user.bookmarkedCandidates.some(
    (id) => id.toString() === candidateId
  );

  if (alreadyBookmarked) {
    return new ApiResponse(200, null, 'Candidate already bookmarked').send(res);
  }

  req.user.bookmarkedCandidates.push(candidateId);
  await req.user.save();

  return new ApiResponse(200, { bookmarkedCandidates: req.user.bookmarkedCandidates }, 'Candidate bookmarked').send(res);
});

/**
 * DELETE /api/v1/companies/me/bookmarks/:candidateId
 */
const removeBookmark = asyncHandler(async (req, res) => {
  const { candidateId } = req.params;
  req.user.bookmarkedCandidates = req.user.bookmarkedCandidates.filter(
    (id) => id.toString() !== candidateId
  );
  await req.user.save();
  return new ApiResponse(200, { bookmarkedCandidates: req.user.bookmarkedCandidates }, 'Bookmark removed').send(res);
});

/**
 * GET /api/v1/companies/me/bookmarks
 */
const getBookmarks = asyncHandler(async (req, res) => {
  await req.user.populate('bookmarkedCandidates');
  return new ApiResponse(200, { bookmarks: req.user.bookmarkedCandidates }, 'Bookmarks fetched').send(res);
});

module.exports = {
  getMyProfile,
  updateMyProfile,
  uploadLogo,
  bookmarkCandidate,
  removeBookmark,
  getBookmarks,
};
