import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true
    },

    secureUrl: {
      type: String,
      default: ''
    },

    publicId: {
      type: String,
      default: ''
    },

    assetId: {
      type: String,
      default: ''
    },

    fileName: {
      type: String,
      required: true
    },

    originalFileName: {
      type: String,
      default: ''
    },

    fileType: {
      type: String,
      default: ''
    },

    fileSize: {
      type: Number,
      default: 0
    },

    resourceType: {
      type: String,
      enum: ['image', 'video', 'raw', 'auto', ''],
      default: ''
    },

    format: {
      type: String,
      default: ''
    },

    bytes: {
      type: Number,
      default: 0
    },

    width: {
      type: Number,
      default: null
    },

    height: {
      type: Number,
      default: null
    },

    cloudinaryVersion: {
      type: Number,
      default: null
    },

    provider: {
      type: String,
      enum: ['local', 'cloudinary'],
      default: 'cloudinary'
    }
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    text: {
      type: String,
      trim: true,
      default: ''
    },

    attachments: {
      type: [attachmentSchema],
      default: []
    },

    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ]
  },
  {
    timestamps: true,
    versionKey: false
  }
);

messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ senderId: 1 });

export default mongoose.model('Message', messageSchema);