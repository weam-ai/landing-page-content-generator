/**
 * Frontend Configuration (TypeScript)
 * Loads environment variables from the global .env file at the project root
 * This file provides access to ONLY NEXT_PUBLIC_* variables for the Next.js frontend
 */

import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from the global .env file
dotenv.config({ path: path.join(__dirname, '../../../.env') });

export interface Config {
  // General Configuration
  environment: string;
  basePath: string;
  apiUrl: string;
  backendUrl: string;
  nodejsApiUrl: string;
  
  // Session Configuration
  cookieName: string;
  cookiePassword: string;
  
  // Environment Flags
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
  
  // API Endpoints
  endpoints: {
    auth: string;
    landingPages: string;
    ai: string;
    upload: string;
    businessInfo: string;
  };
  
  // Validation
  validate(): boolean;
}

const config: Config = {
  // ==============================================
  // GENERAL CONFIGURATION
  // ==============================================
  environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '/ai-landing-page-app',
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000',
  nodejsApiUrl: process.env.NODEJS_API_URL || 'http://localhost:5000',

  // ==============================================
  // SESSION CONFIGURATION
  // ==============================================
  cookieName: process.env.NEXT_PUBLIC_COOKIE_NAME || 'weam',
  cookiePassword: process.env.NEXT_PUBLIC_COOKIE_PASSWORD || 'YczgOhDJQj0RRDR3ASnvOVoQUBV0PtSz',

  // ==============================================
  // ENVIRONMENT FLAGS
  // ==============================================
  isDevelopment: process.env.NEXT_PUBLIC_ENVIRONMENT === 'development',
  isProduction: process.env.NEXT_PUBLIC_ENVIRONMENT === 'production',
  isTest: process.env.NEXT_PUBLIC_ENVIRONMENT === 'test',

  // ==============================================
  // API ENDPOINTS
  // ==============================================
  endpoints: {
    auth: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth`,
    landingPages: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/landing-pages`,
    ai: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/ai`,
    upload: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/upload`,
    businessInfo: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/business-info`,
  },

  // ==============================================
  // VALIDATION
  // ==============================================
  validate(): boolean {
    const required = [
      'NEXT_PUBLIC_ENVIRONMENT',
      'NEXT_PUBLIC_API_URL',
    ];

    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required NEXT_PUBLIC environment variables: ${missing.join(', ')}`);
    }

    // Warn about missing optional but important variables
    const warnings = [];
    if (!process.env.NEXT_PUBLIC_BACKEND_URL) warnings.push('NEXT_PUBLIC_BACKEND_URL');
    if (!process.env.NODEJS_API_URL) warnings.push('NODEJS_API_URL');
    if (!process.env.NEXT_PUBLIC_COOKIE_PASSWORD) warnings.push('NEXT_PUBLIC_COOKIE_PASSWORD');
    
    if (warnings.length > 0) {
      console.warn(`⚠️  Warning: Missing optional environment variables: ${warnings.join(', ')}`);
    }

    // Log successful configuration
    console.log('✅ Frontend Configuration loaded successfully');
    console.log(`📊 Environment: ${config.environment}`);
    console.log(`🌐 API URL: ${config.apiUrl}`);
    console.log(`🔗 Backend URL: ${config.backendUrl}`);

    return true;
  }
};

// Validate configuration on load
if (typeof window === 'undefined') { // Only validate on server side
  config.validate();
}

export default config;
