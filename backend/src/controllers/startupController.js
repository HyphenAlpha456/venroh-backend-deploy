import crypto from 'crypto';
import mongoose from 'mongoose';

import Startup from '../models/Startup.js';
import cloudinary from '../config/cloudinary.js';

const allowedPitchDeckMimeTypes = [
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp'
];

const getMaxPitchDeckBytes = () => {
  return Number(process.env.MAX_PITCH_DECK_BYTES || 52428800);
};

const sanitizeFileName = (fileName = 'pitch-deck') => {
  return fileName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
};

const getResourceTypeFromMimeType = (mimeType = '') => {
  if (mimeType.startsWith('image/')) return 'image';
  return 'raw';
};

const isStartupOwner = (startup, userId) => {
  return startup.founderId.toString() === userId.toString();
};

const normalizeCloudinaryPitchDeck = ({ pitchDeck, fallbackFileName, fallbackMimeType }) => {
  const secureUrl = pitchDeck.secure_url || pitchDeck.secureUrl || '';
  const url = secureUrl || pitchDeck.url || '';

  const fileName =
    fallbackFileName ||
    pitchDeck.original_filename ||
    pitchDeck.originalFileName ||
    pitchDeck.fileName ||
    pitchDeck.public_id ||
    'pitch-deck';

  return {
    url,
    secureUrl,
    publicId: pitchDeck.public_id || pitchDeck.publicId || '',
    assetId: pitchDeck.asset_id || pitchDeck.assetId || '',
    fileName,
    originalFileName: pitchDeck.original_filename || pitchDeck.originalFileName || fileName,
    fileType: fallbackMimeType || pitchDeck.mime_type || pitchDeck.fileType || '',
    fileSize: pitchDeck.bytes || pitchDeck.fileSize || 0,
    resourceType: pitchDeck.resource_type || pitchDeck.resourceType || '',
    format: pitchDeck.format || '',
    provider: 'cloudinary'
  };
};

const updateTextFields = (target, source, allowedFields) => {
  allowedFields.forEach((field) => {
    if (source[field] !== undefined) {
      target[field] = String(source[field]).trim();
    }
  });
};

const updateNumberFields = (target, source, allowedFields) => {
  allowedFields.forEach((field) => {
    if (source[field] !== undefined) {
      const value = Number(source[field]);

      if (!Number.isNaN(value)) {
        target[field] = value;
      }
    }
  });
};

const calculatePitchCompleted = (startup) => {
  const pitch = startup.pitch || {};
  const investmentDetails = startup.investmentDetails || {};

  return Boolean(
    pitch.oneLinePitch &&
      pitch.problem &&
      pitch.solution &&
      pitch.targetMarket &&
      investmentDetails.valuationAsk > 0 &&
      startup.pitchDeckUrl
  );
};

// simulate mca api call for cin verification
const verifyMCAStatus = async (cin) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!cin || cin.length !== 21) {
        return resolve({ verified: false, message: 'Invalid CIN format' });
      }
      resolve({ 
        verified: true, 
        legalName: 'Auto-Fetched Company Name Pvt Ltd'
      });
    }, 600);
  });
};

// @desc    Founder creates startup
// @route   POST /api/startups
// @access  founder
export const createStartup = async (req, res) => {
  try {
    const {
      companyName,
      cin,
      authorizedCapital,
      paidUpCapital,
      valuationAsk,
      pitchDeckUrl,
      pitchVideoUrl
    } = req.body;

    if (!companyName || !cin || valuationAsk === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Company name, CIN, and valuation ask are required'
      });
    }

    if (req.user.role !== 'founder') {
      return res.status(403).json({
        success: false,
        message: 'Only founders can create startups'
      });
    }

    const existingStartupByFounder = await Startup.findOne({
      founderId: req.user._id
    });

    if (existingStartupByFounder) {
      return res.status(400).json({
        success: false,
        message: 'Founder already has a startup'
      });
    }

    const normalizedCin = cin.toUpperCase().trim();

    const existingStartupByCin = await Startup.findOne({
      cin: normalizedCin
    });

    if (existingStartupByCin) {
      return res.status(409).json({
        success: false,
        message: 'Startup with this CIN already exists'
      });
    }

    const numericValuationAsk = Number(valuationAsk);

    if (Number.isNaN(numericValuationAsk) || numericValuationAsk <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid valuation ask is required'
      });
    }

    // verify cin with mca before creating
    const mcaResponse = await verifyMCAStatus(normalizedCin);
    
    if (!mcaResponse.verified) {
      return res.status(400).json({ 
        success: false, 
        message: 'MCA Verification failed. Please check your CIN.' 
      });
    }

    const startup = await Startup.create({
      founderId: req.user._id,
      companyName: companyName.trim(),
      cin: normalizedCin,
      mcaStatus: 'Verified',
      authorizedCapital: authorizedCapital || 0,
      paidUpCapital: paidUpCapital || 0,
      valuationAsk: numericValuationAsk,
      pitchDeckUrl: pitchDeckUrl || '',
      pitchVideoUrl: pitchVideoUrl || '',
      investmentDetails: {
        valuationAsk: numericValuationAsk
      },
      isLive: false
    });

    return res.status(201).json({
      success: true,
      message: 'Startup created successfully. Now you can upload detailed pitch and wait for admin approval.',
      startup
    });
  } catch (error) {
    console.error('Create Startup Error:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Startup already exists with this founder or CIN'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error while creating startup'
    });
  }
};

// @desc    Get logged-in founder startup
// @route   GET /api/startups/my
// @access  founder
export const getMyStartup = async (req, res) => {
  try {
    if (req.user.role !== 'founder') {
      return res.status(403).json({
        success: false,
        message: 'Only founders can access this route'
      });
    }

    const startup = await Startup.findOne({
      founderId: req.user._id
    }).populate('founderId', 'name email role isVerified');

    if (!startup) {
      return res.status(404).json({
        success: false,
        message: 'No startup found for this founder'
      });
    }

    return res.status(200).json({
      success: true,
      startup
    });
  } catch (error) {
    console.error('Get My Startup Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error while fetching startup'
    });
  }
};

// @desc    Get startups
// @route   GET /api/startups
// @access  investor / founder / admin
export const getStartups = async (req, res) => {
  try {
    const filter = {};

    if (req.user.role === 'investor') {
      filter.isLive = true;
    }

    if (req.user.role === 'founder') {
      filter.founderId = req.user._id;
    }

    const startups = await Startup.find(filter)
      .populate('founderId', 'name email role isVerified')
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      count: startups.length,
      startups
    });
  } catch (error) {
    console.error('Get Startups Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error while fetching startups'
    });
  }
};

// @desc    Get single startup by ID
// @route   GET /api/startups/:id
// @access  protected
export const getStartupById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid startup ID'
      });
    }

    const startup = await Startup.findById(id).populate(
      'founderId',
      'name email role isVerified'
    );

    if (!startup) {
      return res.status(404).json({
        success: false,
        message: 'Startup not found'
      });
    }

    if (req.user.role === 'investor' && !startup.isLive) {
      return res.status(403).json({
        success: false,
        message: 'You cannot view startups that are not live yet'
      });
    }

    if (
      req.user.role === 'founder' &&
      startup.founderId._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own startup'
      });
    }

    return res.status(200).json({
      success: true,
      startup
    });
  } catch (error) {
    console.error('Get Startup By ID Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error while fetching startup'
    });
  }
};

// @desc    Founder updates own startup basic details
// @route   PUT /api/startups/my
// @access  founder
export const updateMyStartup = async (req, res) => {
  try {
    if (req.user.role !== 'founder') {
      return res.status(403).json({
        success: false,
        message: 'Only founders can update startups'
      });
    }

    const startup = await Startup.findOne({
      founderId: req.user._id
    });

    if (!startup) {
      return res.status(404).json({
        success: false,
        message: 'No startup found for this founder'
      });
    }

    const allowedUpdates = [
      'companyName',
      'authorizedCapital',
      'paidUpCapital',
      'valuationAsk',
      'pitchDeckUrl',
      'pitchVideoUrl'
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === 'companyName') {
          startup[field] = req.body[field].trim();
        } else if (
          ['authorizedCapital', 'paidUpCapital', 'valuationAsk'].includes(field)
        ) {
          const value = Number(req.body[field]);

          if (!Number.isNaN(value)) {
            startup[field] = value;

            if (field === 'valuationAsk') {
              startup.investmentDetails.valuationAsk = value;
            }
          }
        } else {
          startup[field] = req.body[field];
        }
      }
    });

    startup.isLive = false;
    startup.mcaStatus = 'Pending';

    const updatedStartup = await startup.save();

    return res.status(200).json({
      success: true,
      message: 'Startup updated successfully. Admin approval required again.',
      startup: updatedStartup
    });
  } catch (error) {
    console.error('Update Startup Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error while updating startup'
    });
  }
};

// @desc    Generate Cloudinary signature for pitch deck upload
// @route   POST /api/startups/:id/pitch-deck/signature
// @access  founder
export const createPitchDeckSignature = async (req, res) => {
  try {
    const { id } = req.params;
    const { fileName, fileSize, mimeType } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid startup ID'
      });
    }

    if (!fileName) {
      return res.status(400).json({
        success: false,
        message: 'fileName is required'
      });
    }

    if (!fileSize || Number(fileSize) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid fileSize is required'
      });
    }

    if (Number(fileSize) > getMaxPitchDeckBytes()) {
      return res.status(400).json({
        success: false,
        message: 'Pitch deck file size exceeds allowed limit'
      });
    }

    if (!mimeType || !allowedPitchDeckMimeTypes.includes(mimeType)) {
      return res.status(400).json({
        success: false,
        message: 'This pitch deck file type is not allowed'
      });
    }

    const startup = await Startup.findById(id);

    if (!startup) {
      return res.status(404).json({
        success: false,
        message: 'Startup not found'
      });
    }

    if (!isStartupOwner(startup, req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only upload pitch deck for your own startup'
      });
    }

    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return res.status(500).json({
        success: false,
        message: 'Cloudinary environment variables are missing'
      });
    }

    const timestamp = Math.round(Date.now() / 1000);
    const uploadId = crypto.randomUUID();

    const folder = process.env.CLOUDINARY_PITCH_FOLDER || 'startup-pitches';
    const cleanName = sanitizeFileName(fileName);
    const publicId = `${folder}/${startup._id}/${Date.now()}-${cleanName}`;
    const resourceType = getResourceTypeFromMimeType(mimeType);

    const paramsToSign = {
      public_id: publicId,
      timestamp
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    );

    return res.status(200).json({
      success: true,
      upload: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        timestamp,
        signature,
        publicId,
        uploadId,
        resourceType,
        uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`
      }
    });
  } catch (error) {
    console.error('Create Pitch Deck Signature Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error while creating pitch deck upload signature'
    });
  }
};

// @desc    Founder updates startup pitch, investment details, and pitch deck metadata
// @route   PUT /api/startups/:id/pitch
// @access  founder
export const updateStartupPitch = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      pitch,
      investmentDetails,
      pitchDeck,
      pitchVideoUrl
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid startup ID'
      });
    }

    const startup = await Startup.findById(id);

    if (!startup) {
      return res.status(404).json({
        success: false,
        message: 'Startup not found'
      });
    }

    if (!isStartupOwner(startup, req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only update pitch for your own startup'
      });
    }

    if (!pitch && !investmentDetails && !pitchDeck && pitchVideoUrl === undefined) {
      return res.status(400).json({
        success: false,
        message: 'At least one pitch field is required'
      });
    }

    if (pitch && typeof pitch === 'object') {
      updateTextFields(startup.pitch, pitch, [
        'oneLinePitch',
        'problem',
        'solution',
        'targetMarket',
        'businessModel',
        'traction',
        'competitors',
        'uniqueValue',
        'teamOverview',
        'futurePlan',
        'risks'
      ]);
    }

    if (investmentDetails && typeof investmentDetails === 'object') {
      if (investmentDetails.fundingStage !== undefined) {
        startup.investmentDetails.fundingStage = String(
          investmentDetails.fundingStage
        ).trim();
      }

      updateNumberFields(startup.investmentDetails, investmentDetails, [
        'amountRequired',
        'equityOffered',
        'valuationAsk',
        'minimumInvestment'
      ]);

      updateTextFields(startup.investmentDetails, investmentDetails, [
        'useOfFunds',
        'expectedROI'
      ]);

      if (investmentDetails.valuationAsk !== undefined) {
        const value = Number(investmentDetails.valuationAsk);

        if (!Number.isNaN(value) && value > 0) {
          startup.valuationAsk = value;
        }
      }
    }

    if (pitchDeck && typeof pitchDeck === 'object') {
      const attachmentUrl =
        pitchDeck.secure_url || pitchDeck.secureUrl || pitchDeck.url;

      if (!attachmentUrl) {
        return res.status(400).json({
          success: false,
          message: 'Invalid pitch deck Cloudinary response'
        });
      }

      const normalizedPitchDeck = normalizeCloudinaryPitchDeck({
        pitchDeck,
        fallbackFileName: req.body.fileName,
        fallbackMimeType: req.body.mimeType
      });

      startup.pitchDeck = normalizedPitchDeck;
      startup.pitchDeckUrl =
        normalizedPitchDeck.secureUrl || normalizedPitchDeck.url;
    }

    if (pitchVideoUrl !== undefined) {
      startup.pitchVideoUrl = String(pitchVideoUrl).trim();
    }

    startup.pitchCompleted = calculatePitchCompleted(startup);
    startup.pitchUpdatedAt = new Date();

    /*
      Pitch data is investor-facing.
      If founder changes pitch, admin should approve again.
    */
    startup.isLive = false;
    startup.mcaStatus = 'Pending';

    const updatedStartup = await startup.save();

    return res.status(200).json({
      success: true,
      message: 'Pitch updated successfully. Admin approval required again.',
      startup: updatedStartup
    });
  } catch (error) {
    console.error('Update Startup Pitch Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error while updating startup pitch'
    });
  }
};

// @desc    Get startup pitch details
// @route   GET /api/startups/:id/pitch
// @access  founder / investor / admin
export const getStartupPitch = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid startup ID'
      });
    }

    const startup = await Startup.findById(id).populate(
      'founderId',
      'name email role isVerified'
    );

    if (!startup) {
      return res.status(404).json({
        success: false,
        message: 'Startup not found'
      });
    }

    if (req.user.role === 'investor' && !startup.isLive) {
      return res.status(403).json({
        success: false,
        message: 'You cannot view pitch of a startup that is not live'
      });
    }

    if (
      req.user.role === 'founder' &&
      startup.founderId._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own startup pitch'
      });
    }

    return res.status(200).json({
      success: true,
      pitchData: {
        startupId: startup._id,
        companyName: startup.companyName,
        cin: startup.cin,
        mcaStatus: startup.mcaStatus,
        isLive: startup.isLive,
        founder: startup.founderId,
        valuationAsk: startup.valuationAsk,
        pitch: startup.pitch,
        investmentDetails: startup.investmentDetails,
        pitchDeck: startup.pitchDeck,
        pitchDeckUrl: startup.pitchDeckUrl,
        pitchVideoUrl: startup.pitchVideoUrl,
        pitchCompleted: startup.pitchCompleted,
        pitchUpdatedAt: startup.pitchUpdatedAt
      }
    });
  } catch (error) {
    console.error('Get Startup Pitch Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error while fetching startup pitch'
    });
  }
};

// @desc    Admin makes startup live
// @route   PATCH /api/startups/:id/verify
// @access  admin
export const verifyStartup = async (req, res) => {
  try {
    const { id } = req.params;
    const { mcaStatus, authorizedCapital, paidUpCapital } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin can verify startups'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid startup ID'
      });
    }

    const startup = await Startup.findById(id);

    if (!startup) {
      return res.status(404).json({
        success: false,
        message: 'Startup not found'
      });
    }

    if (!startup.pitchCompleted) {
      return res.status(400).json({
        success: false,
        message: 'Startup pitch is incomplete. Complete pitch before verification.'
      });
    }

    startup.isLive = true;
    startup.mcaStatus = mcaStatus || 'Verified';

    if (authorizedCapital !== undefined) {
      startup.authorizedCapital = authorizedCapital;
    }

    if (paidUpCapital !== undefined) {
      startup.paidUpCapital = paidUpCapital;
    }

    const updatedStartup = await startup.save();

    return res.status(200).json({
      success: true,
      message: 'Startup verified and made live successfully',
      startup: updatedStartup
    });
  } catch (error) {
    console.error('Verify Startup Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error while verifying startup'
    });
  }
};

// @desc    Admin removes startup from live listing
// @route   PATCH /api/startups/:id/unverify
// @access  admin
export const unverifyStartup = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin can unverify startups'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid startup ID'
      });
    }

    const startup = await Startup.findById(id);

    if (!startup) {
      return res.status(404).json({
        success: false,
        message: 'Startup not found'
      });
    }

    startup.isLive = false;
    startup.mcaStatus = 'Pending';

    const updatedStartup = await startup.save();

    return res.status(200).json({
      success: true,
      message: 'Startup removed from live listing',
      startup: updatedStartup
    });
  } catch (error) {
    console.error('Unverify Startup Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error while unverifying startup'
    });
  }
};

// @desc    Admin deletes startup
// @route   DELETE /api/startups/:id
// @access  admin
export const deleteStartup = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin can delete startups'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid startup ID'
      });
    }

    const startup = await Startup.findById(id);

    if (!startup) {
      return res.status(404).json({
        success: false,
        message: 'Startup not found'
      });
    }

    await startup.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Startup deleted successfully'
    });
  } catch (error) {
    console.error('Delete Startup Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error while deleting startup'
    });
  }
};