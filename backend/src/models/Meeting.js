import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema({
  roomId: { type: String, required: false },
  meetingUrl: { type: String },
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  startupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Startup', required: true },
  status: { 
    type: String, 
    enum: ['pending', 'scheduled', 'active', 'completed', 'cancelled', 'declined'], 
    default: 'pending' 
  },
  scheduledAt: { type: Date, required: true },
  endedAt: { type: Date }
}, { timestamps: true, versionKey: false });

meetingSchema.index({ participants: 1, scheduledAt: -1 });
meetingSchema.index({ startupId: 1, scheduledAt: -1 });
meetingSchema.index({ status: 1 });

export default mongoose.model('Meeting', meetingSchema);