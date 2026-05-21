import mongoose from 'mongoose';

const documentViewSchema = new mongoose.Schema({
  startupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Startup', required: true },
  investorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  durationInSeconds: { type: Number, default: 0 },
  lastViewedPage: { type: Number, default: 1 },
  viewedAt: { type: Date, default: Date.now }
}, { versionKey: false });

documentViewSchema.index({ startupId: 1, viewedAt: -1 });
documentViewSchema.index({ investorId: 1 });

export default mongoose.model('DocumentView', documentViewSchema);