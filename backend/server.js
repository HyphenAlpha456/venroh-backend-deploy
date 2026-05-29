import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import connectDB from './src/config/db.js';

import authRoutes from './src/routes/authRoutes.js';
import startupRoutes from './src/routes/startupRoutes.js';
import walletRoutes from './src/routes/walletRoutes.js';
import meetingRoutes from './src/routes/meetingRoutes.js';
import chatRoutes from './src/routes/chatRoutes.js';

import { initSocket } from './src/socket/socket.js';

dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const server = http.createServer(app);

// Init Socket.io for ultra-low latency (forced websockets)
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    methods: ['GET', 'POST']
  },
  transports: ['websocket'] 
});

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

// ==========================================
// MESH TOPOLOGY SIGNALING MAILROOM
// ==========================================
io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  socket.on('join-room', ({ roomId }) => {
    socket.join(roomId);
    
    // Alert existing room members to initiate peer connections
    socket.to(roomId).emit('user-connected', socket.id);

    // Targeted WebRTC Handshakes (Critical for Multi-party)
    socket.on('webrtc-offer', ({ offer, targetId }) => {
      io.to(targetId).emit('webrtc-offer', { offer, callerId: socket.id });
    });

    socket.on('webrtc-answer', ({ answer, targetId }) => {
      io.to(targetId).emit('webrtc-answer', { answer, callerId: socket.id });
    });

    socket.on('ice-candidate', ({ candidate, targetId }) => {
      io.to(targetId).emit('ice-candidate', { candidate, callerId: socket.id });
    });

    // UI Sync
    socket.on('raise-hand', () => {
      socket.to(roomId).emit('user-raised-hand', socket.id);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
      socket.to(roomId).emit('user-disconnected', socket.id);
    });
  });
});

app.use((err, req, res, next) => {
  console.error('Global Error:', err);

  const statusCode = err.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

initSocket(server);

server.listen(PORT, () => {
  console.log(`Server is ALIVE and routing traffic on port ${PORT}`);
});