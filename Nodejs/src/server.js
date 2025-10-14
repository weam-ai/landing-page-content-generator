const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const config = require('./config/backend-config');

const connectDB = require('./config/database');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

// Import routes
const authRoutes = require('./routes/auth');
const landingPageRoutes = require('./routes/landingPages');
const uploadRoutes = require('./routes/upload');
const aiRoutes = require('./routes/ai');
const businessInfoRoutes = require('./routes/businessInfo');

const app = express();
const PORT = config.port;

// Centralized API route prefix configuration
const API_ROUTE_PREFIX = config.apiRoutePrefix;

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());

// CORS configuration - Allow all origins
app.use(cors({
  origin: "*",
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (config.isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

// Health check endpoint
app.get(`/${API_ROUTE_PREFIX}/health`, (req, res) => {
  const statusCode = 200;
  res.status(statusCode).json({
    status: statusCode,
    message: 'AI Landing Page Backend Server is Live 🚀',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.environment
  });
});

// API health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: config.environment,
    services: {
      mongodb: 'connected', // You can enhance this to check actual DB connection
      figma: config.figmaAccessToken ? 'configured' : 'not configured',
      gemini: config.geminiApiKey ? 'configured' : 'not configured'
    }
  });
});

// API routes
app.use(`/${API_ROUTE_PREFIX}/auth`, authRoutes);
app.use(`/${API_ROUTE_PREFIX}/landing-pages`, landingPageRoutes);
app.use(`/${API_ROUTE_PREFIX}/upload`, uploadRoutes);
app.use(`/${API_ROUTE_PREFIX}/ai`, aiRoutes);
app.use(`/${API_ROUTE_PREFIX}/business-info`, businessInfoRoutes);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT} in ${config.environment} mode`);
  logger.info(`📊 Health check available at http://localhost:${PORT}/${API_ROUTE_PREFIX}/health`);
  console.log(`🔗 [Server] API Route Prefix: /${API_ROUTE_PREFIX}`);
  console.log('🔐 [Server] Session management system initialized');
  console.log('🔐 [Server] Iron session middleware ready');
  console.log('🔐 [Server] getAccessToken helper function available');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

module.exports = app;
