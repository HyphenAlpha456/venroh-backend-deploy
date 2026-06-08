import express from 'express';

import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  getMyPaymentTransactions
} from '../controllers/paymentController.js';

import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/create-order', protect, createRazorpayOrder);

router.post('/verify', protect, verifyRazorpayPayment);

router.get('/my-transactions', protect, getMyPaymentTransactions);

export default router;