const mongoose = require('mongoose');

/**
 * A full-time/part-time/contract job posting created by a Company.
 * Candidates browse & apply to these (see Application.js) — this is the
 * Naukri-style "job board" model, replacing the old hourly-freelance
 * unlock/hire flow.
 */
const jobSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },

    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },

    jobType: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'internship'],
      default: 'full-time',
    },

    // Mirrors Candidate.developerType / primarySkills so the same
    // DeveloperType/Skill taxonomy powers both profile search and job search.
    developerType: { type: String, trim: true, default: '' },
    skills: [{ type: String, trim: true }],

    experienceMin: { type: Number, min: 0, default: 0 }, // years
    experienceMax: { type: Number, min: 0, default: null },

    // How the pay figures below should be interpreted/displayed.
    payType: {
      type: String,
      enum: ['yearly', 'monthly', 'weekly', 'hourly'],
      default: 'yearly',
    },

    salaryMin: { type: Number, min: 0, default: null }, // in rupees, per payType period
    salaryMax: { type: Number, min: 0, default: null },

    location: {
      city: { type: String, trim: true, default: '' },
      state: { type: String, trim: true, default: '' },
      country: { type: String, trim: true, default: '' },
      remote: { type: Boolean, default: false },
    },

    openings: { type: Number, min: 1, default: 1 },

    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
      index: true,
    },

    applicationsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

jobSchema.index({ title: 'text', description: 'text', skills: 'text' });
jobSchema.index({ companyId: 1, status: 1 });
jobSchema.index({ developerType: 1, status: 1 });
jobSchema.index({ 'location.city': 1 });

module.exports = mongoose.model('Job', jobSchema);
