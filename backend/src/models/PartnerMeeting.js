const mongoose = require('mongoose');

/**
 * A meeting between two Candidates who have an active Project Partner
 * relationship (see ContactUnlock with hirerType 'candidate'). Unlike an
 * Interview — where only a Company may schedule, because the company is
 * the hiring authority — a partner meeting can be proposed by either
 * candidate, since project partners are peers. Supports Google Meet /
 * Zoom / Teams links and an accept/decline/reschedule lifecycle, mirroring
 * the Interview model.
 */
const partnerMeetingSchema = new mongoose.Schema(
  {
    // The candidate who proposed the meeting.
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true, index: true },
    // The other project partner being invited.
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true, index: true },
    platform: { type: String, enum: ['google-meet', 'zoom', 'teams'], default: 'google-meet' },
    meetingLink: { type: String, trim: true, default: '' },
    title: { type: String, trim: true, default: 'Project Sync' },
    scheduledAt: { type: Date, required: true },
    durationMinutes: { type: Number, default: 30, min: 15, max: 240 },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'rescheduled', 'completed', 'cancelled'],
      default: 'pending',
    },
    // Proposed alternative time from the invited partner when rescheduling.
    rescheduleRequest: {
      proposedAt: { type: Date, default: null },
      note: { type: String, trim: true, maxlength: 500, default: '' },
    },
    notes: { type: String, trim: true, maxlength: 1000, default: '' },
    // Reminder bookkeeping so the reminder job never double-sends.
    reminderSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

partnerMeetingSchema.pre('validate', function preventSelfMeeting(next) {
  if (this.organizerId && this.partnerId && this.organizerId.toString() === this.partnerId.toString()) {
    return next(new Error('A candidate cannot schedule a meeting with themselves'));
  }
  next();
});

partnerMeetingSchema.index({ organizerId: 1, scheduledAt: 1 });
partnerMeetingSchema.index({ partnerId: 1, scheduledAt: 1 });

module.exports = mongoose.model('PartnerMeeting', partnerMeetingSchema);
