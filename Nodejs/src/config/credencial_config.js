/**
 * Backend Configuration
 * Loads environment variables from the global .env file at the project root
 * This file provides access to ALL environment variables for the Node.js backend
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

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
    connection: process.env.DB_CONNECTION || 'mongodb',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_DATABASE || 'landing-page-generator',
    username: process.env.DB_USERNAME || '',
    port: process.env.DB_PORT || '27017',
    password: process.env.DB_PASSWORD || '',
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
  // FILE UPLOAD
  // ==============================================
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10485760, // 10MB
  },

  // ==============================================
  // LOGGING
  // ==============================================
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  // ==============================================
  // VALIDATION
  // ==============================================
  validate() {
    const required = [
      'MONGODB_URI',
    ];

    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Warn about missing optional but important variables
    const warnings = [];
    if (!config.apiKeys.geminiApiKey) warnings.push('GEMINI_API_KEY');
    if (!config.apiKeys.figmaAccessToken) warnings.push('FIGMA_ACCESS_TOKEN');
    
    if (warnings.length > 0) {
      console.warn(`⚠️  Warning: Missing optional environment variables: ${warnings.join(', ')}`);
    }

    // Log successful configuration
    console.log('✅ Configuration loaded successfully');
    console.log(`📊 Environment: ${config.nodeEnv}`);
    console.log(`🚀 Server Port: ${config.port}`);
    console.log(`🗄️  Database: ${config.database.mongodbUri ? 'Connected' : 'Not configured'}`);
    console.log(`🤖 Gemini API: ${config.apiKeys.geminiApiKey ? 'Configured' : 'Not configured'}`);
    console.log(`🎨 Figma API: ${config.apiKeys.figmaAccessToken ? 'Configured' : 'Not configured'}`);

    return true;
  }
};

// Validate configuration on load
if (config.nodeEnv !== 'test') {
  config.validate();
}

module.exports = config;
