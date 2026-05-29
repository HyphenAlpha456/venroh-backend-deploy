import { v4 as uuidv4 } from 'uuid';
import { google } from 'googleapis';
import Meeting from '../models/Meeting.js';
import Startup from '../models/Startup.js';
import User from '../models/User.js'; 

const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || './google-credentials.json',
  scopes: ['https://www.googleapis.com/auth/calendar.events'],
});

const calendar = google.calendar({ version: 'v3', auth });

const createCalendarInvite = async (investorEmail, founderEmail, scheduledTime, meetingUrl) => {
  const event = {
    summary: 'VenRoh Secure Pitch Room',
    description: `Your pitch session is scheduled. Join the live WebRTC video room here: ${meetingUrl}`,
    start: {
      dateTime: new Date(scheduledTime).toISOString(),
      timeZone: 'Asia/Kolkata',
    },
    end: {
      dateTime: new Date(new Date(scheduledTime).getTime() + 60 * 60 * 1000).toISOString(),
      timeZone: 'Asia/Kolkata',
    },
    attendees: [
      { email: investorEmail },
      { email: founderEmail },
    ],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 10 },
      ],
    },
  };

  await calendar.events.insert({
    calendarId: 'primary',
    resource: event,
    sendUpdates: 'all', 
  });
};

export const updateAvailabilitySlots = async (req, res) => {
  const { slots } = req.body; 

  if (!Array.isArray(slots)) {
    return res.status(400).json({ success: false, message: 'Slots must be an array' });
  }

  try {
    const startup = await Startup.findOne({ founderId: req.user._id });
    if (!startup) {
      return res.status(404).json({ success: false, message: 'Startup not found' });
    }

    const formattedSlots = slots.map(slot => ({
      startTime: new Date(slot.startTime),
      endTime: new Date(slot.endTime),
      status: 'available',
      bookedBy: null
    }));

    startup.availabilitySlots = formattedSlots;
    await startup.save();

    return res.status(200).json({ success: true, slots: startup.availabilitySlots });
  } catch (error) {
    console.error('Update Slots Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update availability slots' });
  }
};

export const bookMeetingSlot = async (req, res) => {
  const { startupId, slotId } = req.body;

  try {
    const investorId = req.user._id;

    const startup = await Startup.findOneAndUpdate(
      { _id: startupId, 'availabilitySlots._id': slotId },
      { $pull: { availabilitySlots: { _id: slotId } } },
      { returnDocument: 'before' } 
    );

    if (!startup) {
      return res.status(400).json({ success: false, message: 'Too late! Slot is no longer available.' });
    }

    const deletedSlot = startup.availabilitySlots.id(slotId);
    
    const customRoomId = uuidv4();
    const frontendBaseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const meetingUrl = `${frontendBaseUrl}/meeting/${customRoomId}`;

    const meeting = await Meeting.create({
      hostId: startup.founderId,
      investorId,
      startupId: startup._id,
      roomId: customRoomId,
      meetingUrl: meetingUrl,
      scheduledAt: deletedSlot.startTime,
      duration: Math.round((new Date(deletedSlot.endTime) - new Date(deletedSlot.startTime)) / 60000),
      status: 'scheduled'
    });

    try {
      const investor = await User.findById(investorId).lean();
      const founder = await User.findById(startup.founderId).lean();
      
      if (investor?.email && founder?.email) {
        await createCalendarInvite(investor.email, founder.email, meeting.scheduledAt, meetingUrl);
      }
    } catch (calendarError) {
      console.error(`[Calendar API Error]: ${calendarError.message} - Keys missing or invalid.`);
    }

    return res.status(201).json({
      success: true,
      message: 'Slot claimed and removed from public availability!',
      meeting
    });
  } catch (error) {
    console.error('Booking Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during booking.' });
  }
};

export const requestMeeting = async (req, res) => {
  try {
    const { startupId, scheduledAt } = req.body;

    if (!startupId || !scheduledAt) {
      return res.status(400).json({ success: false, message: 'Startup ID and Scheduled Time are required' });
    }

    const startup = await Startup.findById(startupId).lean();
    if (!startup) {
      return res.status(404).json({ success: false, message: 'Startup not found' });
    }

    const existingRequest = await Meeting.findOne({
      investorId: req.user._id,
      startupId: startup._id,
      status: 'pending'
    }).lean();

    if (existingRequest) {
      return res.status(429).json({ success: false, message: 'Pending meeting request already exists.' });
    }

    const meeting = await Meeting.create({
      hostId: startup.founderId,
      investorId: req.user._id,
      startupId: startup._id,
      scheduledAt,
      status: 'pending' 
    });

    return res.status(201).json({ success: true, meeting });
  } catch (error) {
    console.error(`[Meeting Request Error]: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error requesting meeting' });
  }
};

export const acceptMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
    if (meeting.hostId.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Unauthorized' });
    if (meeting.status !== 'pending') return res.status(400).json({ success: false, message: `Meeting is ${meeting.status}` });

    const customRoomId = uuidv4(); 
    const frontendBaseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    
    meeting.status = 'scheduled';
    meeting.roomId = customRoomId;
    meeting.meetingUrl = `${frontendBaseUrl}/meet/${customRoomId}`; 

    await meeting.save();

    try {
      const investor = await User.findById(meeting.investorId).lean();
      const founder = await User.findById(meeting.hostId).lean();
      
      if (investor?.email && founder?.email) {
        await createCalendarInvite(investor.email, founder.email, meeting.scheduledAt, meeting.meetingUrl);
      }
    } catch (calendarError) {
      console.error(`[Calendar API Error]: ${calendarError.message} - Keys missing or invalid.`);
    }

    return res.status(200).json({ success: true, meeting });
  } catch (error) {
    console.error(`[Accept Meeting Error]: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error accepting meeting' });
  }
};

export const getPendingRequests = async (req, res) => {
  try {
    const pendingMeetings = await Meeting.find({ hostId: req.user._id, status: 'pending' })
      .populate('investorId', 'name email')
      .sort({ scheduledAt: 1 })
      .lean();

    return res.status(200).json({ success: true, count: pendingMeetings.length, meetings: pendingMeetings });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error fetching pending requests' });
  }
};

export const getUpcomingMeetings = async (req, res) => {
  try {
    const filter = req.user.role === 'founder' ? { hostId: req.user._id } : { investorId: req.user._id };
    filter.status = 'scheduled';

    const upcomingMeetings = await Meeting.find(filter)
      .populate('investorId', 'name email')
      .populate('startupId', 'companyName cin')
      .sort({ scheduledAt: 1 })
      .lean();

    return res.status(200).json({ success: true, count: upcomingMeetings.length, meetings: upcomingMeetings });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error fetching upcoming meetings' });
  }
};

export const endMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
    if (meeting.hostId.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Unauthorized' });
    if (meeting.status === 'completed') return res.status(400).json({ success: false, message: 'Already completed' });

    meeting.status = 'completed';
    meeting.endedAt = new Date();
    await meeting.save();

    return res.status(200).json({ success: true, meeting });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error ending meeting' });
  }
};

export const getTurnCredentials = async (req, res) => {
  try {
    return res.status(200).json({ success: true, message: 'Configure Twilio keys to activate TURN relay.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to generate TURN credentials' });
  }
};