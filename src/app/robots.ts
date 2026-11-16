import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/supabase/config';
import { canonicalOrigin } from '@/lib/domains';

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Private and internal workspaces are not for search engines.
        disallow: [
          '/api/',
          '/admin',
          '/admin/',
          '/agent',
          '/agent/',
          '/client',
          '/client/',
          '/dashboard',
          '/login',
          '/register',
          '/forgot-password',
          '/reset-password',
          '/auth/',
          '/_next/',
        ],
      },
      // Allow social preview crawlers to access the social card image
      // even if it lives under a restricted path (it does not, but be explicit).
      {
        userAgent: ['Googlebot', 'facebookexternalhit', 'Twitterbot', 'LinkedInBot'],
        allow: '/brand/',
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}

/**
 * The canonical origin, surfaced for the deployment check.
 *
 * When `NEXT_PUBLIC_SITE_URL` is missing the site still serves, but the
 * canonical tags and the sitemap will point at the deployment's own URL. The
 * deployment script refuses to promote a build in that state.
 */
export function canonicalStatus() {
  return canonicalOrigin();
}
