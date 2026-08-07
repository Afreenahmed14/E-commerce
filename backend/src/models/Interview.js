const mongoose = require('mongoose');

/**
 * An interview scheduled by a recruiter for a candidate on a job
 * application (Feature 9). Supports Google Meet / Zoom / Teams links and a
 * candidate accept/reject/reschedule lifecycle.
 */
const interviewSchema = new mongoose.Schema(
  {
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true, index: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true, index: true },
    // Meeting platform + link.
    platform: { type: String, enum: ['google-meet', 'zoom', 'teams'], default: 'google-meet' },
    meetingLink: { type: String, trim: true, default: '' },
    title: { type: String, trim: true, default: 'Interview' },
    // Scheduled window.
    scheduledAt: { type: Date, required: true },
    durationMinutes: { type: Number, default: 60, min: 15, max: 240 },
    // Candidate's response to the invitation.
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'rescheduled', 'completed', 'cancelled'],
      default: 'pending',
    },
    // Candidate's proposed alternative time when rescheduling.
    rescheduleRequest: {
      proposedAt: { type: Date, default: null },
      note: { type: String, trim: true, maxlength: 500, default: '' },
    },
    notes: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  { timestamps: true }
);

interviewSchema.index({ candidateId: 1, status: 1 });
interviewSchema.index({ companyId: 1, scheduledAt: 1 });

module.exports = mongoose.model('Interview', interviewSchema);
