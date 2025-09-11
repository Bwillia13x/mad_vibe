import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Production hardening: enforce strict TypeScript and ESLint checking
  eslint: {
    ignoreDuringBuilds: false, // Fail build on ESLint errors
  },
  typescript: {
    ignoreBuildErrors: false, // Fail build on TypeScript errors
  },
  
  // Enable experimental features for production readiness
  experimental: {
    // Enable WebSocket support
    serverComponentsExternalPackages: ['ws'],
    // Improve build performance
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js'
        }
      }
    }
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },
  
  // Environment variable validation
  env: {
    ADMIN_TOKEN: process.env.ADMIN_TOKEN,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPERATIONS_WS_PORT: process.env.OPERATIONS_WS_PORT || '8080',
    SMOKE_MODE: process.env.SMOKE_MODE,
  },
  
  // Build optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Output configuration
  output: 'standalone',
  
  // Asset optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },
}

export default nextConfig
