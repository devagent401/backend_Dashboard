import express, { Application } from 'express';
import { createServer } from 'http';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import connectDB from '@config/database.js';
import logger from '@config/logger.js';
import passportConfig from '@config/passport.js';
import { initializeSocket } from '@config/socket.js';
import routes from '@routes/index.js';
import { errorHandler, notFound } from '@middlewares/error.middleware.js';
import { apiLimiter } from '@middlewares/rateLimit.middleware.js';

// Load environment variables
dotenv.config();

// Create Express app
const app: Application = express();
const httpServer = createServer(app);

// Initialize Socket.io
initializeSocket(httpServer);

// Port
const PORT = process.env.PORT || 5000;
const API_VERSION = process.env.API_VERSION || 'v1';

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// Passport middleware
app.use(passportConfig.initialize());

// Rate limiting
app.use(`/api/${API_VERSION}`, apiLimiter);

// API routes
app.use(`/api/${API_VERSION}`, routes);

// Welcome route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 E-Commerce API',
    version: API_VERSION,
    documentation: `/api/${API_VERSION}/health`,
  });
});

// Error handlers
app.use(notFound);
app.use(errorHandler);

// Start server
const startServer = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDB();

    // Start listening
    httpServer.listen(PORT, () => {
      logger.info(`
╔════════════════════════════════════════╗
║   🚀 E-Commerce Backend Server        ║
╠════════════════════════════════════════╣
║   Environment: ${process.env.NODE_ENV || 'development'}
║   Port: ${PORT}
║   API Version: ${API_VERSION}
║   URL: http://localhost:${PORT}
║   API: http://localhost:${PORT}/api/${API_VERSION}
║   Health: http://localhost:${PORT}/api/${API_VERSION}/health
╚════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error('Unhandled Rejection:', err);
  httpServer.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });
});

// Start the server
startServer();

export default app;

