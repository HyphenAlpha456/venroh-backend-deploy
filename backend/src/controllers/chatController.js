import crypto from 'crypto';
import mongoose from 'mongoose';

import cloudinary from '../config/cloudinary.js';
import Startup from '../models/Startup.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';

const createParticipantKey = (userId1, userId2) => {
  return [userId1.toString(), userId2.toString()].sort().join('_');
};

const isInvestorFounderPair = (role1, role2) => {
  const pair = [role1, role2].sort().join('_');
  return pair === 'founder_investor';
};

const getMaxChatFileBytes = () => {
  return Number(process.env.MAX_CHAT_FILE_BYTES || 5368709120);
};

const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream'
];

const sanitizeFileName = (fileName = 'file') => {
  return fileName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
};

const getResourceTypeFromMimeType = (mimeType = '') => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  return 'raw';
};

const checkConversationAccess = async ({ conversationId, user }) => {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    return {
      ok: false,
      statusCode: 400,
      message: 'Invalid conversation ID'
    };
  }

  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    return {
      ok: false,
      statusCode: 404,
      message: 'Conversation not found'
    };
  }

  const isParticipant = conversation.participants.some(
    (id) => id.toString() === user._id.toString()
  );

  if (!isParticipant) {
    return {
      ok: false,
      statusCode: 403,
      message: 'You are not allowed to access this conversation'
    };
  }

  const startup = await Startup.findById(conversation.startupId);

  if (!startup) {
    return {
      ok: false,
      statusCode: 404,
      message: 'Startup linked with this conversation was not found'
    };
  }

  if (!startup.isLive) {
    return {
      ok: false,
      statusCode: 403,
      message: 'Chat is disabled because this startup is not live'
    };
  }

  return {
    ok: true,
    conversation,
    startup
  };
};

const normalizeCloudinaryAttachment = ({ attachment, fallbackFileName, fallbackMimeType }) => {
  const secureUrl = attachment.secure_url || attachment.secureUrl || '';
  const url = secureUrl || attachment.url || '';

  const fileName =
    fallbackFileName ||
    attachment.original_filename ||
    attachment.originalFileName ||
    attachment.fileName ||
    attachment.public_id ||
    'file';

  return {
    url,
    secureUrl,
    publicId: attachment.public_id || attachment.publicId || '',
    assetId: attachment.asset_id || attachment.assetId || '',
    fileName,
    originalFileName: attachment.original_filename || attachment.originalFileName || fileName,
    fileType: fallbackMimeType || attachment.mime_type || attachment.fileType || '',
    fileSize: attachment.bytes || attachment.fileSize || 0,
    resourceType: attachment.resource_type || attachment.resourceType || '',
    format: attachment.format || '',
    bytes: attachment.bytes || 0,
    width: attachment.width || null,
    height: attachment.height || null,
    cloudinaryVersion: attachment.version || null,
    provider: 'cloudinary'
  };
};

// @desc    Investor starts or gets conversation with startup founder
// @route   POST /api/v1/chat/startups/:startupId
// @access  investor
export const createConversationFromStartup = async (req, res) => {
  try {
    const { startupId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(startupId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid startup ID'
      });
    }

    if (req.user.role !== 'investor') {
      return res.status(403).json({
        success: false,
        message: 'Only investors can start chat from startup page'
      });
    }

    const startup = await Startup.findById(startupId).populate(
      'founderId',
      'name email role isVerified'
    );

    if (!startup) {
      return res.status(404).json({
        success: false,
        message: 'Startup not found'
      });
    }

    if (!startup.isLive) {
      return res.status(403).json({
        success: false,
        message: 'You cannot chat with a startup that is not live'
      });
    }

    const founder = startup.founderId;

    if (!founder) {
      return res.status(404).json({
        success: false,
        message: 'Founder not found for this startup'
      });
    }

    if (!isInvestorFounderPair(req.user.role, founder.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only investor-founder chat is allowed'
      });
    }

    const participantKey = createParticipantKey(req.user._id, founder._id);

    let conversation = await Conversation.findOne({ participantKey })
      .populate('participants', 'name email role isVerified')
      .populate('startupId', 'companyName cin mcaStatus valuationAsk pitchDeckUrl isLive')
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'senderId',
          select: 'name email role'
        }
      });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, founder._id],
        participantKey,
        startupId: startup._id
      });

      conversation = await Conversation.findById(conversation._id)
        .populate('participants', 'name email role isVerified')
        .populate('startupId', 'companyName cin mcaStatus valuationAsk pitchDeckUrl isLive')
        .populate({
          path: 'lastMessage',
          populate: {
            path: 'senderId',
            select: 'name email role'
          }
        });
    }

    return res.status(200).json({
      success: true,
      message: 'Conversation ready',
      conversation
    });
  } catch (error) {
    console.error('Create Conversation From Startup Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error while creating conversation'
    });
  }
};

// @desc    Get logged-in user's conversations
// @route   GET /api/v1/chat/conversations
// @access  investor/founder
export const getMyConversations = async (req, res) => {
  try {
    if (!['investor', 'founder'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only investors and founders can access conversations'
      });
    }

    const conversations = await Conversation.find({
      participants: req.user._id
    })
      .populate('participants', 'name email role isVerified')
      .populate('startupId', 'companyName cin mcaStatus valuationAsk pitchDeckUrl isLive')
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'senderId',
          select: 'name email role'
        }
      })
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      count: conversations.length,
      conversations
    });
  } catch (error) {
    console.error('Get My Conversations Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error while fetching conversations'
    });
  }
};

// @desc    Get messages for one conversation
// @route   GET /api/v1/chat/conversations/:conversationId/messages
// @access  investor/founder
export const getConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation ID'
      });
    }

    const conversation = await Conversation.findById(conversationId).populate(
      'startupId',
      'isLive'
    );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    const isParticipant = conversation.participants.some(
      (id) => id.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to view this conversation'
      });
    }

    const messages = await Message.find({ conversationId })
      .populate('senderId', 'name email role')
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      count: messages.length,
      messages
    });
  } catch (error) {
    console.error('Get Conversation Messages Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error while fetching messages'
    });
  }
};

// @desc    Generate Cloudinary signed upload params for chat file
// @route   POST /api/v1/chat/conversations/:conversationId/cloudinary-signature
// @access  investor/founder
export const createCloudinaryChatUploadSignature = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { fileName, fileSize, mimeType } = req.body;

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

    if (Number(fileSize) > getMaxChatFileBytes()) {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds backend allowed limit'
      });
    }

    if (mimeType && !allowedMimeTypes.includes(mimeType)) {
      return res.status(400).json({
        success: false,
        message: 'This file type is not allowed'
      });
    }

    const access = await checkConversationAccess({
      conversationId,
      user: req.user
    });

    if (!access.ok) {
      return res.status(access.statusCode).json({
        success: false,
        message: access.message
      });
    }

    const timestamp = Math.round(Date.now() / 1000);
    const uploadId = crypto.randomUUID();

    const folder = process.env.CLOUDINARY_CHAT_FOLDER || 'chat-files';
    const cleanName = sanitizeFileName(fileName);
    const publicId = `${folder}/${conversationId}/${req.user._id}/${Date.now()}-${cleanName}`;

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
    console.error('Create Cloudinary Chat Upload Signature Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error while creating Cloudinary upload signature'
    });
  }
};

// @desc    Save Cloudinary uploaded file as chat message
// @route   POST /api/v1/chat/conversations/:conversationId/cloudinary-file-message
// @access  investor/founder
export const saveCloudinaryFileMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { text = '', attachment, fileName, mimeType } = req.body;

    if (!attachment) {
      return res.status(400).json({
        success: false,
        message: 'attachment is required'
      });
    }

    const attachmentUrl = attachment.secure_url || attachment.secureUrl || attachment.url;

    if (!attachmentUrl) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Cloudinary attachment response'
      });
    }

    const access = await checkConversationAccess({
      conversationId,
      user: req.user
    });

    if (!access.ok) {
      return res.status(access.statusCode).json({
        success: false,
        message: access.message
      });
    }

    const normalizedAttachment = normalizeCloudinaryAttachment({
      attachment,
      fallbackFileName: fileName,
      fallbackMimeType: mimeType
    });

    let message = await Message.create({
      conversationId,
      senderId: req.user._id,
      text: text?.trim() || '',
      attachments: [normalizedAttachment],
      readBy: [req.user._id]
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      lastMessageText: text?.trim() || '📎 Attachment',
      updatedAt: new Date()
    });

    message = await Message.findById(message._id).populate(
      'senderId',
      'name email role'
    );

    return res.status(201).json({
      success: true,
      message: 'Cloudinary file message saved successfully',
      data: message
    });
  } catch (error) {
    console.error('Save Cloudinary File Message Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error while saving Cloudinary file message'
    });
  }
};