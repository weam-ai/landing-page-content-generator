const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from root .env file
dotenv.config({ path: path.join(__dirname, '..', '.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Router is now stable and enabled by default in Next.js 14+
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '/ai-landing-page-generator',
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '/ai-landing-page-generator',
  // Ensure trailing slash is handled properly
  trailingSlash: false,
  // Enable standalone output for Docker optimization
  output: 'standalone',
  // Enable experimental features if needed
  experimental: {
    // Add any experimental features here
  },
}

module.exports = nextConfig
