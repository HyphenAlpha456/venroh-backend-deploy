import express from 'express';
import { 
  requestMeeting, 
  acceptMeeting, 
  getPendingRequests, 
  getUpcomingMeetings, 
  endMeeting, 
  getTurnCredentials,
  updateAvailabilitySlots,
  bookMeetingSlot
} from '../controllers/meetingController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/request', protect, authorizeRoles('investor'), requestMeeting);
router.get('/pending', protect, authorizeRoles('founder'), getPendingRequests);
router.patch('/:id/accept', protect, authorizeRoles('founder'), acceptMeeting);
router.patch('/:id/end', protect, authorizeRoles('founder'), endMeeting);
router.get('/upcoming', protect, getUpcomingMeetings);
router.get('/turn-credentials', protect, getTurnCredentials);
router.post('/slots', protect, authorizeRoles('founder'), updateAvailabilitySlots);
router.post('/book', protect, authorizeRoles('investor'), bookMeetingSlot);

export default router;