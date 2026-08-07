const mongoose = require('mongoose');

/**
 * Stores a candidate's answers to a job's questionnaire (Feature 5).
 * One document per (application, question). The recruiter dashboard reads
 * these to review answers and see the auto-scored result.
 */
const applicationAnswerSchema = new mongoose.Schema(
  {
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true, index: true },
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobQuestion', required: true },
    // Candidate's submitted answer. For MCQs this is the selected option
    // text; for technical/screening it's free text.
    answer: { type: String, required: true, trim: true, maxlength: 3000 },
    // Auto-scored against JobQuestion.correctOptionIndex / correctAnswer.
    isCorrect: { type: Boolean, default: false },
    // Percentage (0-100) for free-text answers — currently binary for MCQ,
    // may be refined by AI scoring later.
    score: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true }
);

applicationAnswerSchema.index({ applicationId: 1, questionId: 1 }, { unique: true });

module.exports = mongoose.model('ApplicationAnswer', applicationAnswerSchema);
