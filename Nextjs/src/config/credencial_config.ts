/**
 * Frontend Configuration (TypeScript)
 * Loads environment variables from the global .env file at the project root
 * Only exposes NEXT_PUBLIC_* variables for the Next.js frontend
 */

import path from 'path';
import dotenv from 'dotenv';

// Load dotenv only on server side
if (typeof window === 'undefined') {
  // Load from root .env file (one level up from Nextjs directory)
  dotenv.config({ path: path.join(process.cwd(), '..', '.env') });
}

export interface Config {
  environment: string;
  basePath: string;
  apiUrl: string;
  backendUrl: string;

  // Session
  cookieName: string;
  cookiePassword: string;

  // Flags
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

  validate(): boolean;
}

const baseApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const config: Config = {
  // General
  environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '/ai-landing-page-generator',
  apiUrl: baseApiUrl,
  backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000',

  // Session
  cookieName: process.env.NEXT_PUBLIC_COOKIE_NAME || 'weam',
  cookiePassword: process.env.NEXT_PUBLIC_COOKIE_PASSWORD || 'YczgOhDJQj0RRDR3ASnvOVoQUBV0PtSz',

  // Flags
  isDevelopment: process.env.NEXT_PUBLIC_ENVIRONMENT === 'development',
  isProduction: process.env.NEXT_PUBLIC_ENVIRONMENT === 'production',
  isTest: process.env.NEXT_PUBLIC_ENVIRONMENT === 'test',

  // Endpoints
  endpoints: {
    auth: `${baseApiUrl}/auth`,
    landingPages: `${baseApiUrl}/landing-pages`,
    ai: `${baseApiUrl}/ai`,
    upload: `${baseApiUrl}/upload`,
    businessInfo: `${baseApiUrl}/business-info`,
  },

  // Validation
  validate(): boolean {
    const requiredVars = [
      'NEXT_PUBLIC_ENVIRONMENT',
      'NEXT_PUBLIC_API_URL',
      'NEXT_PUBLIC_BACKEND_URL',
      'NEXT_PUBLIC_COOKIE_PASSWORD',
    ];

    const missing = requiredVars.filter((v) => !process.env[v]);
    if (missing.length > 0) {
      console.warn(
        `⚠️ Missing environment variables: ${missing.join(', ')}`
      );
    }

    return true;
  },
};

// Run validation only on server side
if (typeof window === 'undefined') {
  config.validate();
}

export default config;
