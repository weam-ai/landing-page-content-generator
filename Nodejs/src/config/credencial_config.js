/**
 * Backend Configuration
 * Centralized configuration management for Node.js backend
 * Loads environment variables from the global .env file
 */

const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '../.env') });

const config = {
  // ==============================================
  // GENERAL CONFIGURATION
  // ==============================================
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,

  // ==============================================
  // DATABASE CONFIGURATION
  // ==============================================
  database: {
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/landing-page-generator',
    mongodbUriProd: process.env.MONGODB_URI_PROD || process.env.MONGODB_URI || 'mongodb://localhost:27017/landing-page-generator',
  },

  // ==============================================
  // API KEYS & EXTERNAL SERVICES
  // ==============================================
  apiKeys: {
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiApiUrl: process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models',
    figmaAccessToken: process.env.FIGMA_ACCESS_TOKEN || '',
  },

  // ==============================================
  // FILE UPLOAD CONFIGURATION
  // ==============================================
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10485760, // 10MB
  },

  // ==============================================
  // LOGGING CONFIGURATION
  // ==============================================
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  // ==============================================
  // RATE LIMITING CONFIGURATION
  // ==============================================
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100, // 100 requests per window
  },

  // ==============================================
  // JWT CONFIGURATION
  // ==============================================
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // ==============================================
  // CORS CONFIGURATION
  // ==============================================
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },

  // ==============================================
  // CONFIGURATION VALIDATION
  // ==============================================
  validate() {
    const required = ['MONGODB_URI'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Warn about missing optional variables
    const warnings = [];
    if (!this.apiKeys.geminiApiKey) warnings.push('GEMINI_API_KEY');
    if (!this.apiKeys.figmaAccessToken) warnings.push('FIGMA_ACCESS_TOKEN');
    if (this.jwt.secret === 'fallback-secret-change-in-production') warnings.push('JWT_SECRET');
    
    if (warnings.length > 0) {
      console.warn(`⚠️  Warning: Missing optional environment variables: ${warnings.join(', ')}`);
    }

    // Log configuration status
    console.log('✅ Backend Configuration loaded successfully');
    console.log(`📊 Environment: ${this.nodeEnv}`);
    console.log(`🚀 Server Port: ${this.port}`);
    console.log(`🗄️  Database: ${this.database.mongodbUri ? 'Configured' : 'Not configured'}`);
    console.log(`🤖 Gemini API: ${this.apiKeys.geminiApiKey ? 'Configured' : 'Not configured'}`);
    console.log(`🎨 Figma API: ${this.apiKeys.figmaAccessToken ? 'Configured' : 'Not configured'}`);

    return true;
  }
};

// Validate configuration on load (skip validation in test environment)
if (config.nodeEnv !== 'test') {
  try {
    config.validate();
  } catch (error) {
    console.error('❌ Configuration validation failed:', error.message);
    process.exit(1);
  }
}

module.exports = config;
