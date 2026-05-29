import mongoose from 'mongoose';

const pitchSchema = new mongoose.Schema(
  {
    oneLinePitch: {
      type: String,
      trim: true,
      default: ''
    },

    problem: {
      type: String,
      trim: true,
      default: ''
    },

    solution: {
      type: String,
      trim: true,
      default: ''
    },

    targetMarket: {
      type: String,
      trim: true,
      default: ''
    },

    businessModel: {
      type: String,
      trim: true,
      default: ''
    },

    traction: {
      type: String,
      trim: true,
      default: ''
    },

    competitors: {
      type: String,
      trim: true,
      default: ''
    },

    uniqueValue: {
      type: String,
      trim: true,
      default: ''
    },

    teamOverview: {
      type: String,
      trim: true,
      default: ''
    },

    futurePlan: {
      type: String,
      trim: true,
      default: ''
    },

    risks: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: false }
);

const investmentDetailsSchema = new mongoose.Schema(
  {
    fundingStage: {
      type: String,
      enum: ['Idea', 'Pre-Seed', 'Seed', 'Series A', 'Series B', 'Growth', 'Other', ''],
      default: ''
    },

    amountRequired: {
      type: Number,
      default: 0
    },

    equityOffered: {
      type: Number,
      default: 0
    },

    valuationAsk: {
      type: Number,
      default: 0
    },

    minimumInvestment: {
      type: Number,
      default: 0
    },

    useOfFunds: {
      type: String,
      trim: true,
      default: ''
    },

    expectedROI: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: false }
);

const pitchDeckSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      default: ''
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
      default: ''
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

    provider: {
      type: String,
      enum: ['cloudinary', 'local', ''],
      default: ''
    }
  },
  { _id: false }
);

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
      default: ''
    },

    pitchVideoUrl: {
      type: String,
      default: ''
    },

    pitch: {
      type: pitchSchema,
      default: () => ({})
    },

    investmentDetails: {
      type: investmentDetailsSchema,
      default: () => ({})
    },

    pitchDeck: {
      type: pitchDeckSchema,
      default: () => ({})
    },

    pitchCompleted: {
      type: Boolean,
      default: false
    },

    pitchUpdatedAt: {
      type: Date,
      default: null
    },

    availabilitySlots: [
      {
        startTime: { type: Date, required: true },
        endTime: { type: Date, required: true },
        status: { type: String, enum: ['available', 'booked'], default: 'available' },
        bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
      }
    ],

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
startupSchema.index({ founderId: 1, isLive: 1 });

export default mongoose.model('Startup', startupSchema);