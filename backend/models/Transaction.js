import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  walletId: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', required: true },
  startupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Startup' },
  razorpayOrderId: { type: String, sparse: true, unique: true },
  razorpayPaymentId: { type: String, sparse: true },
  type: { type: String, enum: ['deposit', 'investment', 'withdrawal', 'escrow_hold'], required: true },
  status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], required: true },
  amount: { type: Number, required: true, min: 1 },
  timestamp: { type: Date, default: Date.now }
}, { versionKey: false });

transactionSchema.index({ walletId: 1, timestamp: -1 });
transactionSchema.index({ razorpayOrderId: 1 }, { sparse: true });
transactionSchema.index({ status: 1 });

export default mongoose.model('Transaction', transactionSchema);