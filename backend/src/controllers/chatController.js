import mongoose from 'mongoose';
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