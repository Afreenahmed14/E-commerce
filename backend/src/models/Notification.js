const mongoose = require('mongoose');

/**
 * `userModel` + `refPath` lets `userId` point at whichever collection
 * (Candidate, Company, or Admin) actually owns this notification, since
 * there is no shared users collection to reference uniformly.
 */
const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'userModel',
    },
    userModel: {
      type: String,
      required: true,
      enum: ['Candidate', 'Company', 'Admin'],
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['info', 'success', 'warning', 'payment', 'verification', 'review'],
      default: 'info',
    },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
