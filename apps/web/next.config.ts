import type { NextConfig } from 'next';

/**
 * Hemisphere Next.js Configuration
 *
 * Configuration for the web frontend with optimizations for:
 * - Stage-aware design system
 * - Performance and Core Web Vitals
 * - Image optimization for learning content
 */

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Turbopack for faster development (Next.js 15 feature)
  experimental: {
    turbo: {
      // Enable turbopack for faster builds
    },
  },

  // Optimize fonts and images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [375, 390, 768, 1024, 1440],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Webpack configuration for custom font loading
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(woff|woff2|eot|ttf|otf)$/i,
      type: 'asset/resource',
    });
    return config;
  },

  // Enable SWC minification
  swcMinify: true,

  // Compiler options
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
