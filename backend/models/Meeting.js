import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  investorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Startup', required: true },
  status: { type: String, enum: ['scheduled', 'active', 'completed', 'cancelled'], default: 'scheduled' },
  scheduledAt: { type: Date, required: true },
  endedAt: { type: Date }
}, { versionKey: false });

meetingSchema.index({ investorId: 1, scheduledAt: -1 });
meetingSchema.index({ startupId: 1, scheduledAt: -1 });
meetingSchema.index({ status: 1 });

export default mongoose.model('Meeting', meetingSchema);