import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema({
  roomId: { type: String, required: false }, // Made false initially, generated only upon acceptance
  meetingUrl: { type: String }, // The clickable link from 100ms/Daily.co
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // The Founder
  investorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Startup', required: true },
  
  // UPDATED: Added 'pending' and 'declined' to handle the handshake
  status: { 
    type: String, 
    enum: ['pending', 'scheduled', 'active', 'completed', 'cancelled', 'declined'], 
    default: 'pending' 
  },
  
  scheduledAt: { type: Date, required: true },
  endedAt: { type: Date }
}, { timestamps: true, versionKey: false }); // Added timestamps to track when requests were made

// Your excellent indexing remains exactly the same!
meetingSchema.index({ investorId: 1, scheduledAt: -1 });
meetingSchema.index({ startupId: 1, scheduledAt: -1 });
meetingSchema.index({ status: 1 });

export default mongoose.model('Meeting', meetingSchema);