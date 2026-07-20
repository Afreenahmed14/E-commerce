const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const Application = require('../models/Application');
const Job = require('../models/Job');
const Notification = require('../models/Notification');

/**
 * POST /api/v1/applications
 * body: { jobId, coverLetter }
 * Candidate applies to an open job. One application per (job, candidate).
 */
const applyToJob = asyncHandler(async (req, res) => {
  const { jobId, coverLetter } = req.body;

  const job = await Job.findById(jobId);
  if (!job) throw ApiError.notFound('Job not found');
  if (job.status !== 'open') throw ApiError.badRequest('This job is no longer accepting applications');

  const existing = await Application.findOne({ jobId, candidateId: req.user._id });
  if (existing) throw ApiError.conflict('You have already applied to this job');

  const application = await Application.create({
    jobId,
    companyId: job.companyId,
    candidateId: req.user._id,
    coverLetter,
    resumeSnapshot: req.user.resume || '',
  });

  job.applicationsCount = (job.applicationsCount || 0) + 1;
  await job.save();

  await Notification.create({
    userId: job.companyId,
    userModel: 'Company',
    title: 'New application received',
    message: `${req.user.name} applied to your job posting "${job.title}".`,
    type: 'info',
  });

  return new ApiResponse(201, { application }, 'Application submitted').send(res);
});

/**
 * GET /api/v1/applications/me
 * Candidate's own applications, most recent first.
 */
const getMyApplications = asyncHandler(async (req, res) => {
  const applications = await Application.find({ candidateId: req.user._id })
    .populate('jobId', 'title jobType location status')
    .populate('companyId', 'companyName logo')
    .sort('-createdAt');

  return new ApiResponse(200, { applications }, 'Applications fetched').send(res);
});

/**
 * DELETE /api/v1/applications/:id
 * Candidate withdraws their own application.
 */
const withdrawApplication = asyncHandler(async (req, res) => {
  const application = await Application.findOneAndDelete({ _id: req.params.id, candidateId: req.user._id });
  if (!application) throw ApiError.notFound('Application not found');

  await Job.findByIdAndUpdate(application.jobId, { $inc: { applicationsCount: -1 } });

  return new ApiResponse(200, null, 'Application withdrawn').send(res);
});

/**
 * GET /api/v1/applications/job/:jobId
 * Company views all applicants for one of its own jobs.
 */
const getApplicationsForJob = asyncHandler(async (req, res) => {
  const job = await Job.findOne({ _id: req.params.jobId, companyId: req.user._id });
  if (!job) throw ApiError.notFound('Job not found');

  const applications = await Application.find({ jobId: job._id })
    .populate('candidateId', 'name headline profileImage resume experience skills rating')
    .sort('-createdAt');

  return new ApiResponse(200, { job, applications }, 'Applications fetched').send(res);
});

/**
 * PATCH /api/v1/applications/:id/status
 * Company updates an applicant's status (shortlisted / rejected / hired).
 */
const updateApplicationStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['applied', 'shortlisted', 'rejected', 'hired'].includes(status)) {
    throw ApiError.badRequest('Invalid status value');
  }

  const application = await Application.findOne({ _id: req.params.id, companyId: req.user._id });
  if (!application) throw ApiError.notFound('Application not found');

  application.status = status;
  await application.save();

  const job = await Job.findById(application.jobId).select('title');

  await Notification.create({
    userId: application.candidateId,
    userModel: 'Candidate',
    title: 'Application status updated',
    message: `Your application for "${job?.title || 'a job'}" is now: ${status}.`,
    type: status === 'rejected' ? 'warning' : 'info',
  });

  return new ApiResponse(200, { application }, 'Application status updated').send(res);
});

module.exports = {
  applyToJob, getMyApplications, withdrawApplication, getApplicationsForJob, updateApplicationStatus,
};
