const { extractJSON, chatComplete } = require('./aiService');
const { extractTextFromBuffer } = require('./resumeParserService');

/**
 * ATS Resume Checker (Feature 2). This service:
 *  1. Extracts text from an uploaded PDF/DOCX/image resume.
 *  2. Asks the AI to score it out of 100 across ATS dimensions.
 *  3. Returns suggestions, missing keywords, improved summary, and
 *     recommended skills/certifications/projects.
 *  4. Optionally computes a match % against a specific job.
 *
 * The heavy lifting (natural-language ATS familiarity) is delegated to the
 * shared AI layer; the deterministic parts (keyword presence, section
 * detection) are handled locally so the result is fast and cheap.
 */

const ATS_SYSTEM_PROMPT = `You are an expert ATS (Applicant Tracking System) resume reviewer and professional resume writer.
Analyze the resume text provided and return STRICT JSON with exactly this shape:
{
  "atsScore": <number 0-100>,
  "atsBreakdown": { "keywords": 0, "formatting": 0, "sections": 0, "achievements": 0, "actionVerbs": 0, "grammar": 0, "readability": 0 },
  "suggestions": ["..."],
  "missingKeywords": ["..."],
  "recommendedSkills": ["..."],
  "recommendedCertifications": ["..."],
  "recommendedProjects": ["..."],
  "improvedSummary": "A concise, keyword-optimized professional summary for the resume top section."
}
Rules:
- atsScore is the overall out of 100.
- Each atsBreakdown sub-score is 0-100.
- missingKeywords should be common role-relevant skills/keywords absent from the resume.
- improvedSummary should be 2-3 sentences, ATS-friendly, keyword-rich.
- Keep suggestions actionable and specific.`;

/** Deterministic section-presence hints (headings ATS systems look for). */
const SECTIONS = [
  'experience', 'work experience', 'employment', 'projects', 'education',
  'skills', 'technical skills', 'summary', 'profile', 'objective', 'certification',
  'accomplishments', 'achievements', 'publications', 'languages',
];

/** Deterministic action verbs ATS systems reward. */
const ACTION_VERBS = [
  'led', 'managed', 'built', 'developed', 'designed', 'implemented', 'created',
  'launched', 'improved', 'reduced', 'increased', 'achieved', 'delivered',
  'optimized', 'automated', 'collaborated', 'mentored', 'architected', 'shipped',
];

/**
 * Runs the full ATS analysis for a candidate's resume.
 * @param {Buffer} buffer - file buffer
 * @param {string} mimetype
 * @param {string} originalName
 * @returns {Promise<object>} ATS result object
 */
const analyzeResume = async (buffer, mimetype, originalName) => {
  const extractedText = await extractTextFromBuffer(buffer, mimetype, originalName);

  // Deterministic local scoring (cheap, always runs) to seed the breakdown.
  const textLower = extractedText.toLowerCase();
  const sectionsFound = SECTIONS.filter((s) => textLower.includes(s)).length;
  const verbsFound = ACTION_VERBS.filter((v) => textLower.includes(v)).length;
  const sectionsScore = Math.min(100, Math.round((sectionsFound / SECTIONS.length) * 100));
  const actionScore = Math.min(100, Math.round((verbsFound / ACTION_VERBS.length) * 100));
  const readabilityScore = Math.min(100, Math.round((extractedText.length / 4000) * 100) || 40);

  // Ask the AI for the full ATS critique + optimization.
  const aiResult = await extractJSON(ATS_SYSTEM_PROMPT, `Resume text:\n"""\n${extractedText}\n"""`);

  return {
    extractedText,
    atsScore: clamp(aiResult.atsScore),
    atsBreakdown: {
      keywords: clamp(aiResult.atsBreakdown?.keywords),
      formatting: clamp(aiResult.atsBreakdown?.formatting),
      sections: clamp(aiResult.atsBreakdown?.sections) || sectionsScore,
      achievements: clamp(aiResult.atsBreakdown?.achievements),
      actionVerbs: clamp(aiResult.atsBreakdown?.actionVerbs) || actionScore,
      grammar: clamp(aiResult.atsBreakdown?.grammar),
      readability: clamp(aiResult.atsBreakdown?.readability) || readabilityScore,
    },
    suggestions: aiResult.suggestions || [],
    missingKeywords: aiResult.missingKeywords || [],
    recommendedSkills: aiResult.recommendedSkills || [],
    recommendedCertifications: aiResult.recommendedCertifications || [],
    recommendedProjects: aiResult.recommendedProjects || [],
    improvedSummary: aiResult.improvedSummary || '',
  };
};

/**
 * Computes a match % between an extracted resume and a specific job.
 * Uses the AI for a nuanced explanation + a deterministic keyword overlap
 * as a bounded, fast fallback.
 */
const matchResumeToJob = async (extractedText, job) => {
  const resumeLower = extractedText.toLowerCase();
  const jobSkills = (job.skills || []).map((s) => s.toLowerCase());
  const matched = jobSkills.filter((s) => resumeLower.includes(s));
  const missing = jobSkills.filter((s) => !resumeLower.includes(s));
  const keywordScore = jobSkills.length
    ? Math.round((matched.length / jobSkills.length) * 100)
    : 50;

  const aiResult = await extractJSON(
    'You are a job-matching expert. Given a resume and a job, return STRICT JSON: { "matchPercentage": 0-100, "topSkillsMatch": [], "missingSkills": [], "summary": "one sentence" }.',
    `Resume:\n"""\n${extractedText}\n"""\n\nJob title: ${job.title}\nJob description:\n${job.description}\nJob skills: ${(job.skills || []).join(', ')}`
  ).catch(() => null);

  return {
    jobId: job._id,
    jobTitle: job.title,
    companyName: job.companyName || '',
    matchPercentage: clamp(aiResult?.matchPercentage, keywordScore),
    topSkillsMatch: aiResult?.topSkillsMatch || matched,
    missingSkills: aiResult?.missingSkills || missing,
    summary: aiResult?.summary || '',
  };
};

const clamp = (val, fallback = 0) => {
  const n = Number(val);
  if (Number.isFinite(n)) return Math.max(0, Math.min(100, Math.round(n)));
  return fallback;
};

module.exports = { analyzeResume, matchResumeToJob, extractTextFromBuffer };
