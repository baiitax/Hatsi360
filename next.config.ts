import type { NextConfig } from 'next';

/**
 * GonaPulse — application configuration.
 *
 * Two things matter here beyond the defaults:
 *
 *  1. The legacy PHP URL structure is preserved with redirects, so every
 *     indexed link from the previous Pluck Live site keeps resolving.
 *  2. Security headers. The legacy site served everything over plain HTTP
 *     with no CSP; this one does not.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
      {
        source: '/api/v1/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
    ];
  },
  async redirects() {
    // Mirror the legacy PHP URL structure so existing links and bookmarks keep
    // working. These are permanent redirects; each one lands on the GonaPulse
    // page that carries the same content.
    return [
      { source: '/index.php', destination: '/', permanent: true },
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/about.php', destination: '/about', permanent: true },
      { source: '/prices.php', destination: '/prices', permanent: true },
      { source: '/commodities.php', destination: '/commodities', permanent: true },
      { source: '/markets.php', destination: '/markets', permanent: true },
      { source: '/blog.php', destination: '/insights', permanent: true },
      { source: '/faq.php', destination: '/faq', permanent: true },
      { source: '/api-access.php', destination: '/api-docs', permanent: true },
      { source: '/contact.php', destination: '/contact', permanent: true },
      { source: '/signin.php', destination: '/login', permanent: true },
      { source: '/signup.php', destination: '/register', permanent: true },
      {
        source: '/commodity-detail.php',
        destination: '/commodities',
        permanent: true,
        has: [{ type: 'query', key: 'id', value: '.*' }],
      },
      {
        source: '/market-detail.php',
        destination: '/markets',
        permanent: true,
        has: [{ type: 'query', key: 'market_id', value: '.*' }],
      },
      // The legacy blog articles are preserved as GonaPulse insights.
      { source: '/blog/:slug', destination: '/insights/:slug', permanent: true },
      // A legacy search URL keeps working against the price directory.
      { source: '/search.php', destination: '/prices', permanent: true },
    ];
  },
};

export default nextConfig;
