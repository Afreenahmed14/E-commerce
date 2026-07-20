const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const Job = require('../models/Job');
const Application = require('../models/Application');
const { PRODUCTS, QUOTA_KEYS, getQuota } = require('../constants/plans');
const { consumeQuota } = require('../utils/quota');
const { ensureSubscriptionFresh } = require('./subscriptionController');
const MESSAGES = require('../constants/messages');

/**
 * POST /api/v1/jobs
 * Company creates a job posting. Gated by the company's JOB_POSTS quota
 * for their current subscription tier (see constants/plans.js).
 */
const createJob = asyncHandler(async (req, res) => {
  const {
    title, description, jobType, developerType, skills,
    experienceMin, experienceMax, payType, salaryMin, salaryMax, location, openings,
  } = req.body;

  await ensureSubscriptionFresh(req.user);
  const sub = req.user.subscription || {};
  const quota = getQuota(PRODUCTS.COMPANY, sub.tier, QUOTA_KEYS.JOB_POSTS);
  const usage = (sub.usage && sub.usage[QUOTA_KEYS.JOB_POSTS]) || [];
  const result = consumeQuota(usage, quota);
  if (!result.allowed) {
    throw new ApiError(402, MESSAGES.SUBSCRIPTION.QUOTA_JOB_POSTS_REACHED, ['SUBSCRIPTION_REQUIRED']);
  }
  req.user.subscription.usage = req.user.subscription.usage || {};
  req.user.subscription.usage[QUOTA_KEYS.JOB_POSTS] = result.prunedTimestamps;
  await req.user.save();

  const job = await Job.create({
    companyId: req.user._id,
    title,
    description,
    jobType,
    developerType,
    skills,
    experienceMin,
    experienceMax,
    payType,
    salaryMin,
    salaryMax,
    location,
    openings,
  });

  return new ApiResponse(201, { job }, 'Job posted').send(res);
});

/**
 * PUT /api/v1/jobs/:id
 * Company updates its own job posting (including opening/closing it).
 */
const updateJob = asyncHandler(async (req, res) => {
  const job = await Job.findOne({ _id: req.params.id, companyId: req.user._id });
  if (!job) throw ApiError.notFound('Job not found');

  const allowedFields = [
    'title', 'description', 'jobType', 'developerType', 'skills',
    'experienceMin', 'experienceMax', 'payType', 'salaryMin', 'salaryMax',
    'location', 'openings', 'status',
  ];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) job[field] = req.body[field];
  });

  await job.save();
  return new ApiResponse(200, { job }, 'Job updated').send(res);
});

/**
 * DELETE /api/v1/jobs/:id
 */
const deleteJob = asyncHandler(async (req, res) => {
  const job = await Job.findOneAndDelete({ _id: req.params.id, companyId: req.user._id });
  if (!job) throw ApiError.notFound('Job not found');
  await Application.deleteMany({ jobId: job._id });
  return new ApiResponse(200, null, 'Job deleted').send(res);
});

/**
 * GET /api/v1/jobs/me
 * Company's own job postings (any status), most recent first.
 */
const getMyJobs = asyncHandler(async (req, res) => {
  const jobs = await Job.find({ companyId: req.user._id }).sort('-createdAt');
  return new ApiResponse(200, { jobs }, 'Jobs fetched').send(res);
});

/**
 * GET /api/v1/jobs/search
 * Public "Browse Jobs" listing — only open jobs, with the same filter
 * shape as candidate search (skill/developerType/location/experience).
 */
const searchJobs = asyncHandler(async (req, res) => {
  const {
    q, skill, developerType, jobType, city, country, remote,
    minExperience, minSalary,
    page = 1, limit = 12, sort = '-createdAt',
  } = req.query;

  const filter = { status: 'open' };

  if (q) filter.$text = { $search: q };
  if (skill) filter.skills = { $in: [].concat(skill) };
  if (developerType) filter.developerType = developerType;
  if (jobType) filter.jobType = jobType;
  if (city) filter['location.city'] = new RegExp(city, 'i');
  if (country) filter['location.country'] = new RegExp(country, 'i');
  if (remote !== undefined) filter['location.remote'] = remote === 'true';
  if (minExperience) filter.experienceMin = { $lte: Number(minExperience) };
  if (minSalary) filter.salaryMax = { $gte: Number(minSalary) };

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [jobs, total] = await Promise.all([
    Job.find(filter)
      .populate('companyId', 'companyName logo location verificationStatus')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Job.countDocuments(filter),
  ]);

  // A logged-in candidate sees whether they've already applied to each
  // job, so the card can show "Applied" instead of an Apply button.
  if (req.user && req.user.role === 'candidate') {
    const applied = await Application.find({ candidateId: req.user._id, jobId: { $in: jobs.map((j) => j._id) } }).select('jobId');
    const appliedSet = new Set(applied.map((a) => a.jobId.toString()));
    jobs.forEach((j) => { j.hasApplied = appliedSet.has(j._id.toString()); });
  }

  return new ApiResponse(200, {
    jobs,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  }, 'Jobs fetched').send(res);
});

/**
 * GET /api/v1/jobs/:id
 * Public job detail view.
 */
const getJobById = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id).populate('companyId', 'companyName logo location verificationStatus website industry description');
  if (!job) throw ApiError.notFound('Job not found');

  let hasApplied = false;
  if (req.user && req.user.role === 'candidate') {
    hasApplied = !!(await Application.exists({ jobId: job._id, candidateId: req.user._id }));
  }

  return new ApiResponse(200, { job, hasApplied }, 'Job fetched').send(res);
});

module.exports = {
  createJob, updateJob, deleteJob, getMyJobs, searchJobs, getJobById,
};
