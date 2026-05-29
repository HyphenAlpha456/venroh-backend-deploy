import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

import connectDB from './src/config/db.js';
import authRoutes from './src/routes/authRoutes.js';
import startupRoutes from './src/routes/startupRoutes.js';
import walletRoutes from './src/routes/walletRoutes.js';
import meetingRoutes from './src/routes/meetingRoutes.js';
import chatRoutes from './src/routes/chatRoutes.js';

// Import the unified socket initializer
import { initSocket } from './src/socket/socket.js';

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Initialize HTTP Server exactly ONCE
const server = http.createServer(app);

connectDB();

app.set('trust proxy', 1);

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
  : ['http://localhost:5173'];

app.use(helmet());

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/startups', startupRoutes);
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/meetings', meetingRoutes);
app.use('/api/v1/chat', chatRoutes);

app.get('/', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'API is running'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Global Error:', err);
  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;

// 2. Initialize Unified Socket.io (Chat + WebRTC are now handled here)
initSocket(server);

// 3. Boot the server
server.listen(PORT, () => {
  console.log(`Server is ALIVE and routing traffic on port ${PORT}`);
});