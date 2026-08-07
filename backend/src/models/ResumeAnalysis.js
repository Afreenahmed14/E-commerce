const mongoose = require('mongoose');

/**
 * Result of an ATS resume analysis (Feature 2) and AI job matching
 * (Feature 3). One analysis per candidate's resume upload. Stores the
 * ATS score, keyword/suggestion feedback, improved summary, recommended
 * skills/certifications/projects, and per-job match percentages.
 */
const resumeAnalysisSchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true, index: true },
    // Resume file that was analyzed (Cloudinary URL).
    resumeUrl: { type: String, default: '' },
    // Raw extracted text (bounded) — kept for reference/audit.
    extractedText: { type: String, default: '' },

    // ---- ATS Score (Feature 2) ----
    atsScore: { type: Number, default: 0, min: 0, max: 100 },
    atsBreakdown: {
      keywords: { type: Number, default: 0 },
      formatting: { type: Number, default: 0 },
      sections: { type: Number, default: 0 },
      achievements: { type: Number, default: 0 },
      actionVerbs: { type: Number, default: 0 },
      grammar: { type: Number, default: 0 },
      readability: { type: Number, default: 0 },
    },
    suggestions: [{ type: String }],
    missingKeywords: [{ type: String }],
    recommendedSkills: [{ type: String }],
    recommendedCertifications: [{ type: String }],
    recommendedProjects: [{ type: String }],
    improvedSummary: { type: String, default: '' },
    downloadUrl: { type: String, default: '' }, // generated improved resume

    // ---- Job Matching (Feature 3) ----
    // Best match summary across all open jobs.
    bestMatch: {
      jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', default: null },
      jobTitle: { type: String, default: '' },
      companyName: { type: String, default: '' },
      matchPercentage: { type: Number, default: 0 },
    },
    // Full per-job match results cached here.
    matchResults: [
      {
        jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
        jobTitle: { type: String, default: '' },
        companyName: { type: String, default: '' },
        matchPercentage: { type: Number, default: 0 },
        topSkillsMatch: [{ type: String }],
        missingSkills: [{ type: String }],
        category: { type: String, enum: ['best', 'good', 'low'], default: 'low' },
      },
    ],
  },
  { timestamps: true }
);

resumeAnalysisSchema.index({ candidateId: 1, createdAt: -1 });

module.exports = mongoose.model('ResumeAnalysis', resumeAnalysisSchema);
