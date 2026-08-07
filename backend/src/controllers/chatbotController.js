const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const MESSAGES = require('../constants/messages');
const ChatConversation = require('../models/ChatConversation');
const ChatMessage = require('../models/ChatMessage');
const { chatCompleteStream } = require('../services/aiService');
const { extractTextFromBuffer } = require('../services/resumeParserService');
const { uploadFile } = require('../services/cloudinaryService');

// Capitalized model names match Candidate/Company/Admin exactly, as required
// by the refPath convention already used in Notification.js.
const roleToUserModel = { candidate: 'Candidate', company: 'Company', admin: 'Admin' };

const SYSTEM_PROMPT = `You are the HourlyRecruit Career Assistant, an AI embedded inside a recruitment platform.

You ONLY help with recruitment and career topics: resume review, ATS optimization, interview preparation, HR and technical interview questions, career guidance, salary negotiation, cover letter writing, skill gap analysis, job recommendations, company preparation, behavioural questions, coding interview tips, and soft skills.

If the user asks about something unrelated to recruitment/careers, politely redirect them back to what you can help with — do not answer off-topic questions.

Use Markdown formatting (headings, bullet lists, code blocks for code) where it improves readability. Be concise, practical, and encouraging.`;

/**
 * POST /api/v1/chatbot/conversations
 */
const createConversation = asyncHandler(async (req, res) => {
  const conversation = await ChatConversation.create({
    userId: req.user.id,
    userModel: roleToUserModel[req.user.role],
  });
  return new ApiResponse(201, conversation, MESSAGES.CHATBOT.CONVERSATION_CREATED).send(res);
});

/**
 * GET /api/v1/chatbot/conversations
 */
const listConversations = asyncHandler(async (req, res) => {
  const conversations = await ChatConversation.find({ userId: req.user.id })
    .sort({ lastMessageAt: -1 })
    .lean();
  return new ApiResponse(200, conversations).send(res);
});

/**
 * DELETE /api/v1/chatbot/conversations/:id
 */
const deleteConversation = asyncHandler(async (req, res) => {
  const conversation = await ChatConversation.findOne({ _id: req.params.id, userId: req.user.id });
  if (!conversation) {
    throw ApiError.notFound(MESSAGES.CHATBOT.CONVERSATION_NOT_FOUND);
  }
  await ChatMessage.deleteMany({ conversationId: conversation._id });
  await conversation.deleteOne();
  return new ApiResponse(200, null, MESSAGES.CHATBOT.CONVERSATION_DELETED).send(res);
});

/**
 * GET /api/v1/chatbot/conversations/:id/messages
 */
const getMessages = asyncHandler(async (req, res) => {
  const conversation = await ChatConversation.findOne({ _id: req.params.id, userId: req.user.id });
  if (!conversation) {
    throw ApiError.notFound(MESSAGES.CHATBOT.CONVERSATION_NOT_FOUND);
  }
  const messages = await ChatMessage.find({ conversationId: conversation._id })
    .sort({ createdAt: 1 })
    .lean();
  return new ApiResponse(200, messages).send(res);
});

/**
 * POST /api/v1/chatbot/conversations/:id/messages
 * Streams the assistant's reply back as Server-Sent Events so the frontend
 * can render a token-by-token typing effect without adding a websocket
 * dependency just for this feature.
 */
const sendMessage = asyncHandler(async (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    throw ApiError.badRequest('Message content is required');
  }

  const conversation = await ChatConversation.findOne({ _id: req.params.id, userId: req.user.id });
  if (!conversation) {
    throw ApiError.notFound(MESSAGES.CHATBOT.CONVERSATION_NOT_FOUND);
  }

  const userMessage = await ChatMessage.create({
    conversationId: conversation._id,
    role: 'user',
    content: content.trim(),
  });

  // Auto-title the conversation from the first user message.
  if (conversation.title === 'New conversation') {
    conversation.title = content.trim().slice(0, 60);
  }

  const history = await ChatMessage.find({ conversationId: conversation._id })
    .sort({ createdAt: 1 })
    .limit(30) // bound context size/cost; older history still lives in Mongo
    .lean();

  const openaiMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  res.write(`event: user_message\ndata: ${JSON.stringify(userMessage)}\n\n`);

  let fullReply = '';
  try {
    fullReply = await chatCompleteStream(openaiMessages, (token) => {
      res.write(`event: token\ndata: ${JSON.stringify({ token })}\n\n`);
    });
  } catch (err) {
    res.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`);
    return res.end();
  }

  const assistantMessage = await ChatMessage.create({
    conversationId: conversation._id,
    role: 'assistant',
    content: fullReply || MESSAGES.CHATBOT.OFF_TOPIC,
  });

  conversation.lastMessageAt = new Date();
  await conversation.save();

  res.write(`event: done\ndata: ${JSON.stringify(assistantMessage)}\n\n`);
  res.end();
});

/**
 * POST /api/v1/chatbot/conversations/:id/upload
 * Accepts a resume (PDF/DOCX) or image, stores it on Cloudinary via the
 * existing cloudinaryService, extracts text where possible, and returns
 * the attachment + extracted text for the frontend to fold into the next
 * chat message it sends.
 */
const uploadAttachment = asyncHandler(async (req, res) => {
  const conversation = await ChatConversation.findOne({ _id: req.params.id, userId: req.user.id });
  if (!conversation) {
    throw ApiError.notFound(MESSAGES.CHATBOT.CONVERSATION_NOT_FOUND);
  }
  if (!req.file) {
    throw ApiError.badRequest('No file provided');
  }

  const isImage = req.file.mimetype.startsWith('image/');
  const fileType = isImage
    ? 'image'
    : req.file.mimetype === 'application/pdf'
      ? 'pdf'
      : 'docx';

  const url = await uploadFile(req.file, 'chatbot-attachments');

  let extractedText = '';
  if (!isImage) {
    extractedText = await extractTextFromBuffer(req.file.buffer, req.file.mimetype, req.file.originalname);
  }

  return new ApiResponse(200, {
    url,
    fileName: req.file.originalname,
    type: fileType,
    extractedText, // '' for images — the frontend attaches the image URL only
  }).send(res);
});

module.exports = {
  createConversation,
  listConversations,
  deleteConversation,
  getMessages,
  sendMessage,
  uploadAttachment,
};
