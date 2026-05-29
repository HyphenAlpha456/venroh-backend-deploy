import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

import User from '../models/User.js';
import Startup from '../models/Startup.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';

const getAllowedOrigins = () => {
  if (!process.env.ALLOWED_ORIGINS) {
    return ['http://localhost:5173'];
  }
  return process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim());
};

const normalizeSocketAttachments = (attachments = []) => {
  return attachments.map((attachment) => {
    const secureUrl = attachment.secure_url || attachment.secureUrl || '';
    const url = secureUrl || attachment.url || '';

    const fileName =
      attachment.fileName ||
      attachment.original_filename ||
      attachment.originalFileName ||
      attachment.public_id ||
      'file';

    return {
      url,
      secureUrl,
      publicId: attachment.public_id || attachment.publicId || '',
      assetId: attachment.asset_id || attachment.assetId || '',
      fileName,
      originalFileName: attachment.original_filename || attachment.originalFileName || fileName,
      fileType: attachment.mime_type || attachment.fileType || '',
      fileSize: attachment.bytes || attachment.fileSize || 0,
      resourceType: attachment.resource_type || attachment.resourceType || '',
      format: attachment.format || '',
      bytes: attachment.bytes || 0,
      width: attachment.width || null,
      height: attachment.height || null,
      cloudinaryVersion: attachment.version || null,
      provider: attachment.provider || 'cloudinary'
    };
  });
};

export const initSocket = (server) => {
  // Configured with WebSockets transport for ultra-low latency WebRTC
  const io = new Server(server, {
    cors: {
      origin: getAllowedOrigins(),
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket']
  });

  // JWT Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error('Authentication token missing'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findById(decoded.id).select(
        'name email role isVerified'
      );

      if (!user) {
        return next(new Error('User not found'));
      }

      if (!['investor', 'founder'].includes(user.role)) {
        return next(new Error('Only investors and founders can use real-time features'));
      }

      socket.user = user;
      next();
    } catch (error) {
      return next(new Error('Socket authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    console.log(`[Socket] Connected: ${socket.user.name} (${socket.id})`);

    socket.join(userId);

    // ==========================================
    // CHAT SYSTEM LOGIC
    // ==========================================
    socket.on('join_conversation', async ({ conversationId }) => {
      try {
        if (!conversationId) {
          return socket.emit('chat_error', { message: 'conversationId is required' });
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          return socket.emit('chat_error', { message: 'Conversation not found' });
        }

        const isParticipant = conversation.participants.some(
          (id) => id.toString() === userId
        );

        if (!isParticipant) {
          return socket.emit('chat_error', { message: 'You are not allowed to join this conversation' });
        }

        socket.join(conversationId);
        socket.emit('joined_conversation', { conversationId });
      } catch (error) {
        console.error('Join Conversation Socket Error:', error);
        socket.emit('chat_error', { message: 'Failed to join conversation' });
      }
    });

    socket.on('send_message', async ({ conversationId, text, attachments = [] }) => {
      try {
        if (!conversationId) {
          return socket.emit('chat_error', { message: 'conversationId is required' });
        }

        const safeAttachments = Array.isArray(attachments)
          ? normalizeSocketAttachments(attachments)
          : [];

        if (!text?.trim() && safeAttachments.length === 0) {
          return socket.emit('chat_error', { message: 'Message cannot be empty' });
        }

        const invalidAttachment = safeAttachments.some((attachment) => {
          return !attachment.url || !attachment.fileName;
        });

        if (invalidAttachment) {
          return socket.emit('chat_error', { message: 'Invalid attachment data' });
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          return socket.emit('chat_error', { message: 'Conversation not found' });
        }

        const isParticipant = conversation.participants.some(
          (id) => id.toString() === userId
        );

        if (!isParticipant) {
          return socket.emit('chat_error', { message: 'You are not allowed to send message in this conversation' });
        }

        const startup = await Startup.findById(conversation.startupId);
        if (!startup || !startup.isLive) {
          return socket.emit('chat_error', { message: 'Chat is disabled because this startup is not live' });
        }

        let message = await Message.create({
          conversationId,
          senderId: userId,
          text: text?.trim() || '',
          attachments: safeAttachments,
          readBy: [userId]
        });

        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: message._id,
          lastMessageText: text?.trim() || '📎 Attachment',
          updatedAt: new Date()
        });

        message = await Message.findById(message._id).populate(
          'senderId',
          'name email role'
        );

        io.to(conversationId).emit('receive_message', message);
      } catch (error) {
        console.error('Send Message Socket Error:', error);
        socket.emit('chat_error', { message: 'Failed to send message' });
      }
    });

    socket.on('typing', ({ conversationId }) => {
      socket.to(conversationId).emit('typing', { conversationId, userId, name: socket.user.name });
    });

    socket.on('stop_typing', ({ conversationId }) => {
      socket.to(conversationId).emit('stop_typing', { conversationId, userId });
    });

    // ==========================================
    // WEBRTC VIDEO SIGNALING LOGIC
    // ==========================================
    socket.on('join-room', ({ roomId }) => {
      socket.join(roomId);
      // Alert existing room members to initiate peer connections
      socket.to(roomId).emit('user-connected', socket.id);
    });

    socket.on('webrtc-offer', ({ offer, targetId }) => {
      io.to(targetId).emit('webrtc-offer', { offer, callerId: socket.id });
    });

    socket.on('webrtc-answer', ({ answer, targetId }) => {
      io.to(targetId).emit('webrtc-answer', { answer, callerId: socket.id });
    });

    socket.on('ice-candidate', ({ candidate, targetId }) => {
      io.to(targetId).emit('ice-candidate', { candidate, callerId: socket.id });
    });

    socket.on('raise-hand', ({ roomId }) => {
      socket.to(roomId).emit('user-raised-hand', socket.id);
    });

    // ==========================================
    // GLOBAL DISCONNECT LOGIC
    // ==========================================
    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.user.name} (${socket.id})`);
      // Broadcast to any WebRTC rooms this user was in
      socket.broadcast.emit('user-disconnected', socket.id);
    });
  });

  return io;
};