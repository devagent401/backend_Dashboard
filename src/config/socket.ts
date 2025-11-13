import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import logger from './logger.js';

interface DecodedToken {
  userId: string;
  role: string;
}

let io: SocketIOServer;

export const initializeSocket = (server: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication error: Token required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || '') as DecodedToken;
      socket.data.userId = decoded.userId;
      socket.data.role = decoded.role;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', socket => {
    const userId = socket.data.userId;
    const role = socket.data.role;

    logger.info(`🔌 User connected: ${userId} (${role})`);

    // Join user-specific room
    socket.join(`user:${userId}`);

    // Admin joins admin room
    if (role === 'admin' || role === 'superadmin') {
      socket.join('admin');
    }

    socket.on('disconnect', () => {
      logger.info(`🔌 User disconnected: ${userId}`);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

// Notification emitters
export const emitNotification = (userId: string, notification: any) => {
  io.to(`user:${userId}`).emit('notification', notification);
};

export const emitAdminNotification = (notification: any) => {
  io.to('admin').emit('admin-notification', notification);
};

export const emitOrderUpdate = (userId: string, orderData: any) => {
  io.to(`user:${userId}`).emit('order-update', orderData);
};

export default { initializeSocket, getIO, emitNotification, emitAdminNotification, emitOrderUpdate };

