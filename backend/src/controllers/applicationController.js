const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const Application = require('../models/Application');
const ApplicationAnswer = require('../models/ApplicationAnswer');
const JobQuestion = require('../models/JobQuestion');
const Job = require('../models/Job');
const Notification = require('../models/Notification');
const { PRODUCTS, QUOTA_KEYS, getQuota } = require('../constants/plans');
const { consumeQuota } = require('../utils/quota');
const { ensureSubscriptionFresh } = require('./subscriptionController');
const { sendApplicationSubmittedEmail } = require('../services/emailService');
const MESSAGES = require('../constants/messages');

/**
 * POST /api/v1/applications
 * body: { jobId, coverLetter }
 * Candidate applies to an open job. One application per (job, candidate).
 * Gated by the candidate's JOB_APPLICATIONS quota for their current
 * subscription tier (see constants/plans.js). A candidate may be on either
 * CANDIDATE_BASIC or CANDIDATE_PRO — both define this quota, so we read
 * whichever product the account is actually subscribed to.
 */
const applyToJob = asyncHandler(async (req, res) => {
  const { jobId, coverLetter, answers } = req.body;

  const job = await Job.findById(jobId);
  if (!job) throw ApiError.notFound('Job not found');
  if (job.status !== 'open') throw ApiError.badRequest('This job is no longer accepting applications');

  const existing = await Application.findOne({ jobId, candidateId: req.user._id });
  if (existing) throw ApiError.conflict('You have already applied to this job');

  await ensureSubscriptionFresh(req.user);
  const sub = req.user.subscription || {};
  const product = sub.product || PRODUCTS.CANDIDATE_BASIC;
  const quota = getQuota(product, sub.tier, QUOTA_KEYS.JOB_APPLICATIONS);
  const usage = (sub.usage && sub.usage[QUOTA_KEYS.JOB_APPLICATIONS]) || [];
  const result = consumeQuota(usage, quota);
  if (!result.allowed) {
    throw new ApiError(402, MESSAGES.SUBSCRIPTION.QUOTA_JOB_APPLICATIONS_REACHED, ['SUBSCRIPTION_REQUIRED']);
  }
  req.user.subscription.usage = req.user.subscription.usage || {};
  req.user.subscription.usage[QUOTA_KEYS.JOB_APPLICATIONS] = result.prunedTimestamps;
  await req.user.save();

  const application = await Application.create({
    jobId,
    companyId: job.companyId,
    candidateId: req.user._id,
    coverLetter,
    resumeSnapshot: req.user.resume || '',
  });

  // Feature 5 — process + score the questionnaire answers if provided.
  let questionnaireSummary = { completed: false, total: 0, correct: 0, score: 0 };
  if (Array.isArray(answers) && answers.length > 0) {
    const jobQuestions = await JobQuestion.find({ jobId }).lean();
    const qMap = {};
    jobQuestions.forEach((q) => { qMap[q._id.toString()] = q; });

    const answerDocs = [];
    let correct = 0;
    const total = answers.length;

    for (const a of answers) {
      const q = qMap[a.questionId];
      if (!q) continue;
      let isCorrect = false;
      let score = 0;

      if (q.type === 'mcq') {
        // a.answer is the selected option index.
        const selectedIdx = Number(a.answer);
        isCorrect = selectedIdx === q.correctOptionIndex;
        score = isCorrect ? 100 : 0;
        if (isCorrect) correct++;
      } else {
        // technical/screening: free text — binary pass (presence) for now.
        isCorrect = !!(a.answer && a.answer.trim());
        score = isCorrect ? 60 : 0;
        if (isCorrect) correct++;
      }

      answerDocs.push({
        applicationId: application._id,
        questionId: q._id,
        answer: String(a.answer),
        isCorrect,
        score,
      });
    }

    if (answerDocs.length) {
      await ApplicationAnswer.insertMany(answerDocs);
      const overallScore = total ? Math.round((correct / total) * 100) : 0;
      questionnaireSummary = { completed: true, total, correct, score: overallScore };

      application.questionnaireCompleted = true;
      application.totalQuestions = total;
      application.correctAnswers = correct;
      application.questionnaireScore = overallScore;
      await application.save();
    }
  }

  job.applicationsCount = (job.applicationsCount || 0) + 1;
  await job.save();

  await Notification.create({
    userId: job.companyId,
    userModel: 'Company',
    title: 'New application received',
    message: `${req.user.name} applied to your job posting "${job.title}".`,
    type: 'application',
    link: `/company/dashboard/jobs/${job._id}/applicants`,
  });

  // Email confirmation to the candidate (Feature 8).
  const company = await require('../models/Company').findById(job.companyId).select('companyName').lean();
  sendApplicationSubmittedEmail(req.user.email, {
    candidateName: req.user.name,
    jobTitle: job.title,
    companyName: company?.companyName || 'the company',
  }).catch((e) => console.warn('[application] email skipped:', e.message));

  return new ApiResponse(201, { application, questionnaire: questionnaireSummary }, 'Application submitted').send(res);
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

  // Feature 5 — attach each applicant's questionnaire answers + question
  // metadata so the recruiter dashboard can show Q&A and per-question score.
  const appIds = applications.map((a) => a._id);
  const answers = await ApplicationAnswer.find({ applicationId: { $in: appIds } })
    .populate('questionId', 'question type options correctAnswer correctOptionIndex order')
    .lean();

  const answersByApp = {};
  answers.forEach((ans) => {
    const key = String(ans.applicationId);
    if (!answersByApp[key]) answersByApp[key] = [];
    answersByApp[key].push({
      question: ans.questionId,
      answer: ans.answer,
      isCorrect: ans.isCorrect,
      score: ans.score,
    });
  });

  const result = applications.map((app) => ({
    ...app.toObject(),
    answers: answersByApp[String(app._id)] || [],
  }));

  return new ApiResponse(200, { job, applications: result }, 'Applications fetched').send(res);
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
