import axios from 'axios';

export const uploadToCloudinary = async ({ file, upload }) => {
  const formData = new FormData();

  formData.append('file', file);
  formData.append('api_key', upload.apiKey);
  formData.append('timestamp', upload.timestamp);
  formData.append('signature', upload.signature);
  formData.append('public_id', upload.publicId);

  const response = await axios.post(upload.uploadUrl, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  return response.data;
};