import api from './api';

export const createConversationFromStartup = async (startupId) => {
  const response = await api.post(`/v1/chat/startups/${startupId}`);
  return response.data;
};

export const getMyConversations = async () => {
  const response = await api.get('/v1/chat/conversations');
  return response.data;
};

export const getConversationMessages = async (
  conversationId,
  page = 1,
  limit = 20
) => {
  const response = await api.get(
    `/v1/chat/conversations/${conversationId}/messages?page=${page}&limit=${limit}`
  );
  return response.data;
};

export const sendMessage = async (conversationId, text) => {
  const response = await api.post(
    `/v1/chat/conversations/${conversationId}/messages`,
    { text }
  );
  return response.data;
};

export const markConversationAsRead = async (conversationId) => {
  const response = await api.put(
    `/v1/chat/conversations/${conversationId}/read`
  );
  return response.data;
};

export const createCloudinaryChatUploadSignature = async (
  conversationId,
  data
) => {
  const response = await api.post(
    `/v1/chat/conversations/${conversationId}/cloudinary-signature`,
    data
  );
  return response.data;
};

export const saveCloudinaryFileMessage = async (conversationId, data) => {
  const response = await api.post(
    `/v1/chat/conversations/${conversationId}/cloudinary-file-message`,
    data
  );
  return response.data;
};