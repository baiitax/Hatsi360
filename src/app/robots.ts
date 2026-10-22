import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/supabase/config';

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Private and internal workspaces are not for search engines.
        disallow: ['/api/', '/admin', '/agent', '/dashboard', '/login', '/register', '/reset-password'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
