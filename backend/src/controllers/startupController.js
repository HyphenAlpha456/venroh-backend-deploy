import crypto from 'crypto';
import mongoose from 'mongoose';
import axios from 'axios';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
import Tesseract from 'tesseract.js';
import Startup from '../models/Startup.js';
import cloudinary from '../config/cloudinary.js';
import { getIO } from '../socket/socket.js';
import { verifyRealMCA } from '../services/mcaService.js';
import summarizer from '../services/neuralPitchSummarizer.js';

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

export const createStartup = async (req, res) => {
  try {
    const {
      companyName,
      cin,
      domain,
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

    const mcaResponse = await verifyRealMCA(normalizedCin);
    
    if (!mcaResponse.verified) {
      return res.status(400).json({ 
        success: false, 
        message: mcaResponse.message 
      });
    }

    const startup = await Startup.create({
      founderId: req.user._id,
      companyName: companyName.trim(),
      legalCompanyName: mcaResponse.legalName,
      kycReferenceId: mcaResponse.referenceId,
      domain: domain ? domain.toLowerCase().trim() : '',
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
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching startup'
    });
  }
};

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
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching startups'
    });
  }
};

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
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching startup'
    });
  }
};

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
      'domain',
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
    return res.status(500).json({
      success: false,
      message: 'Server error while updating startup'
    });
  }
};

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
      timestamp,
      type: 'upload',
      access_mode: 'public'
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
    return res.status(500).json({
      success: false,
      message: 'Server error while creating pitch deck upload signature'
    });
  }
};

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

    startup.isLive = false;
    startup.mcaStatus = 'Pending';

    const updatedStartup = await startup.save();

    return res.status(200).json({
      success: true,
      message: 'Pitch updated successfully. Admin approval required again.',
      startup: updatedStartup
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error while updating startup pitch'
    });
  }
};

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
        pitchUpdatedAt: startup.pitchUpdatedAt,
        availabilitySlots: startup.availabilitySlots
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching startup pitch'
    });
  }
};

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
    return res.status(500).json({
      success: false,
      message: 'Server error while verifying startup'
    });
  }
};

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
    return res.status(500).json({
      success: false,
      message: 'Server error while unverifying startup'
    });
  }
};

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
    return res.status(500).json({
      success: false,
      message: 'Server error while deleting startup'
    });
  }
};

export const syncStartupMetrics = async (req, res) => {
  const { id } = req.params;
  
  try {
    const startup = await Startup.findById(id);
    if (!startup) {
      return res.status(404).json({ success: false, message: 'Startup node not found.' });
    }

    const companyDomain = startup.domain || `${startup.companyName.toLowerCase().replace(/\s+/g, '')}.com`;

    const cuFinderResponse = await axios.get('https://api.cufinder.io/v1/revenue', {
      params: {
        domain: companyDomain
      },
      headers: {
        'apiKey': process.env.CUFINDER_API_KEY,
        'Accept': 'application/json'
      },
      timeout: 5000
    });

    const apiData = cuFinderResponse.data;

    if (!apiData || !apiData.revenue) {
      return res.status(422).json({ 
        success: false, 
        message: 'Enrichment failed. Incomplete financial indicators returned from CUFinder upstream.' 
      });
    }

    const freshRevenue = apiData.revenue; 
    const calculatedValuation = apiData.valuation || (freshRevenue * 6); 

    const updatedStartup = await Startup.findByIdAndUpdate(
      id,
      {
        $set: {
          'investmentDetails.annualRevenue': freshRevenue,
          valuationAsk: calculatedValuation,
          'investmentDetails.valuationAsk': calculatedValuation,
          lastEnrichedAt: new Date()
        }
      },
      { new: true, runValidators: true }
    );

    const io = getIO();
    io.emit('matrix_update', {
      type: 'METRIC_SYNC',
      startupId: id,
      valuationAsk: updatedStartup.valuationAsk,
      financials: updatedStartup.investmentDetails
    });

    return res.status(200).json({
      success: true,
      message: 'Upstream financial synchronization complete.',
      data: {
        valuationAsk: updatedStartup.valuationAsk,
        financials: updatedStartup.investmentDetails
      }
    });

  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        message: `Upstream Gateway Error: ${error.response.data?.message || 'CUFinder rejected request.'}`
      });
    }

    return res.status(500).json({ 
      success: false, 
      message: 'Internal processing cluster failure during real-time valuation query.' 
    });
  }
};

export const getPitchDeckUrl = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid startup ID'
      });
    }

    const startup = await Startup.findById(id);

    if (!startup || !startup.pitchDeck || !startup.pitchDeck.publicId) {
      return res.status(404).json({
        success: false,
        message: 'Startup or pitch deck not found'
      });
    }

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });

    const signedUrl = cloudinary.url(startup.pitchDeck.publicId, {
      resource_type: 'raw',
      type: 'authenticated',
      sign_url: true,
      secure: true
    });

    return res.status(200).json({
      success: true,
      url: signedUrl
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate secure link'
    });
  }
};

export const summarizePitch = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    const startup = await Startup.findById(id);
    if (!startup || !startup.pitchDeck?.publicId) {
      return res.status(404).json({ success: false, message: 'Startup or Pitch Deck not found' });
    }

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });

    let summary = "";

    try {
      const signedUrl = cloudinary.utils.private_download_url(
        startup.pitchDeck.publicId,
        'pdf',
        {
          resource_type: startup.pitchDeck.resourceType || 'raw',
          type: 'upload'
        }
      );

      const response = await axios.get(signedUrl, { responseType: 'arraybuffer' });
      const base64Data = Buffer.from(response.data).toString('base64');
      const mimeType = response.headers['content-type'];

      summary = await summarizer.summarizeFile(base64Data, mimeType, 3);
    } catch (err) {
      console.error("--- FETCH FAILED ---", err.message);
    }

    if (!summary) {
      const fallbackText = [startup.pitch?.oneLinePitch, startup.pitch?.problem, startup.pitch?.solution].filter(Boolean).join('. ');
      if (fallbackText && fallbackText.trim().length > 10) {
        summary = await summarizer.summarizeFile(Buffer.from(fallbackText).toString('base64'), 'text/plain', 3);
      }
    }

    if (!summary) {
      return res.status(400).json({ success: false, message: "Could not retrieve document." });
    }

    return res.status(200).json({ success: true, summary });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};