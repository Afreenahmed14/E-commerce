const mongoose = require('mongoose');

/**
 * A single AI Career Assistant conversation thread. One user (candidate,
 * company, or admin) can have many conversations, mirroring how
 * Notification.js scopes documents to whichever collection actually owns
 * them via refPath.
 */
const chatConversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'userModel',
      index: true,
    },
    userModel: {
      type: String,
      required: true,
      enum: ['Candidate', 'Company', 'Admin'],
    },
    // Auto-derived from the first user message (see chatbotController),
    // editable later if we add a rename endpoint.
    title: { type: String, trim: true, default: 'New conversation' },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

chatConversationSchema.index({ userId: 1, lastMessageAt: -1 });

module.exports = mongoose.model('ChatConversation', chatConversationSchema);
