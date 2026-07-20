const mongoose = require('mongoose');
const authFieldsPlugin = require('./plugins/authFields');
const { VISIBILITY, VERIFICATION_STATUS } = require('../constants/status');

const educationSchema = new mongoose.Schema(
  {
    degree: { type: String, trim: true },
    institution: { type: String, trim: true },
    startYear: Number,
    endYear: Number,
  },
  { _id: false }
);

const certificateSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    issuer: { type: String, trim: true },
    issueDate: Date,
    fileUrl: { type: String }, // Cloudinary URL
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    link: { type: String, trim: true },
    techStack: [{ type: String, trim: true }],
  },
  { _id: false }
);

/**
 * Freelancer document — owns BOTH its login credentials (via authFieldsPlugin:
 * name/email/password/status/etc.) AND its profile data. Candidates and
 * Companies are deliberately kept in separate collections rather than a
 * single shared `users` table, since they are different kinds of accounts
 * with different fields, different search/index needs, and no reason to
 * ever be queried together as one homogeneous set.
 */
const candidateSchema = new mongoose.Schema(
  {
    profileImage: { type: String, default: '' },
    resume: { type: String, default: '' },
    headline: { type: String, trim: true, maxlength: 150 },
    about: { type: String, trim: true, maxlength: 2000 },
    // Self-selected on the profile form — kept as a simple enum (matching
    // the "Developer Type" filter groups on the Browse Freelancers page)
    // rather than derived from skills, so the candidate has direct control
    // over how they're categorized.
    // No fixed schema enum — the admin-managed DeveloperType collection is
    // the source of truth for valid values, checked in candidateController
    // / adminController before save so new admin-added types don't require
    // a schema/deploy change.
    developerType: {
      type: String,
      trim: true,
      default: '',
    },
    experience: { type: Number, default: 0, min: 0 },
    experienceMonths: { type: Number, default: 0, min: 0, max: 11 },
    // `primarySkills`/`secondarySkills` are what the candidate actually
    // picks on the profile form (two dropdowns). `skills` is kept as a
    // derived union of both — set automatically in candidateController —
    // so existing search/filter/index logic that only knows about a flat
    // `skills` array keeps working unchanged.
    primarySkills: [{ type: String, trim: true }],
    secondarySkills: [{ type: String, trim: true }],
    skills: [{ type: String, trim: true }],
    // Not required at the schema level: a Google/Phone/Email-link sign-up
    // creates the account first, then the dashboard prompts for this on
    // first login if it's still missing (see HourlyRatePrompt.jsx). The
    // classic local email/password register path still requires it via
    // registerCandidateValidator, before the document is ever created.
    hourlyRate: { type: Number, min: 0, default: null },
    availability: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'not-available'],
      default: 'full-time',
    },
    languages: [{ type: String, trim: true }],
    portfolioLinks: [{ type: String, trim: true }],
    github: { type: String, trim: true, default: '' },
    linkedin: { type: String, trim: true, default: '' },
    education: [educationSchema],
    certificates: [certificateSchema],
    projects: [projectSchema],
    rating: { type: Number, default: 4, min: 0, max: 5 },
    reviewsCount: { type: Number, default: 0, min: 0 },
    visibility: {
      type: String,
      enum: Object.values(VISIBILITY),
      default: VISIBILITY.PUBLIC,
    },
    verificationStatus: {
      type: String,
      enum: Object.values(VERIFICATION_STATUS),
      default: VERIFICATION_STATUS.UNVERIFIED,
    },
    location: {
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      country: { type: String, trim: true },
      remote: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

candidateSchema.plugin(authFieldsPlugin, { role: 'candidate' });

candidateSchema.index({ skills: 1 });
candidateSchema.index({ hourlyRate: 1 });
candidateSchema.index({ availability: 1 });
candidateSchema.index({ 'location.city': 1, 'location.country': 1 });
candidateSchema.index({ rating: -1 });
candidateSchema.index(
  { headline: 'text', about: 'text', skills: 'text' },
  { weights: { headline: 5, skills: 3, about: 1 }, name: 'candidate_text_search' }
);

module.exports = mongoose.model('Candidate', candidateSchema);
