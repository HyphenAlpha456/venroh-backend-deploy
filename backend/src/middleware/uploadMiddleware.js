import multer from 'multer';
import path from 'path';
import fs from 'fs';

const chatUploadPath = 'uploads/chat';

if (!fs.existsSync(chatUploadPath)) {
  fs.mkdirSync(chatUploadPath, { recursive: true });
}

const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain'
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, chatUploadPath);
  },

  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extension = path.extname(file.originalname);

    cb(null, `chat-${uniqueSuffix}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Invalid file type'), false);
  }

  cb(null, true);
};

export const uploadChatFile = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});