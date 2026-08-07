const mongoose = require('mongoose');

/**
 * A candidate's application to a specific Job. One application per
 * (job, candidate) pair — enforced by the compound unique index below.
 */
const applicationSchema = new mongoose.Schema(
  {
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true, index: true },

    coverLetter: { type: String, trim: true, maxlength: 2000, default: '' },

    status: {
      type: String,
      enum: ['applied', 'shortlisted', 'rejected', 'hired'],
      default: 'applied',
      index: true,
    },

    // Snapshot of resume URL at time of applying, in case the candidate
    // updates/removes it later — the company still sees what was submitted.
    resumeSnapshot: { type: String, default: '' },

    // Feature 5 — questionnaire answers. The actual answers live in the
    // ApplicationAnswer collection; these fields aggregate the result so
    // the recruiter dashboard can sort by score without a separate query.
    questionnaireCompleted: { type: Boolean, default: false },
    totalQuestions: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
    // Computed overall score (0-100) across submitted answers.
    questionnaireScore: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true }
);

applicationSchema.index({ jobId: 1, candidateId: 1 }, { unique: true });
applicationSchema.index({ candidateId: 1, createdAt: -1 });
applicationSchema.index({ companyId: 1, createdAt: -1 });

module.exports = mongoose.model('Application', applicationSchema);
