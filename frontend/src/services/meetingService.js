import api from './api';

export const requestMeeting = async (data) => {
  const response = await api.post('/v1/meetings/request', data);
  return response.data;
};

export const getPendingRequests = async () => {
  const response = await api.get('/v1/meetings/pending');
  return response.data;
};

export const acceptMeeting = async (meetingId) => {
  const response = await api.patch(`/v1/meetings/${meetingId}/accept`);
  return response.data;
};

export const endMeeting = async (meetingId) => {
  const response = await api.patch(`/v1/meetings/${meetingId}/end`);
  return response.data;
};

export const getUpcomingMeetings = async () => {
  const response = await api.get('/v1/meetings/upcoming');
  return response.data;
};

export const getTurnCredentials = async () => {
  const response = await api.get('/v1/meetings/turn-credentials');
  return response.data;
};

export const updateAvailabilitySlots = async (slots) => {
  const response = await api.post('/v1/meetings/slots', { slots });
  return response.data;
};

export const bookMeetingSlot = async (data) => {
  const response = await api.post('/v1/meetings/book', data);
  return response.data;
};