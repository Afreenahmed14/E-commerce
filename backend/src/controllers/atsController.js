const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const Job = require('../models/Job');
const ResumeAnalysis = require('../models/ResumeAnalysis');
const { analyzeResume, matchResumeToJob, extractTextFromBuffer } = require('../services/atsService');
const { matchResumeWithAllJobs } = require('../services/jobMatchService');
const { uploadFile, deleteFile } = require('../services/cloudinaryService');

const MODEL_NAME_BY_ROLE = { candidate: 'Candidate', company: 'Company', admin: 'Admin' };

/**
 * POST /api/v1/ats/analyze
 * Candidate uploads a resume (PDF/DOCX/image) and gets an ATS score,
 * suggestions, and improved summary. Accepts an optional `jobId` to also
 * return a match % against that specific job.
 */
const analyzeResumeHandler = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Please upload a resume file');

  const { jobId } = req.body;
  const isImage = req.file.mimetype.startsWith('image/');

  // Store the file on Cloudinary for the candidate's records.
  const resumeUrl = await uploadFile(req.file, 'ats-resumes');

  // For images, the resumeParserService can't extract text locally, so we
  // send the image URL to the AI as a vision input via the analysis step.
  // To keep the pipeline uniform, we attempt local extraction and fall
  // back to a placeholder if the format is an image.
  let extractedText = '';
  try {
    if (isImage) {
      extractedText = `[Image resume uploaded at ${resumeUrl}]`;
    } else {
      extractedText = await extractTextFromBuffer(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname
      );
    }
  } catch (err) {
    extractedText = `[Could not extract text: ${err.message}]`;
  }

  const analysis = await analyzeResume(req.file.buffer, req.file.mimetype, req.file.originalname);

  // Optional specific-job match.
  let jobMatch = null;
  if (jobId) {
    const job = await Job.findById(jobId).populate('companyId', 'companyName').lean();
    if (job) {
      jobMatch = await matchResumeToJob(analysis.extractedText, {
        ...job,
        companyName: job.companyId?.companyName || '',
      });
    }
  }

// Compute full job-match results (bucketed) automatically.
  let matchResults = [];
  let bestMatch = null;
  try {
    const buckets = await matchResumeWithAllJobs(analysis.extractedText);
    matchResults = [
      ...buckets.bestMatch.map((m) => ({ ...m, category: 'best' })),
      ...buckets.goodMatch.map((m) => ({ ...m, category: 'good' })),
      ...buckets.lowMatch.map((m) => ({ ...m, category: 'low' })),
    ];
    if (buckets.bestMatch.length) {
      bestMatch = buckets.bestMatch[0];
    }
  } catch (err) {
    console.warn('[atsController] job matching failed:', err.message);
  }

  // Persist for the candidate's history + reuse by job matching.
  const saved = await ResumeAnalysis.create({
    candidateId: req.user._id,
    resumeUrl,
    extractedText: analysis.extractedText,
    atsScore: analysis.atsScore,
    atsBreakdown: analysis.atsBreakdown,
    suggestions: analysis.suggestions,
    missingKeywords: analysis.missingKeywords,
    recommendedSkills: analysis.recommendedSkills,
    recommendedCertifications: analysis.recommendedCertifications,
    recommendedProjects: analysis.recommendedProjects,
    improvedSummary: analysis.improvedSummary,
    bestMatch,
    matchResults,
  });

  // Update candidate's resumeAnalysis reference.
  if (req.user.role === 'candidate') {
    req.user.resumeAnalysis = saved._id;
    await req.user.save();
  }

  return new ApiResponse(201, {
    analysis,
    jobMatch,
    savedAnalysisId: saved._id,
  }, 'Resume analyzed successfully').send(res);
});

/**
 * POST /api/v1/ats/match
 * Compares the candidate's latest resume (or a freshly uploaded one)
 * against all open jobs and returns bucketed matches.
 * Body: { jobId? } — if omitted, uses the candidate's saved resume.
 */
const matchAllJobsHandler = asyncHandler(async (req, res) => {
  const { jobId } = req.body;

  let extractedText = null;
  let resumeUrl = '';

  if (req.file) {
    resumeUrl = await uploadFile(req.file, 'ats-resumes');
    try {
      extractedText = await extractTextFromBuffer(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname
      );
    } catch (err) {
      extractedText = `[Could not extract text: ${err.message}]`;
    }
  } else if (req.user.role === 'candidate' && req.user.resume) {
    resumeUrl = req.user.resume;
    // We don't have the raw text stored; re-run analysis on the saved URL
    // is not possible without downloading. If no fresh file is provided and
    // only jobId is set to a single job, we can still match by fetching the
    // candidate's stored ResumeAnalysis text if present.
    const saved = await ResumeAnalysis.findById(req.user.resumeAnalysis).lean();
    extractedText = saved?.extractedText || `[Resume on file: ${resumeUrl}]`;
  } else {
    throw ApiError.badRequest('Please provide a resume file to match');
  }

  // A single specific job match takes priority.
  if (jobId) {
    const job = await Job.findById(jobId).populate('companyId', 'companyName').lean();
    if (!job) throw ApiError.notFound('Job not found');
    const match = await matchResumeToJob(extractedText, {
      ...job,
      companyName: job.companyId?.companyName || '',
    });
    return new ApiResponse(200, { match }, 'Job match computed').send(res);
  }

  const results = await matchResumeWithAllJobs(extractedText);
  return new ApiResponse(200, results, 'Job matches computed').send(res);
});

/**
 * GET /api/v1/ats/history
 * Candidate's past resume analyses.
 */
const getMyAnalyses = asyncHandler(async (req, res) => {
  const analyses = await ResumeAnalysis.find({ candidateId: req.user._id })
    .sort('-createdAt')
    .limit(20)
    .lean();
  return new ApiResponse(200, { analyses }, 'Resume analyses fetched').send(res);
});

module.exports = { analyzeResumeHandler, matchAllJobsHandler, getMyAnalyses };
