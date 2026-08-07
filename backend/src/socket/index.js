const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const { getModelForRole } = require('../utils/findAccountByEmail');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Notification = require('../models/Notification');

/**
 * Realtime layer for the app — powers:
 *   Feature 4: company <-> candidate chat (delivery, typing, read, online)
 *   Feature 7: realtime notifications (application, chat, interview, etc.)
 *
 * Auth: clients connect with `?token=<accessToken>`. We verify the JWT,
 * resolve the account, and register the socket under a namespaced key
 * `${role}:${userId}` so we can message specific users easily.
 *
 * Persistent state lives in Mongo (Message, Conversation, Notification);
 * this module only handles the live transport + ephemeral presence.
 */

const onlineUsers = new Map(); // key `${role}:${id}` -> Set<socketId>

const USER_MODEL_NAME = { candidate: 'Candidate', company: 'Company', admin: 'Admin' };

const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
  });

  // ---- Auth middleware ----
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, jwtConfig.accessSecret);
      const Model = getModelForRole(decoded.role);
      const user = Model && await Model.findById(decoded.id);
      if (!user || user.status === 'suspended' || user.status === 'deleted') {
        return next(new Error('Unauthorized'));
      }
      socket.user = { id: decoded.id, role: decoded.role };
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { id, role } = socket.user;
    const key = `${role}:${id}`;

    // Presence: join a per-user room + track online.
    socket.join(key);
    if (!onlineUsers.has(key)) onlineUsers.set(key, new Set());
    onlineUsers.get(key).add(socket.id);

    // Broadcast online status to peers (best-effort).
    io.emit('presence:online', { userId: id, role, online: true });

    // ---- Chat events ----
    socket.on('chat:join', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('chat:leave', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on('chat:typing', async ({ conversationId, isTyping }) => {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) return;
      const peerRole = role === 'candidate' ? 'company' : 'candidate';
      const peerId = role === 'candidate' ? conversation.companyId : conversation.candidateId;
      io.to(`conversation:${conversationId}`).to(`${peerRole}:${peerId}`).emit('chat:typing', {
        conversationId,
        senderRole: role,
        senderId: id,
        isTyping: !!isTyping,
      });
    });

    socket.on('chat:message', async (payload, ack = () => {}) => {
      try {
        const { conversationId, text, attachment } = payload;
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return ack({ error: 'Conversation not found' });

        const isMember =
          (role === 'candidate' && conversation.candidateId.toString() === id.toString()) ||
          (role === 'company' && conversation.companyId.toString() === id.toString());
        if (!isMember) return ack({ error: 'Not a member' });

        const message = await Message.create({
          conversationId,
          senderRole: role,
          senderId: id,
          text: text || '',
          attachment: attachment || null,
        });

        conversation.lastMessageAt = new Date();
        conversation.lastMessagePreview = (text || (attachment ? '[Attachment]' : '')).slice(0, 120);
        conversation.lastSenderRole = role;
        await conversation.save();

        // Deliver to everyone in the conversation room.
        io.to(`conversation:${conversationId}`).emit('chat:message', {
          message,
          conversationId,
        });

        // Notify the recipient (if not muted by them).
        const recipientRole = role === 'candidate' ? 'company' : 'candidate';
        const recipientId = role === 'candidate' ? conversation.companyId : conversation.candidateId;
        if (conversation.mutedBy !== recipientRole) {
          io.to(`${recipientRole}:${recipientId}`).emit('notification:new', {
            type: 'chat',
            title: 'New chat message',
            message: text ? text.slice(0, 80) : 'New attachment',
            link: `/${recipientRole}/dashboard/messages`,
          });

          await Notification.create({
            userId: recipientId,
            userModel: USER_MODEL_NAME[recipientRole],
            title: 'New chat message',
            message: text ? text.slice(0, 80) : 'New attachment',
            type: 'chat',
            link: `/${recipientRole}/dashboard/messages`,
          });
        }

        ack({ message });
      } catch (err) {
        console.error('[socket chat:message]', err.message);
        ack({ error: err.message });
      }
    });

    socket.on('chat:read', async ({ conversationId }) => {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) return;
      await Message.updateMany(
        { conversationId, senderRole: { $ne: role }, readBy: null },
        { $set: { readBy: role, readAt: new Date() } }
      );
      io.to(`conversation:${conversationId}`).emit('chat:read', {
        conversationId,
        readBy: role,
        readById: id,
      });
    });

    // ---- Disconnect ----
    socket.on('disconnect', () => {
      const set = onlineUsers.get(key);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) {
          onlineUsers.delete(key);
          io.emit('presence:offline', { userId: id, role, online: false });
        }
      }
    });
  });

  return io;
};

/**
 * Emits a realtime notification to a single user (used by controllers after
 * creating a Notification doc). Safe no-op if socket layer isn't attached.
 */
const emitToUser = (io, role, userId, event, data) => {
  if (!io) return;
  io.to(`${role}:${userId}`).emit(event, data);
};

module.exports = { initSocket, emitToUser, onlineUsers };
