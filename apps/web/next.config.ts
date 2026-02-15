import type { NextConfig } from 'next';

/**
 * Hemisphere Next.js Configuration
 *
 * Configuration for the web frontend with optimizations for:
 * - Stage-aware design system
 * - Performance and Core Web Vitals
 * - Image optimization for learning content
 * - Security headers
 */

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Compress responses for faster delivery
  compress: true,

  // Enable experimental features for better performance
  experimental: {
    // Tree-shake framer-motion and other heavy packages to reduce bundle size
    optimizePackageImports: ['framer-motion'],
  },

  // Optimize fonts and images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [375, 390, 768, 1024, 1440],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Increase cache TTL to reduce re-optimization
    minimumCacheTTL: 60,
  },

  // Compiler options
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Webpack configuration for custom font loading
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(woff|woff2|eot|ttf|otf)$/i,
      type: 'asset/resource',
    });
    return config;
  },

  // Security and performance headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent embedding in iframes (clickjacking protection)
          { key: 'X-Frame-Options', value: 'DENY' },
          // Prevent MIME type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Control referrer information
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Enable DNS prefetch
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          // Restrict browser feature access
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        // Service worker must never be cached by the browser
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};

export default nextConfig;
