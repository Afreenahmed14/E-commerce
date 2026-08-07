const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const Interview = require('../models/Interview');
const Application = require('../models/Application');
const Job = require('../models/Job');
const { notify } = require('../services/notificationHelper');
const { sendInterviewEmail } = require('../services/emailService');

/**
 * Feature 9 — Interview Management.
 *
 * Recruiter schedules an interview (with a Google Meet / Zoom / Teams link);
 * candidate accepts, rejects, or requests a reschedule. Emails are sent on
 * each transition (Feature 8).
 */

/**
 * POST /api/v1/interviews
 * Recruiter schedules an interview for an applicant.
 * Body: { applicationId, platform, meetingLink, scheduledAt, durationMinutes, title, notes }
 */
const createInterview = asyncHandler(async (req, res) => {
  const {
    applicationId, platform = 'google-meet', meetingLink = '',
    scheduledAt, durationMinutes = 60, title = 'Interview', notes = '',
  } = req.body;

  if (!scheduledAt) throw ApiError.badRequest('scheduledAt is required');

  const application = await Application.findById(applicationId)
    .populate('candidateId', 'name email')
    .populate('jobId', 'title')
    .lean();
  if (!application) throw ApiError.notFound('Application not found');

  // Verify the recruiter owns the job this application belongs to.
  const job = await Job.findOne({ _id: application.jobId?._id, companyId: req.user._id });
  if (!job) throw ApiError.forbidden('You do not own this job');

  const interview = await Interview.create({
    applicationId,
    jobId: application.jobId?._id,
    companyId: req.user._id,
    candidateId: application.candidateId?._id,
    platform,
    meetingLink,
    title,
    scheduledAt,
    durationMinutes,
    notes,
  });

  // Notify + email the candidate.
  await notify({
    userId: application.candidateId?._id,
    role: 'candidate',
    title: 'Interview scheduled',
    message: `You have an interview for "${application.jobId?.title}" on ${new Date(scheduledAt).toLocaleString()}.`,
    type: 'interview',
    link: '/candidate/dashboard/interviews',
  });

  sendInterviewEmail(application.candidateId?.email, {
    userName: application.candidateId?.name,
    jobTitle: application.jobId?.title,
    companyName: req.user.companyName,
    date: new Date(scheduledAt).toLocaleDateString(),
    time: new Date(scheduledAt).toLocaleTimeString(),
    link: meetingLink,
    status: 'scheduled',
  }).catch((e) => console.warn('[interview] email skipped:', e.message));

  return new ApiResponse(201, { interview }, 'Interview scheduled').send(res);
});

/**
 * GET /api/v1/interviews/me
 * Candidate's own interviews (upcoming first).
 */
const getMyInterviews = asyncHandler(async (req, res) => {
  const interviews = await Interview.find({ candidateId: req.user._id })
    .populate('jobId', 'title')
    .populate('companyId', 'companyName logo')
    .sort({ scheduledAt: 1 });

  return new ApiResponse(200, { interviews }, 'Interviews fetched').send(res);
});

/**
 * GET /api/v1/interviews/company
 * Recruiter's interviews (upcoming first).
 */
const getCompanyInterviews = asyncHandler(async (req, res) => {
  const interviews = await Interview.find({ companyId: req.user._id })
    .populate('candidateId', 'name email profileImage headline')
    .populate('jobId', 'title')
    .sort({ scheduledAt: 1 });

  return new ApiResponse(200, { interviews }, 'Interviews fetched').send(res);
});

/**
 * PATCH /api/v1/interviews/:id/respond
 * Candidate accepts/rejects an interview. Body: { action: 'accept'|'reject' }
 */
const respondToInterview = asyncHandler(async (req, res) => {
  const { action } = req.body;
  if (!['accept', 'reject'].includes(action)) {
    throw ApiError.badRequest('action must be accept or reject');
  }

  const interview = await Interview.findOne({ _id: req.params.id, candidateId: req.user._id });
  if (!interview) throw ApiError.notFound('Interview not found');

  interview.status = action === 'accept' ? 'accepted' : 'rejected';
  await interview.save();

  const application = await Application.findById(interview.applicationId).lean();
  const job = await Job.findById(interview.jobId).select('title').lean();

  await notify({
    userId: interview.companyId,
    role: 'company',
    title: `Interview ${action === 'accept' ? 'accepted' : 'rejected'}`,
    message: `A candidate ${action === 'accept' ? 'accepted' : 'rejected'} the interview for "${job?.title}".`,
    type: 'interview',
    link: '/company/dashboard/interviews',
  });

  return new ApiResponse(200, { interview }, `Interview ${action}ed`).send(res);
});

/**
 * PATCH /api/v1/interviews/:id/reschedule
 * Candidate requests a reschedule. Body: { proposedAt, note }
 */
const requestReschedule = asyncHandler(async (req, res) => {
  const { proposedAt, note = '' } = req.body;
  if (!proposedAt) throw ApiError.badRequest('proposedAt is required');

  const interview = await Interview.findOne({ _id: req.params.id, candidateId: req.user._id });
  if (!interview) throw ApiError.notFound('Interview not found');

  interview.status = 'rescheduled';
  interview.rescheduleRequest = { proposedAt, note };
  await interview.save();

  const job = await Job.findById(interview.jobId).select('title').lean();

  await notify({
    userId: interview.companyId,
    role: 'company',
    title: 'Interview reschedule requested',
    message: `A candidate requested to reschedule the interview for "${job?.title}" to ${new Date(proposedAt).toLocaleString()}.`,
    type: 'interview',
    link: '/company/dashboard/interviews',
  });

  return new ApiResponse(200, { interview }, 'Reschedule requested').send(res);
});

/**
 * PATCH /api/v1/interviews/:id/reschedule/confirm
 * Recruiter confirms a new time. Body: { scheduledAt }
 */
const confirmReschedule = asyncHandler(async (req, res) => {
  const { scheduledAt } = req.body;
  if (!scheduledAt) throw ApiError.badRequest('scheduledAt is required');

  const interview = await Interview.findOne({ _id: req.params.id, companyId: req.user._id });
  if (!interview) throw ApiError.notFound('Interview not found');

  interview.scheduledAt = scheduledAt;
  interview.status = 'accepted';
  interview.rescheduleRequest = { proposedAt: null, note: '' };
  await interview.save();

  const application = await Application.findById(interview.applicationId)
    .populate('candidateId', 'name email')
    .populate('jobId', 'title')
    .lean();

  await notify({
    userId: interview.candidateId,
    role: 'candidate',
    title: 'Interview rescheduled',
    message: `Your interview for "${application.jobId?.title}" is confirmed for ${new Date(scheduledAt).toLocaleString()}.`,
    type: 'interview',
    link: '/candidate/dashboard/interviews',
  });

  sendInterviewEmail(application.candidateId?.email, {
    userName: application.candidateId?.name,
    jobTitle: application.jobId?.title,
    companyName: req.user.companyName,
    date: new Date(scheduledAt).toLocaleDateString(),
    time: new Date(scheduledAt).toLocaleTimeString(),
    link: interview.meetingLink,
    status: 'rescheduled',
  }).catch((e) => console.warn('[interview] email skipped:', e.message));

  return new ApiResponse(200, { interview }, 'Reschedule confirmed').send(res);
});

/**
 * PATCH /api/v1/interviews/:id/cancel
 * Recruiter cancels an interview.
 */
const cancelInterview = asyncHandler(async (req, res) => {
  const interview = await Interview.findOne({ _id: req.params.id, companyId: req.user._id });
  if (!interview) throw ApiError.notFound('Interview not found');

  interview.status = 'cancelled';
  await interview.save();

  await notify({
    userId: interview.candidateId,
    role: 'candidate',
    title: 'Interview cancelled',
    message: 'One of your scheduled interviews has been cancelled.',
    type: 'interview',
    link: '/candidate/dashboard/interviews',
  });

  return new ApiResponse(200, { interview }, 'Interview cancelled').send(res);
});

module.exports = {
  createInterview,
  getMyInterviews,
  getCompanyInterviews,
  respondToInterview,
  requestReschedule,
  confirmReschedule,
  cancelInterview,
};
