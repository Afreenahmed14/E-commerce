const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const Job = require('../models/Job');
const Candidate = require('../models/Candidate');
const Company = require('../models/Company');
const Application = require('../models/Application');
const Review = require('../models/Review');
const { chatComplete } = require('../services/aiService');

/**
 * Feature 10 — Admin AI Dashboard.
 *
 * Pulls aggregate analytics from the existing collections (top skills, top
 * companies, most applied jobs, most active recruiters/candidates) and then
 * asks the AI for a natural-language "insight" summary of the metrics so an
 * admin can see trends without eyeballing tables.
 */

const getAdminInsights = asyncHandler(async (req, res) => {
  const [
    skillsAgg,
    jobAgg,
    companyAgg,
    activeCandidates,
    activeCompanies,
    totalJobs,
    totalCandidates,
    totalCompanies,
    totalApplications,
  ] = await Promise.all([
    // Top skills: unwind Job.skills and count occurrences across open jobs.
    Job.aggregate([
      { $unwind: '$skills' },
      { $group: { _id: { $toLower: '$skills' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    // Most applied jobs.
    Application.aggregate([
      { $group: { _id: '$jobId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    // Most active recruiters (companies by job postings).
    Job.aggregate([
      { $group: { _id: '$companyId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    // Most active candidates (by applications submitted).
    Application.aggregate([
      { $group: { _id: '$candidateId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    // Companies by number of applications received (engagement signal).
    Application.aggregate([
      { $group: { _id: '$companyId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    Job.countDocuments(),
    Candidate.countDocuments(),
    Company.countDocuments(),
    Application.countDocuments(),
  ]);

  // Hydrate ids -> readable names.
  const jobIds = jobAgg.map((j) => j._id);
  const jobs = await Job.find({ _id: { $in: jobIds } }).select('title companyId').lean();
  const jobMap = {};
  jobs.forEach((j) => {
    jobMap[j._id.toString()] = { title: j.title, companyId: j.companyId?.toString() || '' };
  });

  const companyIds = [...new Set([
    ...companyAgg.map((c) => c._id?.toString()),
    ...jobAgg.map((j) => jobMap[j._id?.toString()]?.companyId || ''),
    ...activeCompanies.map((c) => c._id?.toString()),
  ])].filter(Boolean);
  const companies = await Company.find({ _id: { $in: companyIds } }).select('companyName').lean();
  const companyMap = {};
  companies.forEach((c) => { companyMap[c._id.toString()] = c.companyName; });

  const candidateIds = activeCandidates.map((c) => c._id);
  const candidates = await Candidate.find({ _id: { $in: candidateIds } }).select('name headline').lean();
  const candidateMap = {};
  candidates.forEach((c) => { candidateMap[c._id.toString()] = c.name; });

  const topSkills = skillsAgg.map((s) => ({ skill: s._id, count: s.count }));
  const mostAppliedJobs = jobAgg.map((j) => ({
    jobId: j._id,
    title: jobMap[j._id?.toString()]?.title || 'Deleted job',
    company: companyMap[jobMap[j._id?.toString()]?.companyId] || '—',
    count: j.count,
  }));
  const mostActiveRecruiters = companyAgg.map((c) => ({
    companyId: c._id,
    companyName: companyMap[c._id?.toString()] || '—',
    jobCount: c.count,
  }));
  const mostActiveCandidates = activeCandidates.map((c) => ({
    candidateId: c._id,
    name: candidateMap[c._id?.toString()] || '—',
    applicationCount: c.count,
  }));
  const topCompaniesByApplications = activeCompanies.map((c) => ({
    companyId: c._id,
    companyName: companyMap[c._id?.toString()] || '—',
    applicationCount: c.count,
  }));

  const metrics = {
    totalJobs,
    totalCandidates,
    totalCompanies,
    totalApplications,
    topSkills,
    mostAppliedJobs,
    mostActiveRecruiters,
    mostActiveCandidates,
    topCompaniesByApplications,
  };

  // AI-generated natural-language insight (best-effort; fails gracefully).
  let aiInsight = '';
  try {
    aiInsight = await chatComplete([
      {
        role: 'system',
        content: 'You are a platform analytics expert for a recruitment marketplace. Given the metrics, write 2-3 concise, insightful sentences a product manager would find useful. No lists, no markdown—plain sentences.',
      },
      {
        role: 'user',
        content: JSON.stringify(metrics),
      },
    ], { maxTokens: 250 });
  } catch (e) {
    console.warn('[adminInsights] AI insight unavailable:', e.message);
    aiInsight = '';
  }

  return new ApiResponse(200, { metrics, aiInsight }, 'Insights fetched').send(res);
});

module.exports = { getAdminInsights };
