const mongoose = require('mongoose');

/**
 * A single message within a Conversation (Feature 4). Supports text, image,
 * PDF, and resume attachments (Cloudinary URLs), read receipts, typing
 * (client-side), and per-side read/unread tracking.
 */
const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    senderRole: { type: String, enum: ['candidate', 'company'], required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
    text: { type: String, trim: true, maxlength: 5000, default: '' },
    // Attachment (image/pdf/resume) as a Cloudinary URL + metadata.
    attachment: {
      url: { type: String, default: null },
      fileName: { type: String, default: null },
      type: { type: String, enum: ['image', 'pdf', 'resume', null], default: null },
    },
    // Read receipt: whether the receiving side has read this message.
    readBy: {
      type: String,
      enum: ['candidate', 'company', null],
      default: null,
    },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

messageSchema.index({ conversationId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
