import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import connectDB from './src/config/db.js';

import authRoutes from './src/routes/authRoutes.js';
import startupRoutes from './src/routes/startupRoutes.js';
import walletRoutes from './src/routes/walletRoutes.js';
import meetingRoutes from './src/routes/meetingRoutes.js';
import chatRoutes from './src/routes/chatRoutes.js';

dotenv.config();

const app = express();

connectDB();

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/startups', startupRoutes);
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/meetings', meetingRoutes);
app.use('/api/v1/chat', chatRoutes);

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is ALIVE and routing traffic on port ${PORT}`);
});