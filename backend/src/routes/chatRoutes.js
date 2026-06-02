import express from 'express';

import {
  createConversationFromStartup,
  getMyConversations,
  getConversationMessages,
  sendMessage,
  markConversationAsRead,
  createCloudinaryChatUploadSignature,
  saveCloudinaryFileMessage
} from '../controllers/chatController.js';

import {
  protect,
  authorizeRoles
} from '../middleware/authMiddleware.js';

const router = express.Router();

router.post(
  '/startups/:startupId',
  protect,
  authorizeRoles('investor'),
  createConversationFromStartup
);

router.get(
  '/conversations',
  protect,
  authorizeRoles('investor', 'founder'),
  getMyConversations
);

router.get(
  '/conversations/:conversationId/messages',
  protect,
  authorizeRoles('investor', 'founder'),
  getConversationMessages
);

router.post(
  '/conversations/:conversationId/messages',
  protect,
  authorizeRoles('investor', 'founder'),
  sendMessage
);

router.put(
  '/conversations/:conversationId/read',
  protect,
  authorizeRoles('investor', 'founder'),
  markConversationAsRead
);

router.post(
  '/conversations/:conversationId/cloudinary-signature',
  protect,
  authorizeRoles('investor', 'founder'),
  createCloudinaryChatUploadSignature
);

router.post(
  '/conversations/:conversationId/cloudinary-file-message',
  protect,
  authorizeRoles('investor', 'founder'),
  saveCloudinaryFileMessage
);

export default router;