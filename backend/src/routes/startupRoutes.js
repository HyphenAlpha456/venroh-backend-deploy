import express from 'express';

import {
  createStartup,
  getMyStartup,
  getStartups,
  getStartupById,
  updateMyStartup,
  verifyStartup,
  unverifyStartup,
  deleteStartup
} from '../controllers/startupController.js';

import {
  protect,
  authorizeRoles
} from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, authorizeRoles('founder'), createStartup);

router.get('/', protect, getStartups);

router.get('/my', protect, authorizeRoles('founder'), getMyStartup);

router.put('/my', protect, authorizeRoles('founder'), updateMyStartup);

router.get('/:id', protect, getStartupById);

router.patch('/:id/verify', protect, authorizeRoles('admin'), verifyStartup);

router.patch('/:id/unverify', protect, authorizeRoles('admin'), unverifyStartup);

router.delete('/:id', protect, authorizeRoles('admin'), deleteStartup);

export default router;