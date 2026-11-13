import type { MetadataRoute } from 'next';
import { BRAND } from '@/lib/brand';

/**
 * The installable web application manifest.
 *
 * The icons are the owner's supplied artwork, served from `public/brand/`.
 * The application is not a native application and does not pretend to be
 * one; the manifest exists so that a browser can install the platform and
 * open it with the right mark and the right colours.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.name} — ${BRAND.descriptor}`,
    short_name: BRAND.name,
    description:
      'Agricultural commodity prices, market comparison and verified market intelligence.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#F7F8F5',
    theme_color: '#123B2A',
    categories: ['business', 'productivity', 'news'],
    icons: [
      {
        src: '/brand/hatsi360-favicon-32.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/brand/hatsi360-icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/brand/hatsi360-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
