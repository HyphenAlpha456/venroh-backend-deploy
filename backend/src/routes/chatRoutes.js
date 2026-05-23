import express from 'express';

import {
  createConversationFromStartup,
  getMyConversations,
  getConversationMessages,
  uploadConversationFile
} from '../controllers/chatController.js';

import {
  protect,
  authorizeRoles
} from '../middleware/authMiddleware.js';

import { uploadChatFile } from '../middleware/uploadMiddleware.js';

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
  '/conversations/:conversationId/files',
  protect,
  authorizeRoles('investor', 'founder'),
  uploadChatFile.single('file'),
  uploadConversationFile
);

export default router;