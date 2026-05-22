import express from 'express';

import {
  createConversationFromStartup,
  getMyConversations,
  getConversationMessages
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

export default router;