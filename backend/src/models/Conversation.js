const mongoose = require('mongoose');

/**
 * A company <-> candidate realtime chat thread (Feature 4). Conversations
 * are scoped to a candidate and a company. Messages are stored in the
 * Message collection. Supports mute + unread counts tracked per side.
 */
const conversationSchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true, index: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', default: null },
    // Which side muted the thread (so only that side stops getting pings).
    mutedBy: {
      type: String,
      enum: ['candidate', 'company', null],
      default: null,
    },
    // Cursor timestamps for scrolling older messages.
    lastMessageAt: { type: Date, default: Date.now },
    lastMessagePreview: { type: String, default: '' },
    // Snapshot so the conversation list can render without a join.
    lastSenderRole: { type: String, enum: ['candidate', 'company', null], default: null },
  },
  { timestamps: true }
);

// One thread per (candidate, company, job).
conversationSchema.index({ candidateId: 1, companyId: 1, jobId: 1 }, { unique: true });
conversationSchema.index({ lastMessageAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
