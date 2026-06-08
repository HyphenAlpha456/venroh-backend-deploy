import crypto from 'crypto';

import razorpay from '../config/razorpay.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';

const getOrCreateWallet = async (userId) => {
  let wallet = await Wallet.findOne({ userId });

  if (!wallet) {
    wallet = await Wallet.create({
      userId,
      balance: 0,
      escrowBalance: 0,
      currency: 'INR'
    });
  }

  return wallet;
};

const generateReceipt = () => {
  return `rcpt_${Date.now().toString().slice(-10)}_${crypto
    .randomBytes(4)
    .toString('hex')}`;
};

// @desc    Create Razorpay order for wallet deposit
// @route   POST /api/v1/payments/create-order
// @access  protected
export const createRazorpayOrder = async (req, res) => {
  try {
    const { amount, startupId = null, notes = {} } = req.body;

    if (!amount || Number(amount) < 1) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Razorpay environment variables are missing'
      });
    }

    const amountInRupees = Number(amount);
    const amountInPaise = Math.round(amountInRupees * 100);

    const wallet = await getOrCreateWallet(req.user._id);
    const receipt = generateReceipt();

    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt,
      notes: {
        userId: req.user._id.toString(),
        walletId: wallet._id.toString(),
        type: 'deposit',
        ...notes
      }
    });

    const transaction = await Transaction.create({
      walletId: wallet._id,
      userId: req.user._id,
      startupId,
      razorpayOrderId: razorpayOrder.id,
      receipt,
      type: 'deposit',
      status: 'pending',
      amount: amountInRupees,
      currency: 'INR',
      notes
    });

    return res.status(201).json({
      success: true,
      message: 'Razorpay order created successfully',
      data: {
        key: process.env.RAZORPAY_KEY_ID,
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        receipt: razorpayOrder.receipt,
        transactionId: transaction._id
      }
    });
  } catch (error) {
    console.error('Create Razorpay Order Error:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Server error while creating Razorpay order'
    });
  }
};

// @desc    Verify Razorpay payment and credit wallet
// @route   POST /api/v1/payments/verify
// @access  protected
export const verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      transactionId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message:
          'razorpay_order_id, razorpay_payment_id, and razorpay_signature are required'
      });
    }

    const signatureBody = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(signatureBody)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    let transaction = null;

    if (transactionId) {
      try {
        transaction = await Transaction.findById(transactionId);
      } catch (error) {
        console.log('Invalid transactionId received:', transactionId);
      }
    }

    if (!transaction) {
      transaction = await Transaction.findOne({
        razorpayOrderId: razorpay_order_id
      });
    }

    let wallet = null;

    // Emergency repair: if local transaction was not found, fetch Razorpay order and create local transaction
    if (!transaction) {
      const razorpayOrder = await razorpay.orders.fetch(razorpay_order_id);

      const userId = razorpayOrder?.notes?.userId || req.user._id;
      const walletId = razorpayOrder?.notes?.walletId;

      if (walletId) {
        wallet = await Wallet.findById(walletId);
      }

      if (!wallet) {
        wallet = await Wallet.findOne({ userId });
      }

      if (!wallet) {
        wallet = await Wallet.create({
          userId,
          balance: 0,
          escrowBalance: 0,
          currency: 'INR'
        });
      }

      transaction = await Transaction.create({
        walletId: wallet._id,
        userId,
        startupId: null,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        receipt: razorpayOrder.receipt || generateReceipt(),
        type: 'deposit',
        status: 'pending',
        amount: Number(razorpayOrder.amount || 0) / 100,
        currency: razorpayOrder.currency || 'INR',
        notes: {
          repairedDuringVerify: true,
          razorpayNotes: razorpayOrder.notes || {}
        }
      });
    }

    if (transaction.status === 'completed') {
      wallet = wallet || (await Wallet.findById(transaction.walletId));

      return res.status(200).json({
        success: true,
        message: 'Payment already verified',
        transaction,
        wallet
      });
    }

    transaction.status = 'completed';
    transaction.razorpayPaymentId = razorpay_payment_id;
    transaction.razorpaySignature = razorpay_signature;
    await transaction.save();

    wallet = wallet || (await Wallet.findById(transaction.walletId));

    if (!wallet) {
      wallet = await Wallet.findOne({ userId: transaction.userId });
    }

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    wallet.balance = Number(wallet.balance || 0) + Number(transaction.amount || 0);
    wallet.updatedAt = new Date();
    await wallet.save();

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully and wallet credited',
      transaction,
      wallet
    });
  } catch (error) {
    console.error('Verify Razorpay Payment Error:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Server error while verifying payment'
    });
  }
};

// @desc    Get my payment transactions
// @route   GET /api/v1/payments/my-transactions
// @access  protected
export const getMyPaymentTransactions = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 50);
    const skip = (page - 1) * limit;

    const wallet = await Wallet.findOne({ userId: req.user._id });

    if (!wallet) {
      return res.status(200).json({
        success: true,
        count: 0,
        wallet: null,
        transactions: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      });
    }

    const filter = {
      walletId: wallet._id
    };

    const total = await Transaction.countDocuments(filter);

    const transactions = await Transaction.find(filter)
      .sort({ timestamp: -1, createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      count: transactions.length,
      wallet,
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Get My Payment Transactions Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error while fetching transactions'
    });
  }
};