import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      }
    ],

    participantKey: {
      type: String,
      required: true,
      unique: true
    },

    startupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Startup',
      required: true
    },

    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null
    },

    lastMessageText: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

conversationSchema.index({ participants: 1 });
conversationSchema.index({ startupId: 1 });
conversationSchema.index({ updatedAt: -1 });

export default mongoose.model('Conversation', conversationSchema);