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
    // PRIORITY 1: Use MONGODB_URI if present (highest priority)
    // PRIORITY 2: Build from individual DB_* environment variables
    // PRIORITY 3: Use fallback default URI
    mongodbUri: (() => {
      // FIRST PRIORITY: Direct MONGODB_URI
      if (process.env.MONGODB_URI) {
        console.log('🔗 Using MONGODB_URI (Priority 1)');
        return process.env.MONGODB_URI;
      }
      
      // SECOND PRIORITY: Build from individual components
      console.log('🔧 Building MongoDB URI from individual components (Priority 2)');
      const connection = process.env.DB_CONNECTION || 'mongodb';
      const host = process.env.DB_HOST || 'localhost:27017';
      const database = process.env.DB_DATABASE || 'landing-page-generator';
      const username = process.env.DB_USERNAME;
      const password = process.env.DB_PASSWORD;
      
      if (username && password) {
        return `${connection}://${username}:${password}@${host}/${database}`;
      } else {
        return `${connection}://${host}/${database}`;
      }
    })(),
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
    secret: 'fallback-secret-change-in-production',
    expiresIn: '7d',
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
    // No required environment variables since we have fallbacks for all critical configs
    const required = [];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Warn about missing optional variables
    const warnings = [];
    if (!this.apiKeys.geminiApiKey) warnings.push('GEMINI_API_KEY');
    if (!this.apiKeys.figmaAccessToken) warnings.push('FIGMA_ACCESS_TOKEN');
    if (this.jwt.secret === 'fallback-secret-change-in-production');
    
    if (warnings.length > 0) {
      console.warn(`⚠️  Warning: Missing optional environment variables: ${warnings.join(', ')}`);
    }

    // Log configuration status
    console.log('✅ Backend Configuration loaded successfully');
    console.log(`📊 Environment: ${this.nodeEnv}`);
    console.log(`🚀 Server Port: ${this.port}`);
    console.log(`🗄️  Database: ${this.database.mongodbUri ? 'Configured' : 'Not configured'}`);
    if (this.database.mongodbUri) {
      // Mask password in URI for security
      const maskedUri = this.database.mongodbUri.replace(/:([^:@]+)@/, ':***@');
      console.log(`🔗 MongoDB URI: ${maskedUri}`);
      
      // Show which method was used to generate the URI
      if (process.env.MONGODB_URI) {
        console.log('📋 URI Source: Direct MONGODB_URI environment variable');
      } else {
        console.log('📋 URI Source: Built from individual DB_* environment variables');
      }
    }
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
