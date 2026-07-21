const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const Candidate = require('../models/Candidate');
const ContactUnlock = require('../models/ContactUnlock');
const Notification = require('../models/Notification');
const {
  PRODUCTS, QUOTA_KEYS, getQuota, isPaidTier,
} = require('../constants/plans');
const { HIRER_TYPE, UNLOCK_STATUS, VISIBILITY } = require('../constants/status');
const { consumeQuota } = require('../utils/quota');
const { ensureSubscriptionFresh } = require('./subscriptionController');
const MESSAGES = require('../constants/messages');

// Fields it's safe to reveal to someone who has actually hired this
// candidate (i.e. paid to unlock contact) — includes email/phone, which
// are otherwise always stripped from public-facing candidate responses.
const HIRED_CANDIDATE_FIELDS = 'name headline profileImage email phone hourlyRate location skills primarySkills secondarySkills rating reviewsCount verificationStatus resume';

/** True only for a genuinely active, currently-paid-for subscription — a
 * Free tier's default status of 'active' does NOT count, since Free never
 * expires and is not itself a purchase. */
const hasActivePaidPlan = (sub) => isPaidTier(sub?.tier) && sub?.status === 'active';

/**
 * POST /api/v1/candidates/:id/hire
 *
 * Records a "hire" — a Company hiring this Candidate for work, or a fellow
 * Candidate hiring them as a Project Partner. Both flows:
 *   - require an active PAID subscription (Free/teaser accounts cannot
 *     hire, they can only browse the limited profile teaser),
 *   - are idempotent (hiring the same person twice just returns the
 *     existing hire rather than erroring or double-charging quota),
 *   - consume the hirer's rolling-window quota (HIRES for companies,
 *     PROJECT_PARTNER_REQUESTS for candidates),
 *   - are recorded in ContactUnlock — the single source of truth for
 *     "who hired whom, and when" shown on both dashboards,
 *   - notify the hired candidate.
 */
const hireCandidate = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const candidate = await Candidate.findById(id);
  if (!candidate || candidate.visibility !== VISIBILITY.PUBLIC) {
    throw ApiError.notFound('Candidate not found');
  }

  await ensureSubscriptionFresh(req.user);
  const sub = req.user.subscription || {};

  if (req.user.role === 'company') {
    if (!hasActivePaidPlan(sub)) {
      throw new ApiError(402, MESSAGES.SUBSCRIPTION.SUBSCRIPTION_REQUIRED_TO_HIRE, ['SUBSCRIPTION_REQUIRED']);
    }

    const existing = await ContactUnlock.findOne({
      hirerType: HIRER_TYPE.COMPANY,
      companyId: req.user._id,
      candidateId: candidate._id,
      status: UNLOCK_STATUS.ACTIVE,
    });
    if (existing) {
      const contact = await Candidate.findById(candidate._id, HIRED_CANDIDATE_FIELDS);
      return new ApiResponse(200, { hire: existing, candidate: contact }, MESSAGES.HIRE.ALREADY_HIRED).send(res);
    }

    const quota = getQuota(sub.product || PRODUCTS.COMPANY, sub.tier, QUOTA_KEYS.HIRES);
    const usage = (sub.usage && sub.usage[QUOTA_KEYS.HIRES]) || [];
    const result = consumeQuota(usage, quota);
    if (!result.allowed) {
      throw new ApiError(402, MESSAGES.SUBSCRIPTION.QUOTA_HIRES_REACHED, ['SUBSCRIPTION_REQUIRED']);
    }
    req.user.subscription.usage = req.user.subscription.usage || {};
    req.user.subscription.usage[QUOTA_KEYS.HIRES] = result.prunedTimestamps;
    await req.user.save();

    const hire = await ContactUnlock.create({
      hirerType: HIRER_TYPE.COMPANY,
      companyId: req.user._id,
      candidateId: candidate._id,
    });

    await Notification.create({
      userId: candidate._id,
      userModel: 'Candidate',
      title: "You've been hired!",
      message: `${req.user.companyName || 'A company'} hired you on ${new Date(hire.unlockDate).toLocaleDateString()}.`,
      type: 'success',
    });

    const contact = await Candidate.findById(candidate._id, HIRED_CANDIDATE_FIELDS);
    return new ApiResponse(201, { hire, candidate: contact }, MESSAGES.HIRE.HIRED_SUCCESS).send(res);
  }

  if (req.user.role === 'candidate') {
    if (req.user._id.toString() === candidate._id.toString()) {
      throw ApiError.badRequest(MESSAGES.HIRE.CANNOT_HIRE_SELF);
    }
    if (sub.product !== PRODUCTS.CANDIDATE_PRO || !hasActivePaidPlan(sub)) {
      throw new ApiError(402, MESSAGES.SUBSCRIPTION.SUBSCRIPTION_REQUIRED_TO_HIRE_PARTNER, ['SUBSCRIPTION_REQUIRED']);
    }

    const existing = await ContactUnlock.findOne({
      hirerType: HIRER_TYPE.CANDIDATE,
      hiringCandidateId: req.user._id,
      candidateId: candidate._id,
      status: UNLOCK_STATUS.ACTIVE,
    });
    if (existing) {
      const contact = await Candidate.findById(candidate._id, HIRED_CANDIDATE_FIELDS);
      return new ApiResponse(200, { hire: existing, candidate: contact }, MESSAGES.HIRE.ALREADY_HIRED_PARTNER).send(res);
    }

    const quota = getQuota(PRODUCTS.CANDIDATE_PRO, sub.tier, QUOTA_KEYS.PROJECT_PARTNER_REQUESTS);
    const usage = (sub.usage && sub.usage[QUOTA_KEYS.PROJECT_PARTNER_REQUESTS]) || [];
    const result = consumeQuota(usage, quota);
    if (!result.allowed) {
      throw new ApiError(402, MESSAGES.SUBSCRIPTION.QUOTA_PROJECT_PARTNER_REACHED, ['SUBSCRIPTION_REQUIRED']);
    }
    req.user.subscription.usage = req.user.subscription.usage || {};
    req.user.subscription.usage[QUOTA_KEYS.PROJECT_PARTNER_REQUESTS] = result.prunedTimestamps;
    await req.user.save();

    const hire = await ContactUnlock.create({
      hirerType: HIRER_TYPE.CANDIDATE,
      hiringCandidateId: req.user._id,
      candidateId: candidate._id,
    });

    await Notification.create({
      userId: candidate._id,
      userModel: 'Candidate',
      title: 'New project partner request',
      message: `${req.user.name || 'A fellow engineer'} hired you as a project partner on ${new Date(hire.unlockDate).toLocaleDateString()}.`,
      type: 'success',
    });

    const contact = await Candidate.findById(candidate._id, HIRED_CANDIDATE_FIELDS);
    return new ApiResponse(201, { hire, candidate: contact }, MESSAGES.HIRE.HIRED_PARTNER_SUCCESS).send(res);
  }

  throw ApiError.forbidden(MESSAGES.AUTH.FORBIDDEN);
});

/**
 * GET /api/v1/companies/me/hires
 * Every candidate this company has hired — powers the Company dashboard's
 * "Hired Candidates" page (who they hired, and when).
 */
const getHiresForCompany = asyncHandler(async (req, res) => {
  const hires = await ContactUnlock.find({
    hirerType: HIRER_TYPE.COMPANY,
    companyId: req.user._id,
    status: UNLOCK_STATUS.ACTIVE,
  })
    .populate('candidateId', HIRED_CANDIDATE_FIELDS)
    .sort('-unlockDate');

  return new ApiResponse(200, { hires }, 'Hired candidates fetched').send(res);
});

/**
 * GET /api/v1/candidates/me/hired-by
 * Every company or fellow candidate that has hired ME — powers the
 * Candidate dashboard's "My Hires" page (which company hired them, and
 * when).
 */
const getHiredByForCandidate = asyncHandler(async (req, res) => {
  const hires = await ContactUnlock.find({
    candidateId: req.user._id,
    status: UNLOCK_STATUS.ACTIVE,
  })
    .populate('companyId', 'companyName logo industry location')
    .populate('hiringCandidateId', 'name headline profileImage')
    .sort('-unlockDate');

  return new ApiResponse(200, { hires }, 'Hires fetched').send(res);
});

/**
 * GET /api/v1/candidates/me/project-partners
 * Fellow engineers THIS candidate has hired as project partners.
 */
const getPartnerHiresForCandidate = asyncHandler(async (req, res) => {
  const hires = await ContactUnlock.find({
    hirerType: HIRER_TYPE.CANDIDATE,
    hiringCandidateId: req.user._id,
    status: UNLOCK_STATUS.ACTIVE,
  })
    .populate('candidateId', HIRED_CANDIDATE_FIELDS)
    .sort('-unlockDate');

  return new ApiResponse(200, { hires }, 'Project partners fetched').send(res);
});

module.exports = {
  hireCandidate,
  getHiresForCompany,
  getHiredByForCandidate,
  getPartnerHiresForCandidate,
};
