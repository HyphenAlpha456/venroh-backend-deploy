import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  channelId: { type: String, required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, default: '' },
  file: {
    url: { type: String },
    name: { type: String },
    size: { type: Number },
    mimeType: { type: String }
  },
  timestamp: { type: Date, default: Date.now }
}, { versionKey: false });

messageSchema.index({ channelId: 1, timestamp: -1 });

export default mongoose.model('Message', messageSchema);