const Notification = require('../models/Notification');

/**
 * Helper that creates a Notification doc AND (optionally) emits a realtime
 * socket event to the recipient. Controllers can call this instead of
 * building Notification.create() themselves, so every notification is
 * consistently persisted + broadcast (Feature 7).
 *
 * The socket instance is injected at runtime (after server.js initializes
 * socket.io) to avoid a circular import; if it's not set yet, we only
 * persist and skip the live push.
 */
let ioRef = null;
const setIo = (io) => { ioRef = io; };

const USER_MODEL_NAME = { candidate: 'Candidate', company: 'Company', admin: 'Admin' };

/**
 * @param {object} opts
 * @param {string} opts.userId - recipient id
 * @param {'candidate'|'company'|'admin'} opts.role
 * @param {string} opts.title
 * @param {string} opts.message
 * @param {string} opts.type - notification type
 * @param {string} [opts.link]
 * @returns {Promise<object>} the created Notification
 */
const notify = async ({ userId, role, title, message, type = 'info', link = '' }) => {
  const notification = await Notification.create({
    userId,
    userModel: USER_MODEL_NAME[role] || role,
    title,
    message,
    type,
    link,
  });

  if (ioRef) {
    ioRef.to(`${role}:${userId}`).emit('notification:new', {
      _id: notification._id,
      title,
      message,
      type,
      link,
      createdAt: notification.createdAt,
    });
  }

  return notification;
};

module.exports = { notify, setIo };
