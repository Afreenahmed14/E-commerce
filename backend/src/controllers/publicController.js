const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const Candidate = require('../models/Candidate');
const Company = require('../models/Company');
const { VISIBILITY } = require('../constants/status');

/**
 * GET /api/v1/stats
 * Public, unauthenticated platform totals for the landing page's social-proof
 * bar. Deliberately minimal — only counts, nothing revenue-related or
 * otherwise sensitive (that lives behind the admin dashboard instead).
 */
const getPlatformStats = asyncHandler(async (req, res) => {
  const [totalCandidates, totalCompanies] = await Promise.all([
    Candidate.countDocuments({ visibility: VISIBILITY.PUBLIC }),
    Company.countDocuments(),
  ]);

  return new ApiResponse(200, {
    totalCandidates,
    totalCompanies,
  }, 'Platform stats fetched').send(res);
});

module.exports = { getPlatformStats };
