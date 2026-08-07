const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const Job = require('../models/Job');
const Candidate = require('../models/Candidate');
const Company = require('../models/Company');
const { uploadFile } = require('../services/cloudinaryService');

/**
 * Feature 4 — Company <-> Candidate realtime chat (REST half).
 *
 * The REST side handles:
 *   - conversation list + unread counts
 *   - message history + search
 *   - starting a conversation
 *   - sending a message (fallback path; the socket path also persists)
 *   - marking messages read
 *   - mute / delete / attachment upload
 *
 * Realtime concerns (online status, typing indicator, instant delivery)
 * live in socket/index.js.
 */

const ROLE_TO_MODEL_NAME = { candidate: 'Candidate', company: 'Company' };

/**
 * GET /api/v1/conversations
 * The current user's conversation list, with the other party populated and
 * per-conversation unread count computed from the Message collection.
 */
const listConversations = asyncHandler(async (req, res) => {
  const isCandidate = req.user.role === 'candidate';

  const filter = isCandidate ? { candidateId: req.user._id } : { companyId: req.user._id };
  const conversations = await Conversation.find(filter).sort('-lastMessageAt').lean();

  // Populate the "other" side + compute unread counts in one pass.
  const ids = conversations.map((c) => c._id);
  const otherModel = isCandidate ? Company : Candidate;
  const otherIds = conversations.map((c) => (isCandidate ? c.companyId : c.candidateId));
  const [others, unreadRows, unreadCounts] = await Promise.all([
    otherModel.find({ _id: { $in: otherIds } }).select('name email companyName logo headline profileImage').lean(),
    Message.aggregate([
      { $match: { conversationId: { $in: ids }, readBy: null } },
      { $group: { _id: '$conversationId', count: { $sum: 1 } } },
    ]),
    conversations.length
      ? Message.countDocuments({
          conversationId: { $in: ids },
          readBy: null,
          senderRole: { $ne: req.user.role },
        })
      : 0,
  ]);

  const otherMap = {};
  others.forEach((o) => {
    const key = o._id.toString();
    otherMap[key] = isCandidate
      ? { companyName: o.companyName, logo: o.logo }
      : { name: o.name, headline: o.headline, profileImage: o.profileImage };
  });

  const unreadRowMap = {};
  unreadRows.forEach((r) => { unreadRowMap[r._id.toString()] = r.count; });

  const result = conversations.map((c) => ({
    ...c,
    other: otherMap[String(isCandidate ? c.companyId : c.candidateId)] || {},
    unreadCount: unreadRowMap[c._id.toString()] || unreadCounts,
  }));

  return new ApiResponse(200, { conversations: result }, 'Conversations fetched').send(res);
});

/**
 * GET /api/v1/conversations/:id/messages
 * Message history for one conversation, newest first (paginated). Optional
 * `q` query param searches message text (message search feature).
 */
const getMessages = asyncHandler(async (req, res) => {
  const conversation = await ensureMember(req.user, req.params.id);
  const { q, before } = req.query;
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));

  const filter = { conversationId: conversation._id };
  if (q) filter.text = { $regex: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') };
  if (before) filter.createdAt = { $lt: new Date(before) };

  const messages = await Message.find(filter).sort('-createdAt').limit(limit).lean();

  return new ApiResponse(200, { messages }, 'Messages fetched').send(res);
});

/**
 * POST /api/v1/conversations
 * Company starts (or reuses) a conversation with a candidate about a job.
 * Body: { candidateId, jobId }
 */
const startConversation = asyncHandler(async (req, res) => {
  if (req.user.role !== 'company') {
    throw ApiError.forbidden('Only companies can start a new conversation');
  }
  const { candidateId, jobId } = req.body;

  const candidate = await Candidate.findById(candidateId);
  if (!candidate) throw ApiError.notFound('Candidate not found');

  let existing = null;
  if (jobId) {
    existing = await Conversation.findOne({ candidateId, companyId: req.user._id, jobId: jobId || null });
  } else {
    existing = await Conversation.findOne({ candidateId, companyId: req.user._id, jobId: null });
  }

  if (existing) return new ApiResponse(200, { conversation: existing }, 'Conversation already exists').send(res);

  const conversation = await Conversation.create({
    candidateId,
    companyId: req.user._id,
    jobId: jobId || null,
  });

  return new ApiResponse(201, { conversation }, 'Conversation started').send(res);
});

/**
 * POST /api/v1/conversations/:id/messages
 * REST fallback for sending a message; the socket path calls the same
 * persistence logic. Body: { text, attachment? }
 */
const sendMessage = asyncHandler(async (req, res) => {
  const conversation = await ensureMember(req.user, req.params.id);
  const { text, attachment } = req.body;

  if (!text && !attachment && !req.file) {
    throw ApiError.badRequest('Message text or attachment is required');
  }

  const finalAttachment = attachment || null;
  let fileUrl = null;
  let fileInfo = null;
  if (req.file) {
    fileUrl = await uploadFile(req.file, 'chat-attachments');
    const isImage = req.file.mimetype.startsWith('image/');
    const isPdf = req.file.mimetype === 'application/pdf';
    fileInfo = {
      url: fileUrl,
      fileName: req.file.originalname,
      type: isImage ? 'image' : isPdf ? 'pdf' : 'resume',
    };
  }

  const senderRole = req.user.role; // 'candidate' | 'company'
  const message = await Message.create({
    conversationId: conversation._id,
    senderRole,
    senderId: req.user._id,
    text: text || '',
    attachment: finalAttachment || fileInfo,
  });

  // Update the conversation snapshot.
  conversation.lastMessageAt = new Date();
  conversation.lastMessagePreview = (text || (fileInfo ? '[Attachment]' : '[Attachment]')).slice(0, 120);
  conversation.lastSenderRole = senderRole;
  await conversation.save();

  // Notify the receiving side.
  const recipientRole = senderRole === 'candidate' ? 'company' : 'candidate';
  const recipientId = senderRole === 'candidate' ? conversation.companyId : conversation.candidateId;
  await Notification.create({
    userId: recipientId,
    userModel: ROLE_TO_MODEL_NAME[recipientRole],
    title: 'New chat message',
    message: `You have a new message${text ? `: ${text.slice(0, 80)}` : ' with an attachment'}.`,
    type: 'chat',
    link: `/${recipientRole === 'candidate' ? 'candidate' : 'company'}/dashboard/messages`,
  });

  return new ApiResponse(201, { message }, 'Message sent').send(res);
});

/**
 * PATCH /api/v1/conversations/:id/read
 * Marks all messages from the other side as read (read receipt).
 */
const markConversationRead = asyncHandler(async (req, res) => {
  const conversation = await ensureMember(req.user, req.params.id);
  const myRole = req.user.role;

  await Message.updateMany(
    {
      conversationId: conversation._id,
      senderRole: { $ne: myRole },
      readBy: null,
    },
    { $set: { readBy: myRole, readAt: new Date() } }
  );

  return new ApiResponse(200, null, 'Conversation marked as read').send(res);
});

/**
 * PATCH /api/v1/conversations/:id/mute
 * Body: { muted: boolean } — mutes the thread for the current user.
 */
const toggleMute = asyncHandler(async (req, res) => {
  const conversation = await ensureMember(req.user, req.params.id);
  const { muted } = req.body;

  if (muted === true) {
    conversation.mutedBy = req.user.role;
  } else {
    conversation.mutedBy = null;
  }
  await conversation.save();

  return new ApiResponse(200, { mutedBy: conversation.mutedBy }, 'Mute toggled').send(res);
});

/**
 * DELETE /api/v1/conversations/:id
 * Deletes the conversation and all its messages for the current user.
 */
const deleteConversation = asyncHandler(async (req, res) => {
  const conversation = await ensureMember(req.user, req.params.id);
  await Message.deleteMany({ conversationId: conversation._id });
  await conversation.deleteOne();
  return new ApiResponse(200, null, 'Conversation deleted').send(res);
});

/**
 * POST /api/v1/conversations/:id/upload
 * Uploads an attachment (image/pdf/resume) for a message.
 * Note: multer runs before this handler; the file buffer is in req.file.
 */
const uploadAttachment = asyncHandler(async (req, res) => {
  const conversation = await ensureMember(req.user, req.params.id);
  if (!req.file) throw ApiError.badRequest('No file provided');

  const url = await uploadFile(req.file, 'chat-attachments');
  const isImage = req.file.mimetype.startsWith('image/');
  const isPdf = req.file.mimetype === 'application/pdf';

  return new ApiResponse(200, {
    url,
    fileName: req.file.originalname,
    type: isImage ? 'image' : isPdf ? 'pdf' : 'resume',
  }, 'Attachment uploaded').send(res);
});

/**
 * Ensures the current user is a participant in the conversation.
 * Returns the conversation, or throws 404.
 */
const ensureMember = async (user, conversationId) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw ApiError.notFound('Conversation not found');

  const isMember =
    (user.role === 'candidate' && conversation.candidateId.toString() === user._id.toString()) ||
    (user.role === 'company' && conversation.companyId.toString() === user._id.toString());

  if (!isMember) throw ApiError.forbidden('You are not a member of this conversation');
  return conversation;
};

module.exports = {
  listConversations,
  getMessages,
  startConversation,
  sendMessage,
  markConversationRead,
  toggleMute,
  deleteConversation,
  uploadAttachment,
};
