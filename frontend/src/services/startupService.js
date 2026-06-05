import api from './api';

export const createStartup = async (data) => {
  const response = await api.post('/startups', data);
  return response.data;
};

export const getMyStartup = async () => {
  const response = await api.get('/startups/my');
  return response.data;
};

export const getStartups = async () => {
  const response = await api.get('/startups');
  return response.data;
};

export const getStartupById = async (id) => {
  const response = await api.get(`/startups/${id}`);
  return response.data;
};

export const updateMyStartup = async (data) => {
  const response = await api.put('/startups/my', data);
  return response.data;
};

export const getStartupPitch = async (id) => {
  const response = await api.get(`/startups/${id}/pitch`);
  return response.data;
};

export const updateStartupPitch = async (id, data) => {
  const response = await api.put(`/startups/${id}/pitch`, data);
  return response.data;
};

export const createPitchDeckSignature = async (id, data) => {
  const response = await api.post(`/startups/${id}/pitch-deck/signature`, data);
  return response.data;
};

export const verifyStartup = async (id, data = {}) => {
  const response = await api.patch(`/startups/${id}/verify`, data);
  return response.data;
};

export const unverifyStartup = async (id) => {
  const response = await api.patch(`/startups/${id}/unverify`);
  return response.data;
};

export const deleteStartup = async (id) => {
  const response = await api.delete(`/startups/${id}`);
  return response.data;
};

export const syncStartupMetrics = async (id) => {
  const response = await api.post(`/startups/${id}/sync-metrics`);
  return response.data;
};