import mongoose from 'mongoose';

const investmentSchema = new mongoose.Schema({
  investorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Startup', required: true },
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true, unique: true },
  amountInvested: { type: Number, required: true },
  equityShare: { type: Number, required: true },
  status: { type: String, enum: ['escrow_locked', 'disbursed', 'refunded'], default: 'escrow_locked' },
  investedAt: { type: Date, default: Date.now }
}, { versionKey: false });

investmentSchema.index({ investorId: 1, investedAt: -1 });
investmentSchema.index({ startupId: 1 });
investmentSchema.index({ status: 1 });

export default mongoose.model('Investment', investmentSchema);