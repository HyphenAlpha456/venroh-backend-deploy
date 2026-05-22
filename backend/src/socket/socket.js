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

export const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: getAllowedOrigins(),
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

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
        return next(new Error('Only investors and founders can use chat'));
      }

      socket.user = user;

      next();
    } catch (error) {
      return next(new Error('Socket authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();

    console.log(`Socket connected: ${socket.user.name}`);

    socket.join(userId);

    socket.on('join_conversation', async ({ conversationId }) => {
      try {
        if (!conversationId) {
          return socket.emit('chat_error', {
            message: 'conversationId is required'
          });
        }

        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
          return socket.emit('chat_error', {
            message: 'Conversation not found'
          });
        }

        const isParticipant = conversation.participants.some(
          (id) => id.toString() === userId
        );

        if (!isParticipant) {
          return socket.emit('chat_error', {
            message: 'You are not allowed to join this conversation'
          });
        }

        socket.join(conversationId);

        socket.emit('joined_conversation', {
          conversationId
        });
      } catch (error) {
        console.error('Join Conversation Socket Error:', error);

        socket.emit('chat_error', {
          message: 'Failed to join conversation'
        });
      }
    });

    socket.on('send_message', async ({ conversationId, text, attachments = [] }) => {
      try {
        if (!conversationId) {
          return socket.emit('chat_error', {
            message: 'conversationId is required'
          });
        }

        if (!text?.trim() && attachments.length === 0) {
          return socket.emit('chat_error', {
            message: 'Message cannot be empty'
          });
        }

        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
          return socket.emit('chat_error', {
            message: 'Conversation not found'
          });
        }

        const isParticipant = conversation.participants.some(
          (id) => id.toString() === userId
        );

        if (!isParticipant) {
          return socket.emit('chat_error', {
            message: 'You are not allowed to send message in this conversation'
          });
        }

        const startup = await Startup.findById(conversation.startupId);

        if (!startup) {
          return socket.emit('chat_error', {
            message: 'Startup linked with this conversation was not found'
          });
        }

        if (!startup.isLive) {
          return socket.emit('chat_error', {
            message: 'Chat is disabled because this startup is not live'
          });
        }

        let message = await Message.create({
          conversationId,
          senderId: userId,
          text: text?.trim() || '',
          attachments,
          readBy: [userId]
        });

        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: message._id,
          lastMessageText: text?.trim() || 'Attachment',
          updatedAt: new Date()
        });

        message = await Message.findById(message._id).populate(
          'senderId',
          'name email role'
        );

        io.to(conversationId).emit('receive_message', message);
      } catch (error) {
        console.error('Send Message Socket Error:', error);

        socket.emit('chat_error', {
          message: 'Failed to send message'
        });
      }
    });

    socket.on('typing', ({ conversationId }) => {
      socket.to(conversationId).emit('typing', {
        conversationId,
        userId,
        name: socket.user.name
      });
    });

    socket.on('stop_typing', ({ conversationId }) => {
      socket.to(conversationId).emit('stop_typing', {
        conversationId,
        userId
      });
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.user.name}`);
    });
  });

  return io;
};