const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const Notification = require('../models/Notification');

/** Maps a role name to the Mongoose model name used in Notification.userModel. */
const MODEL_NAME_BY_ROLE = { candidate: 'Candidate', company: 'Company', admin: 'Admin' };

/**
 * GET /api/v1/notifications
 * Filters by both userId AND userModel, since candidate/company/admin
 * ObjectIds are drawn from separate collections and could theoretically
 * collide across them.
 */
const getMyNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly } = req.query;
  const filter = { userId: req.user._id, userModel: MODEL_NAME_BY_ROLE[req.user.role] };
  if (unreadOnly === 'true') filter.isRead = false;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort('-createdAt')
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Notification.countDocuments(filter),
    Notification.countDocuments({ ...filter, isRead: false }),
  ]);

  return new ApiResponse(200, {
    notifications,
    unreadCount,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  }, 'Notifications fetched').send(res);
});

/**
 * PATCH /api/v1/notifications/:id/read
 */
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id, userModel: MODEL_NAME_BY_ROLE[req.user.role] },
    { isRead: true },
    { new: true }
  );
  if (!notification) throw ApiError.notFound('Notification not found');
  return new ApiResponse(200, { notification }, 'Notification marked as read').send(res);
});

/**
 * PATCH /api/v1/notifications/read-all
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user._id, userModel: MODEL_NAME_BY_ROLE[req.user.role], isRead: false },
    { isRead: true }
  );
  return new ApiResponse(200, null, 'All notifications marked as read').send(res);
});

/**
 * DELETE /api/v1/notifications/:id
 */
const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id, userId: req.user._id, userModel: MODEL_NAME_BY_ROLE[req.user.role],
  });
  if (!notification) throw ApiError.notFound('Notification not found');
  return new ApiResponse(200, null, 'Notification deleted').send(res);
});

module.exports = { getMyNotifications, markAsRead, markAllAsRead, deleteNotification };
