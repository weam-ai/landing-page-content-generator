const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const config = require('./config/credencial_config');

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

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: config.nodeEnv === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000',"http://localhost:8081"],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
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
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

// Health check endpoint
app.get('/ai-landing-page-generator-api/health', (req, res) => {
  const statusCode = 200;
  res.status(statusCode).json({
    status: statusCode,
    message: 'AI Landing Page Backend Server is Live 🚀',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv
  });
});

// API health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    services: {
      mongodb: 'connected', // You can enhance this to check actual DB connection
      figma: config.apiKeys.figmaAccessToken ? 'configured' : 'not configured',
      gemini: config.apiKeys.geminiApiKey ? 'configured' : 'not configured'
    }
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/landing-pages', landingPageRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/business-info', businessInfoRoutes);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT} in ${config.nodeEnv} mode`);
  logger.info(`📊 Health check available at http://localhost:${PORT}/ai-landing-page-generator-api/health`);
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
