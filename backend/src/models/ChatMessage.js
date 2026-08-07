const mongoose = require('mongoose');

/**
 * One message within a ChatConversation. `role` follows the OpenAI
 * chat-message convention (user/assistant) so the stored history can be
 * fed back into aiService.chatComplete with minimal mapping.
 */
const chatMessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatConversation',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: { type: String, required: true, trim: true, maxlength: 20000 },
    // Set when this message included an uploaded resume/image (Cloudinary
    // URL reused from the existing uploadMiddleware/cloudinaryService).
    attachment: {
      url: { type: String, default: null },
      fileName: { type: String, default: null },
      type: { type: String, enum: ['pdf', 'docx', 'image', null], default: null },
    },
  },
  { timestamps: true }
);

chatMessageSchema.index({ conversationId: 1, createdAt: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
