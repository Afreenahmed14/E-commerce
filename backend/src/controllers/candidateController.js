const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const Candidate = require('../models/Candidate');
const Notification = require('../models/Notification');
const ProfileView = require('../models/ProfileView');
const ContactUnlock = require('../models/ContactUnlock');
const { replaceFile } = require('../helpers/uploadHelper');
const { VISIBILITY, HIRER_TYPE, UNLOCK_STATUS } = require('../constants/status');
const {
  getPlan, PRODUCTS, TIERS, isPaidTier,
} = require('../constants/plans');
const { ensureSubscriptionFresh } = require('./subscriptionController');
const MESSAGES = require('../constants/messages');

/** True only for a genuinely active, currently-paid-for subscription — a
 * Free tier's default status of 'active' does NOT count, since Free never
 * expires and is not itself a purchase. Mirrors hireController's check. */
const hasActivePaidPlan = (sub) => isPaidTier(sub?.tier) && sub?.status === 'active';

/** Fields that must never leave the server on a public-facing candidate document. */
const PUBLIC_EXCLUDE = '-__v -password -resetPasswordToken -resetPasswordExpires -tokenVersion -email -phone';

// A given viewer re-loading the same profile page won't re-notify the
// candidate more than once per cooldown window.
const PROFILE_VIEW_NOTIFY_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

/**
 * Notifies a candidate that someone viewed their profile, throttled per
 * (candidate, viewer) pair via ProfileView so repeat page loads within the
 * cooldown window don't spam them with duplicate notifications.
 */
const notifyProfileViewed = async ({ candidateId, viewerId, viewerModel, viewerLabel }) => {
  const now = new Date();
  const existing = await ProfileView.findOne({ candidateId, viewerId, viewerModel });

  if (existing) {
    existing.lastViewedAt = now;
    const shouldNotify = !existing.lastNotifiedAt
      || (now.getTime() - new Date(existing.lastNotifiedAt).getTime()) > PROFILE_VIEW_NOTIFY_COOLDOWN_MS;
    if (shouldNotify) existing.lastNotifiedAt = now;
    await existing.save();
    if (!shouldNotify) return;
  } else {
    await ProfileView.create({ candidateId, viewerId, viewerModel, lastViewedAt: now, lastNotifiedAt: now });
  }

  await Notification.create({
    userId: candidateId,
    userModel: 'Candidate',
    title: 'Your profile was viewed',
    message: viewerModel === 'Company'
      ? `${viewerLabel} viewed your profile.`
      : `${viewerLabel} viewed your profile as a potential project partner.`,
    type: 'info',
  });
};

/**
 * GET /api/v1/candidates/me/profile
 * req.user IS the Candidate document (see authMiddleware) — no separate
 * lookup by a foreign userId needed.
 */
const getMyProfile = asyncHandler(async (req, res) => {
  return new ApiResponse(200, { candidate: req.user.toSafeObject() }, 'Profile fetched').send(res);
});

/**
 * PUT /api/v1/candidates/me/profile
 */
const updateMyProfile = asyncHandler(async (req, res) => {
  await ensureSubscriptionFresh(req.user);

  // Free plan is capped at profileEditLimit saves (see plans.js);
  // Monthly/Yearly are unlimited (profileEditLimit: null). hourlyRate-only
  // saves from HourlyRatePrompt (a one-time first-login nudge, not a
  // deliberate profile edit) stay exempt from the edit counter regardless.
  // 402 (not 400) so the frontend's existing subscription-modal handler
  // picks this up automatically.
  const plan = getPlan(req.user.subscription?.product, req.user.subscription?.tier);
  const isHourlyRateOnlySave = Object.keys(req.body).every((k) => k === 'hourlyRate');
  if (
    plan
    && plan.profileEditLimit !== null
    && !isHourlyRateOnlySave
    && (req.user.subscription?.profileEditCount || 0) >= plan.profileEditLimit
  ) {
    throw new ApiError(402, MESSAGES.SUBSCRIPTION.EDIT_LIMIT_REACHED);
  }

  const allowedFields = [
    'name', 'headline', 'about', 'experience', 'experienceMonths', 'primarySkills', 'secondarySkills',
    'developerType', 'hourlyRate', 'availability', 'languages', 'portfolioLinks', 'github',
    'linkedin', 'education', 'projects', 'visibility', 'location', 'profileImage',
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) req.user[field] = req.body[field];
  });

  // Keep the flat `skills` array (used by search/filter/text-index) in sync
  // with the two dropdown-driven fields, so nothing downstream needs to
  // change to keep working with the old single-list shape.
  if (req.body.primarySkills !== undefined || req.body.secondarySkills !== undefined) {
    req.user.skills = [...new Set([...(req.user.primarySkills || []), ...(req.user.secondarySkills || [])])];
  }

  if (!isHourlyRateOnlySave) {
    req.user.subscription.profileEditCount = (req.user.subscription.profileEditCount || 0) + 1;
  }

  await req.user.save();

  return new ApiResponse(200, { candidate: req.user.toSafeObject() }, 'Profile updated').send(res);
});

/**
 * DELETE /api/v1/candidates/me/profile
 * Soft-deletes by marking the account deleted + hiding from search, rather
 * than destroying historical review records tied to this candidate.
 */
const deleteMyProfile = asyncHandler(async (req, res) => {
  req.user.status = 'deleted';
  req.user.visibility = VISIBILITY.PRIVATE;
  await req.user.save();
  return new ApiResponse(200, null, 'Profile deleted').send(res);
});

/**
 * POST /api/v1/candidates/me/resume
 */
const uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Resume file is required');

  const url = await replaceFile(req.file, 'resumes', req.user.resume);
  req.user.resume = url;
  await req.user.save();

  return new ApiResponse(200, { resume: url }, 'Resume uploaded').send(res);
});

/**
 * POST /api/v1/candidates/me/image
 */
const uploadProfileImage = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Image file is required');

  const url = await replaceFile(req.file, 'profile-images', req.user.profileImage);
  req.user.profileImage = url;
  await req.user.save();

  return new ApiResponse(200, { profileImage: url }, 'Profile image uploaded').send(res);
});

/**
 * GET /api/v1/candidates/search
 * Public search & filter endpoint used by the "Browse Freelancers" page.
 * Never exposes contact details (email/phone).
 */
const searchCandidates = asyncHandler(async (req, res) => {
  const {
    q, skill, developerType, minRate, maxRate, availability, city, country,
    language, minRating, verified, remote, name, minExperience, maxExperience,
    page = 1, limit = 12, sort = '-rating',
  } = req.query;

  const filter = { visibility: VISIBILITY.PUBLIC, hourlyRate: { $ne: null } };

  // A candidate browsing the marketplace should never see their own card.
  if (req.user && req.user.role === 'candidate') {
    filter._id = { $ne: req.user._id };
  }

  if (q) filter.$text = { $search: q };
  // Legacy "Developer Type" groups filter by a hardcoded skills list; newer
  // admin-added types have no such list and filter by the developerType
  // field the candidate/admin set directly. `developerType` takes priority
  // when a candidate has explicitly set one — the skills list is only a
  // fallback for candidates who never set developerType at all. Plain OR'ing
  // these (as before) let generic overlapping skills (e.g. "JavaScript") leak
  // candidates of a *different* actual developer type into the results.
  if (skill && developerType) {
    filter.$or = [
      { developerType },
      { developerType: '', skills: { $in: [].concat(skill) } },
    ];
  } else if (skill) {
    filter.skills = { $in: [].concat(skill) };
  } else if (developerType) {
    filter.developerType = developerType;
  }
  if (language) filter.languages = { $in: [].concat(language) };
  if (availability) filter.availability = availability;
  if (city) filter['location.city'] = new RegExp(city, 'i');
  if (country) filter['location.country'] = new RegExp(country, 'i');
  if (remote !== undefined) filter['location.remote'] = remote === 'true';
  if (verified === 'true') filter.verificationStatus = 'verified';
  if (minRating) filter.rating = { $gte: Number(minRating) };
  // Escaped so punctuation in a searched name (e.g. "O'Brien") can't be
  // misread as regex syntax.
  if (name) filter.name = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  if (minRate || maxRate) {
    if (minRate) filter.hourlyRate.$gte = Number(minRate);
    if (maxRate) filter.hourlyRate.$lte = Number(maxRate);
  }
  if (minExperience || maxExperience) {
    filter.experience = {};
    if (minExperience) filter.experience.$gte = Number(minExperience);
    if (maxExperience) filter.experience.$lte = Number(maxExperience);
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [candidates, total] = await Promise.all([
    Candidate.find(filter, PUBLIC_EXCLUDE)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Candidate.countDocuments(filter),
  ]);

  // Companies see a bookmarked/not-bookmarked flag on each card so the
  // bookmark button can render its filled/outline state without a
  // separate round-trip per candidate.
  if (req.user && req.user.role === 'company') {
    const bookmarked = new Set((req.user.bookmarkedCandidates || []).map((id) => id.toString()));
    candidates.forEach((c) => { c.isBookmarked = bookmarked.has(c._id.toString()); });
  }

  return new ApiResponse(200, {
    candidates,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  }, 'Candidates fetched').send(res);
});

/**
 * GET /api/v1/candidates/:id
 * Public profile view. The engineer's name is always public. Portfolio/
 * GitHub/LinkedIn links are only shown to the owner and viewers with a
 * valid (non-expired) subscription — Free counts as valid since it never
 * expires, a cancelled/lapsed paid plan does not.
 *
 * A fellow candidate (not the owner) only gets the full profile if they
 * hold an active Candidate + Project Partner (CANDIDATE_PRO) subscription
 * — the plain Candidate plan covers job search only, not partner search.
 * Without it they still see the engineer in /candidates/search results,
 * but this endpoint returns a stripped-down teaser instead of the full
 * profile. Companies are unaffected by this check.
 *
 * Also notifies the candidate (throttled — see ProfileView) whenever a
 * company or fellow engineer actually views their full profile.
 */
const getCandidateById = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findById(req.params.id, PUBLIC_EXCLUDE).lean();
  if (!candidate || candidate.visibility !== VISIBILITY.PUBLIC) {
    throw ApiError.notFound('Candidate not found');
  }

  const isOwner = req.user && req.user.role === 'candidate' && req.user._id.toString() === candidate._id.toString();
  const isCompanyViewer = req.user && req.user.role === 'company';
  const isCandidateHirer = req.user && req.user.role === 'candidate' && !isOwner;

  await ensureSubscriptionFresh(req.user);
  const viewerSub = req.user.subscription || {};
  const hasValidPlan = viewerSub.tier === TIERS.FREE || viewerSub.status === 'active';
  const socialLocked = !isOwner && !hasValidPlan;

  // Full-profile access (and, further down, the ability to hire) requires
  // a genuinely active PAID plan — Free/trial accounts only ever see the
  // limited teaser built below, regardless of viewer type:
  //   - a Company on the Free tier (no paid subscription yet), or
  //   - a fellow Candidate without the Candidate + Project Partner product.
  // ensureSubscriptionFresh above already drops an expired paid plan back
  // to the free fallback product/tier, so these checks don't need a
  // separate expiry check of their own.
  const companyProfileLocked = isCompanyViewer && !hasActivePaidPlan(viewerSub);
  const candidateHirerProfileLocked = isCandidateHirer && viewerSub.product !== PRODUCTS.CANDIDATE_PRO;
  const profileLocked = companyProfileLocked || candidateHirerProfileLocked;

  // Profile browsing itself is no longer quota-limited by plan (the new
  // catalog gates job applications / interview calls / hires / project
  // partners instead — see constants/plans.js and utils/quota.js). We
  // still track distinct views via ProfileView for the "someone viewed
  // your profile" notification below — only for viewers who actually got
  // to see the full profile.
  let isNewProfileView = false;
  const grantedFullView = (isCompanyViewer || isCandidateHirer) && !profileLocked;
  if (!isOwner && grantedFullView) {
    const alreadyViewed = await ProfileView.exists({ candidateId: candidate._id, viewerId: req.user._id });
    isNewProfileView = !alreadyViewed;
  }
  if (socialLocked) {
    delete candidate.portfolioLinks;
    delete candidate.github;
    delete candidate.linkedin;
  }

  // A locked-out viewer (Free-plan company, or a candidate without the
  // Project Partner product) gets only name, about, and skills — no
  // headline, rate, location, rating, projects, education, resume, or
  // social/contact-adjacent links. Everything else requires upgrading.
  let responseCandidate = candidate;
  if (profileLocked) {
    responseCandidate = {
      _id: candidate._id,
      name: candidate.name,
      profileImage: candidate.profileImage,
      about: candidate.about,
      primarySkills: candidate.primarySkills,
      secondarySkills: candidate.secondarySkills,
      skills: candidate.skills,
    };
  }

  if (isCompanyViewer) {
    responseCandidate.isBookmarked = (req.user.bookmarkedCandidates || [])
      .some((bid) => bid.toString() === candidate._id.toString());
  }

  // Notify the candidate that someone viewed their profile — throttled per
  // viewer so repeat page loads within the cooldown window don't spam them.
  if (grantedFullView && !isOwner) {
    await notifyProfileViewed({
      candidateId: candidate._id,
      viewerId: req.user._id,
      viewerModel: isCompanyViewer ? 'Company' : 'Candidate',
      viewerLabel: isCompanyViewer ? (req.user.companyName || 'A company') : (req.user.name || 'A fellow engineer'),
    });

    // Count this distinct profile against the viewer's Free-plan view
    // limit — only once per (viewer, candidate) pair, ever, regardless of
    // plan changes later, matching the profileEditCount pattern above.
    if (isNewProfileView) {
      req.user.subscription.profileViewCount = (req.user.subscription.profileViewCount || 0) + 1;
      await req.user.save();
    }
  }

  // Tells the frontend which Hire button (if any) to render, and whether
  // this viewer has already hired this candidate — so the button can show
  // "Hired on <date>" instead of letting them hire (and pay a quota slot)
  // twice.
  let hire = null;
  if (isCompanyViewer) {
    const existing = await ContactUnlock.findOne({
      hirerType: HIRER_TYPE.COMPANY,
      companyId: req.user._id,
      candidateId: candidate._id,
      status: UNLOCK_STATUS.ACTIVE,
    }).lean();
    hire = { role: 'company', alreadyHired: !!existing, hiredAt: existing ? existing.unlockDate : null };
  } else if (isCandidateHirer) {
    const existing = await ContactUnlock.findOne({
      hirerType: HIRER_TYPE.CANDIDATE,
      hiringCandidateId: req.user._id,
      candidateId: candidate._id,
      status: UNLOCK_STATUS.ACTIVE,
    }).lean();
    hire = { role: 'project-partner', alreadyHired: !!existing, hiredAt: existing ? existing.unlockDate : null };
  }

  return new ApiResponse(200, {
    candidate: responseCandidate, socialLocked, profileLocked, hire,
  }, 'Candidate fetched').send(res);
});

module.exports = {
  getMyProfile,
  updateMyProfile,
  deleteMyProfile,
  uploadResume,
  uploadProfileImage,
  searchCandidates,
  getCandidateById,
};
