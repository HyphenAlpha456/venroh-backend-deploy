import { v4 as uuidv4 } from 'uuid';
import { google } from 'googleapis';
import twilio from 'twilio';
import Meeting from '../models/Meeting.js';
import Startup from '../models/Startup.js';
import User from '../models/User.js';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const calendar = google.calendar({ version: 'v3', auth: oauth2Client }); 

const createCalendarInvite = async (attendeeEmails, scheduledTime, meetingUrl) => {
  const event = {
    summary: 'VenRoh Secure Pitch Room',
    description: `Your pitch session is scheduled. Join the live video room here: ${meetingUrl}`,
    start: {
      dateTime: new Date(scheduledTime).toISOString(),
      timeZone: 'Asia/Kolkata',
    },
    end: {
      dateTime: new Date(new Date(scheduledTime).getTime() + 60 * 60 * 1000).toISOString(),
      timeZone: 'Asia/Kolkata',
    },
    attendees: attendeeEmails.map(email => ({ email })),
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
  const { startupId, slotId, additionalParticipantIds = [] } = req.body;

  try {
    const investorId = req.user._id;
    const allParticipants = [investorId, ...additionalParticipantIds];

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
      participants: allParticipants,
      startupId: startup._id,
      roomId: customRoomId,
      meetingUrl: meetingUrl,
      scheduledAt: deletedSlot.startTime,
      duration: Math.round((new Date(deletedSlot.endTime) - new Date(deletedSlot.startTime)) / 60000),
      status: 'scheduled'
    });

    try {
      const users = await User.find({ _id: { $in: [meeting.hostId, ...allParticipants] } }).lean();
      const emails = users.map(u => u.email).filter(Boolean);

      if (emails.length > 0) {
        await createCalendarInvite(emails, meeting.scheduledAt, meetingUrl);
      }
    } catch (calendarError) {
      console.error(`[Calendar API Error]: ${calendarError.message}`);
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
    const { startupId, scheduledAt, additionalParticipantIds = [] } = req.body;

    if (!startupId || !scheduledAt) {
      return res.status(400).json({ success: false, message: 'Startup ID and Scheduled Time are required' });
    }

    const startup = await Startup.findById(startupId).lean();
    if (!startup) {
      return res.status(404).json({ success: false, message: 'Startup not found' });
    }

    const existingRequest = await Meeting.findOne({
      participants: req.user._id,
      startupId: startup._id,
      status: 'pending'
    }).lean();

    if (existingRequest) {
      return res.status(429).json({ success: false, message: 'Pending meeting request already exists.' });
    }

    const meeting = await Meeting.create({
      hostId: startup.founderId,
      participants: [req.user._id, ...additionalParticipantIds],
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
      const users = await User.find({ _id: { $in: [meeting.hostId, ...meeting.participants] } }).lean();
      const emails = users.map(u => u.email).filter(Boolean);

      if (emails.length > 0) {
        await createCalendarInvite(emails, meeting.scheduledAt, meeting.meetingUrl);
      }
    } catch (calendarError) {
      console.error(`[Calendar API Error]: ${calendarError.message}`);
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
      .populate('participants', 'name email')
      .sort({ scheduledAt: 1 })
      .lean();

    return res.status(200).json({ success: true, count: pendingMeetings.length, meetings: pendingMeetings });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error fetching pending requests' });
  }
};

export const getUpcomingMeetings = async (req, res) => {
  try {
    const upcomingMeetings = await Meeting.find({
      status: 'scheduled',
      $or: [
        { hostId: req.user._id },
        { participants: req.user._id }
      ]
    })
      .populate('participants', 'name email')
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
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      return res.status(500).json({
        success: false,
        message: 'Twilio credentials missing on server.'
      });
    }

    const client = twilio(accountSid, authToken);
    const token = await client.tokens.create();

    return res.status(200).json({
      success: true,
      iceServers: token.iceServers
    });
  } catch (error) {
    console.error('Twilio Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate secure TURN credentials'
    });
  }
};