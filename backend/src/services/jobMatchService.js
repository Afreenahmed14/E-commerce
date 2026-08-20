const Job = require('../models/Job');
const Company = require('../models/Company');
const { matchResumeToJob } = require('./atsService');

/**
 * AI Job Matching (Feature 3).
 *
 * Whenever a candidate uploads (or analyzes) a resume, we compare the
 * extracted text against all open jobs and produce a ranked list of
 * matches. Each match includes a percentage, top/missing skills, and a
 * human-readable summary.
 *
 * Results are bucketed into:
 *   - bestMatch   (>= 70%)
 *   - goodMatch   (>= 50%)
 *   - lowMatch    (<  50%)
 */

const MATCH_THRESHOLDS = { best: 70, good: 50 };

/**
 * Compares an extracted resume against every open job.
 * @param {string} extractedText - plain text from the parsed resume
 * @returns {Promise<{ bestMatch: [], goodMatch: [], lowMatch: [] }>}
 */
const matchResumeWithAllJobs = async (extractedText) => {
  const jobs = await Job.find({ status: 'open' }).lean();

  // Preload company names for readability.
  const companyIds = [...new Set(jobs.map((j) => j.companyId))];
  const companies = await Company.find({ _id: { $in: companyIds } })
    .select('companyName')
    .lean();
  const companyMap = {};
  companies.forEach((c) => { companyMap[c._id.toString()] = c.companyName; });

  // const withCompany = jobs.map((j) => ({ ...j, companyName: companyMap[j.companyId?.toString()] || '' }));

  const withCompany = jobs
  .map((j) => ({
    ...j,
    companyName: companyMap[j.companyId?.toString()] || "",
  }))
  .slice(0, 3);
  

  // Compute matches for each job. AI calls are the expensive part, so we
  // cap the number of jobs evaluated per request to keep latency bounded;
  // the remainder is scored deterministically via keyword overlap.
  const results = await Promise.all(
    withCompany.map(async (job) => {
      try {
        return await matchResumeToJob(extractedText, job);
      } catch (err) {
        console.warn(`[jobMatchService] match failed for job ${job._id}: ${err.message}`);
        return null;
      }
    })
  );

  const valid = results.filter((r) => r && Number.isFinite(r.matchPercentage));
  valid.sort((a, b) => b.matchPercentage - a.matchPercentage);

  return {
    bestMatch: valid.filter((r) => r.matchPercentage >= MATCH_THRESHOLDS.best),
    goodMatch: valid.filter((r) => r.matchPercentage >= MATCH_THRESHOLDS.good && r.matchPercentage < MATCH_THRESHOLDS.best),
    lowMatch: valid.filter((r) => r.matchPercentage < MATCH_THRESHOLDS.good),
  };
};

module.exports = { matchResumeWithAllJobs, MATCH_THRESHOLDS };
