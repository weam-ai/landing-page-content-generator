const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from root .env file
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Centralized route configuration
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || 'page-revamp';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Router is now stable and enabled by default in Next.js 14+
  basePath: `/${BASE_PATH}`,
  assetPrefix: `/${BASE_PATH}`,
  // Ensure trailing slash is handled properly
  trailingSlash: false,
  // Enable experimental features if needed
  experimental: {
    // Add any experimental features here
  },
}

module.exports = nextConfig
