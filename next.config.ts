import type { NextConfig } from 'next';

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
        ],
      },
      {
        source: '/api/v1/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
    ];
  },
  async redirects() {
    // Mirror the legacy PHP URL structure so existing links and bookmarks keep working.
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
    ];
  },
};

export default nextConfig;
