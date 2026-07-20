const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const Candidate = require('../models/Candidate');
const Company = require('../models/Company');
const Admin = require('../models/Admin');
const Review = require('../models/Review');
const Category = require('../models/Category');
const Skill = require('../models/Skill');
const DeveloperType = require('../models/DeveloperType');
const Verification = require('../models/Verification');
const Notification = require('../models/Notification');
const Settings = require('../models/Settings');
const Job = require('../models/Job');
const { VERIFICATION_STATUS, USER_STATUS } = require('../constants/status');
const {
  PRODUCTS, TIERS, CATALOG, applyPriceOverrides,
} = require('../constants/plans');
const { DEFAULT_DEVELOPER_TYPES } = require('../constants/developerTypes');

/**
 * Lazily seeds the DeveloperType collection with the original hardcoded
 * list the first time it's ever queried, so existing candidates/filters
 * keep working after this migration to a DB-backed, admin-editable list.
 */
const ensureDeveloperTypesSeeded = async () => {
  const count = await DeveloperType.countDocuments();
  if (count > 0) return;
  await DeveloperType.insertMany(
    DEFAULT_DEVELOPER_TYPES.map((name) => ({ name })),
    { ordered: false }
  ).catch(() => {}); // ignore races/dup-key if two requests seed at once
};

const MODEL_BY_ROLE = { candidate: Candidate, company: Company, admin: Admin };
const MODEL_NAME_BY_ROLE = { candidate: 'Candidate', company: 'Company', admin: 'Admin' };

/**
 * GET /api/v1/admin/dashboard
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  const [totalCandidates, totalCompanies, pendingVerifications, openJobs] = await Promise.all([
    Candidate.countDocuments(),
    Company.countDocuments(),
    Verification.countDocuments({ status: VERIFICATION_STATUS.PENDING }),
    Job.countDocuments({ status: 'open' }),
  ]);

  return new ApiResponse(200, {
    totalCandidates,
    totalCompanies,
    pendingVerifications,
    openJobs,
  }, 'Dashboard stats fetched').send(res);
});

/**
 * GET /api/v1/admin/users?role=&status=&page=&limit=
 * Since candidates, companies, and admins live in separate collections
 * (see models/Candidate.js for why), this endpoint queries whichever are
 * requested and merges them into one normalized list for the admin UI.
 * Without a `role` filter, it queries all three and merges by createdAt.
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const { role, status, page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

  const rolesToQuery = role ? [role] : ['candidate', 'company', 'admin'];
  const filter = {};
  if (status) filter.status = status;

  const results = await Promise.all(
    rolesToQuery.map((r) => MODEL_BY_ROLE[r].find(filter).select('name email role status isVerified lastLogin createdAt').lean())
  );

  const merged = results.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const total = merged.length;
  const users = merged.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  return new ApiResponse(200, {
    users,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  }, 'Users fetched').send(res);
});

/**
 * PATCH /api/v1/admin/users/:id/status
 * Suspend / reactivate any account. Since we don't know which collection
 * `:id` belongs to up front, `role` must be supplied by the client (the
 * admin users table already knows each row's role after getAllUsers).
 */
const updateUserStatus = asyncHandler(async (req, res) => {
  const { status, role } = req.body;
  if (!Object.values(USER_STATUS).includes(status)) {
    throw ApiError.badRequest('Invalid status value');
  }
  const Model = MODEL_BY_ROLE[role];
  if (!Model) throw ApiError.badRequest('Invalid role');

  const user = await Model.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!user) throw ApiError.notFound('User not found');

  await Notification.create({
    userId: user._id,
    userModel: MODEL_NAME_BY_ROLE[role],
    title: 'Account status updated',
    message: `Your account status has been changed to "${status}" by an administrator.`,
    type: 'warning',
  });

  return new ApiResponse(200, { user }, 'User status updated').send(res);
});

/**
 * GET /api/v1/admin/users/:id?role=candidate|company|admin
 * Full "everything about this account" view for the admin panel: profile,
 * verification history, and their notification log. This is the single
 * detail screen the Users table links out to so an admin can inspect an
 * account before suspending, deleting, or otherwise acting on it.
 */
const getUserDetail = asyncHandler(async (req, res) => {
  const { role } = req.query;
  const Model = MODEL_BY_ROLE[role];
  if (!Model) throw ApiError.badRequest('Invalid role');

  const user = await Model.findById(req.params.id).lean();
  if (!user) throw ApiError.notFound('User not found');

  if (role === 'admin') {
    return new ApiResponse(200, { user, verifications: [], notifications: [] }, 'User detail fetched').send(res);
  }

  const [verifications, notifications] = await Promise.all([
    Verification.find({ profileId: user._id }).sort('-createdAt').lean(),
    Notification.find({ userId: user._id }).sort('-createdAt').limit(50).lean(),
  ]);

  return new ApiResponse(200, {
    user, verifications, notifications,
  }, 'User detail fetched').send(res);
});

/**
 * DELETE /api/v1/admin/users/:id?role=candidate|company|admin
 * Hard-deletes the account document. Guards against an admin deleting
 * their own account (would lock them out mid-session) and against
 * deleting the last remaining admin (would lock everyone out).
 */
const deleteUser = asyncHandler(async (req, res) => {
  const { role } = req.query;
  const Model = MODEL_BY_ROLE[role];
  if (!Model) throw ApiError.badRequest('Invalid role');

  if (role === 'admin') {
    if (String(req.params.id) === String(req.user._id)) {
      throw ApiError.badRequest('You cannot delete your own admin account');
    }
    const adminCount = await Admin.countDocuments();
    if (adminCount <= 1) {
      throw ApiError.badRequest('Cannot delete the last remaining admin account');
    }
  }

  const user = await Model.findByIdAndDelete(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  return new ApiResponse(200, null, 'User deleted').send(res);
});

/**
 * PATCH /api/v1/admin/candidates/:id/developer-type
 * Lets an admin correct a candidate's self-selected Developer Type
 * (the same enum used on the candidate's own profile form and the
 * Browse Freelancers filter — see constants/developerTypes.js).
 */
const updateCandidateDeveloperType = asyncHandler(async (req, res) => {
  const { developerType } = req.body;
  await ensureDeveloperTypesSeeded();
  const valid = await DeveloperType.exists({ name: developerType, isActive: true });
  if (!valid) {
    throw ApiError.badRequest(`developerType must be one of the configured developer types`);
  }

  const candidate = await Candidate.findByIdAndUpdate(
    req.params.id,
    { developerType },
    { new: true }
  );
  if (!candidate) throw ApiError.notFound('Candidate not found');

  return new ApiResponse(200, { candidate }, 'Developer type updated').send(res);
});

/**
 * Developer Types — admin-managed list of "Developer Type" options shown
 * on the candidate profile form, the admin candidate filter, and the
 * Browse Freelancers "Developer Type" filter. Adding one here makes it
 * appear in all three places immediately (see GET /candidates/developer-types
 * for the public read used by non-admin screens).
 */
const getDeveloperTypes = asyncHandler(async (req, res) => {
  await ensureDeveloperTypesSeeded();
  const developerTypes = await DeveloperType.find({ isActive: true }).sort('name');
  return new ApiResponse(200, { developerTypes }, 'Developer types fetched').send(res);
});

const createDeveloperType = asyncHandler(async (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) throw ApiError.badRequest('name is required');
  const existing = await DeveloperType.findOne({ name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
  if (existing) throw ApiError.badRequest('This developer type already exists');
  const developerType = await DeveloperType.create({ name });
  return new ApiResponse(201, { developerType }, 'Developer type created').send(res);
});

const deleteDeveloperType = asyncHandler(async (req, res) => {
  const developerType = await DeveloperType.findByIdAndDelete(req.params.id);
  if (!developerType) throw ApiError.notFound('Developer type not found');
  return new ApiResponse(200, null, 'Developer type deleted').send(res);
});

/** Snapshot of every product's tier prices, straight from the live catalog. */
const snapshotPrices = () => {
  const snapshot = {};
  Object.entries(CATALOG).forEach(([product, def]) => {
    snapshot[product] = {};
    Object.entries(def.tiers).forEach(([tier, t]) => {
      snapshot[product][tier] = t.price;
    });
  });
  return snapshot;
};

/**
 * GET /api/v1/admin/settings/pricing
 * Current live subscription prices for every product/tier, whether
 * they're still the env-var defaults or an admin override.
 */
const getPricingSettings = asyncHandler(async (req, res) => {
  return new ApiResponse(200, { prices: snapshotPrices() }, 'Pricing settings fetched').send(res);
});

/**
 * PATCH /api/v1/admin/settings/pricing
 * Body: { prices: { [product]: { [tier]: price } } } — a product/tier may
 * be omitted to leave it unchanged. Persists the override to the Settings
 * collection (so it survives a restart) and applies it to the live
 * CATALOG object immediately (so it also applies without one).
 */
const updatePricingSettings = asyncHandler(async (req, res) => {
  const { prices } = req.body;

  if (!prices || typeof prices !== 'object') {
    throw ApiError.badRequest('prices must be an object keyed by product');
  }

  Object.entries(prices).forEach(([product, tierPrices]) => {
    if (!Object.values(PRODUCTS).includes(product)) {
      throw ApiError.badRequest(`Unknown product "${product}"`);
    }
    if (!tierPrices || typeof tierPrices !== 'object') {
      throw ApiError.badRequest(`prices.${product} must be an object keyed by tier`);
    }
    Object.entries(tierPrices).forEach(([tier, value]) => {
      if (!Object.values(TIERS).includes(tier)) {
        throw ApiError.badRequest(`Unknown tier "${tier}" for product "${product}"`);
      }
      if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
        throw ApiError.badRequest(`prices.${product}.${tier} must be a non-negative number`);
      }
    });
  });

  await Settings.findOneAndUpdate(
    { key: 'platform' },
    { prices, updatedBy: req.user._id },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  applyPriceOverrides(prices);

  return new ApiResponse(200, { prices: snapshotPrices() }, 'Pricing settings updated').send(res);
});

/**
 * GET /api/v1/admin/candidates
 */
const getAllCandidates = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, verificationStatus } = req.query;
  const filter = {};
  if (verificationStatus) filter.verificationStatus = verificationStatus;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

  const [candidates, total] = await Promise.all([
    Candidate.find(filter).sort('-createdAt').skip((pageNum - 1) * limitNum).limit(limitNum),
    Candidate.countDocuments(filter),
  ]);

  return new ApiResponse(200, {
    candidates,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  }, 'Candidates fetched').send(res);
});

/**
 * GET /api/v1/admin/companies
 */
const getAllCompanies = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, verificationStatus } = req.query;
  const filter = {};
  if (verificationStatus) filter.verificationStatus = verificationStatus;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

  const [companies, total] = await Promise.all([
    Company.find(filter).sort('-createdAt').skip((pageNum - 1) * limitNum).limit(limitNum),
    Company.countDocuments(filter),
  ]);

  return new ApiResponse(200, {
    companies,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  }, 'Companies fetched').send(res);
});

/**
 * GET /api/v1/admin/verifications?status=pending
 * `profileId` is populated dynamically (refPath: 'role') to pull in either
 * the Candidate or Company document directly.
 */
const getVerificationRequests = asyncHandler(async (req, res) => {
  const { status = VERIFICATION_STATUS.PENDING } = req.query;
  const requests = await Verification.find({ status })
    .populate('profileId', 'name email companyName headline')
    .sort('-createdAt');

  return new ApiResponse(200, { requests }, 'Verification requests fetched').send(res);
});

/**
 * PATCH /api/v1/admin/verifications/:id
 * Approve or reject a pending verification request.
 */
const reviewVerificationRequest = asyncHandler(async (req, res) => {
  const { status, reviewNote } = req.body;
  if (![VERIFICATION_STATUS.VERIFIED, VERIFICATION_STATUS.REJECTED].includes(status)) {
    throw ApiError.badRequest('Status must be either verified or rejected');
  }

  const request = await Verification.findByIdAndUpdate(
    req.params.id,
    { status, reviewNote, reviewedBy: req.user._id, reviewedAt: new Date() },
    { new: true }
  );
  if (!request) throw ApiError.notFound('Verification request not found');

  const Model = request.role === 'Candidate' ? Candidate : Company;
  await Model.findByIdAndUpdate(request.profileId, { verificationStatus: status });

  await Notification.create({
    userId: request.profileId,
    userModel: request.role,
    title: 'Verification update',
    message: status === VERIFICATION_STATUS.VERIFIED
      ? 'Your profile has been verified.'
      : `Your verification request was rejected. ${reviewNote || ''}`.trim(),
    type: 'verification',
  });

  return new ApiResponse(200, { request }, 'Verification request reviewed').send(res);
});

/** Categories */
const createCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const slug = name.toLowerCase().trim().replace(/\s+/g, '-');
  const category = await Category.create({ name, slug, description });
  return new ApiResponse(201, { category }, 'Category created').send(res);
});

const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort('name');
  return new ApiResponse(200, { categories }, 'Categories fetched').send(res);
});

const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');
  return new ApiResponse(200, null, 'Category deleted').send(res);
});

/** Skills */
const createSkill = asyncHandler(async (req, res) => {
  const { name, category } = req.body;
  const skill = await Skill.create({ name, category: category || null });
  return new ApiResponse(201, { skill }, 'Skill created').send(res);
});

const getSkills = asyncHandler(async (req, res) => {
  const skills = await Skill.find().populate('category', 'name').sort('name');
  return new ApiResponse(200, { skills }, 'Skills fetched').send(res);
});

const deleteSkill = asyncHandler(async (req, res) => {
  const skill = await Skill.findByIdAndDelete(req.params.id);
  if (!skill) throw ApiError.notFound('Skill not found');
  return new ApiResponse(200, null, 'Skill deleted').send(res);
});

/** GET /api/v1/admin/reviews - moderate reviews */
const getAllReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find()
    .populate('candidateId', 'headline')
    .populate('companyId', 'companyName')
    .sort('-createdAt');
  return new ApiResponse(200, { reviews }, 'Reviews fetched').send(res);
});

const deleteReviewAsAdmin = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndDelete(req.params.id);
  if (!review) throw ApiError.notFound('Review not found');
  return new ApiResponse(200, null, 'Review removed').send(res);
});

module.exports = {
  getDashboardStats,
  getAllUsers,
  updateUserStatus,
  getUserDetail,
  deleteUser,
  updateCandidateDeveloperType,
  getDeveloperTypes,
  createDeveloperType,
  deleteDeveloperType,
  getPricingSettings,
  updatePricingSettings,
  getAllCandidates,
  getAllCompanies,
  getVerificationRequests,
  reviewVerificationRequest,
  createCategory,
  getCategories,
  deleteCategory,
  createSkill,
  getSkills,
  deleteSkill,
  getAllReviews,
  deleteReviewAsAdmin,
};
