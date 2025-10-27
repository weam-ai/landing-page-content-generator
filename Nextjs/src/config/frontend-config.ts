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

export interface FrontendConfig {
  environment: string;
  basePath: string;
  apiUrl: string;
  apiRoutePrefix: string;
  cookieName: string;
  cookiePassword: string;
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
  validate(): boolean;
}

// Centralized route configuration variables
const API_ROUTE_PREFIX = process.env.NEXT_PUBLIC_API_ROUTE_PREFIX || 'page-revamp-api';
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '/page-revamp';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || `http://localhost:5000/${API_ROUTE_PREFIX}`;

const frontendConfig: FrontendConfig = {
  environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
  basePath: BASE_PATH,
  apiRoutePrefix: API_ROUTE_PREFIX,
  apiUrl: API_BASE_URL,
  cookieName: process.env.NEXT_PUBLIC_COOKIE_NAME || 'weam',
  cookiePassword: process.env.NEXT_PUBLIC_COOKIE_PASSWORD || 'YczgOhDJQj0RRDR3ASnvOVoQUBV0PtSz',
  isDevelopment: process.env.NEXT_PUBLIC_ENVIRONMENT === 'development',
  isProduction: process.env.NEXT_PUBLIC_ENVIRONMENT === 'production',
  isTest: process.env.NEXT_PUBLIC_ENVIRONMENT === 'test',

  validate(): boolean {
    const requiredVars = [
      'NEXT_PUBLIC_ENVIRONMENT',
      'NEXT_PUBLIC_API_URL',
      'NEXT_PUBLIC_COOKIE_PASSWORD',
    ];

    const missing = requiredVars.filter((v) => !process.env[v]);
    if (missing.length > 0) {
      console.warn(`⚠️ Missing environment variables: ${missing.join(', ')}`);
    }

    return true;
  },
};

// Run validation only on server side
if (typeof window === 'undefined') {
  frontendConfig.validate();
}

export default frontendConfig;
