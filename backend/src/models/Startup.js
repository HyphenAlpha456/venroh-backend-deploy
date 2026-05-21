import mongoose from 'mongoose';

const startupSchema = new mongoose.Schema(
  {
    founderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },

    companyName: {
      type: String,
      required: true,
      trim: true
    },

    cin: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },

    mcaStatus: {
      type: String,
      default: 'Pending'
    },

    authorizedCapital: {
      type: Number,
      default: 0
    },

    paidUpCapital: {
      type: Number,
      default: 0
    },

    valuationAsk: {
      type: Number,
      required: true
    },

    pitchDeckUrl: {
      type: String,
      required: true
    },

    pitchVideoUrl: {
      type: String
    },

    isLive: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

startupSchema.index({ isLive: 1, valuationAsk: -1 });

export default mongoose.model('Startup', startupSchema);