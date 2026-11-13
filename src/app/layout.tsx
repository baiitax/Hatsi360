import type { Metadata, Viewport } from 'next';
import { Inter, Manrope } from 'next/font/google';
import { BRAND, CONTACT } from '@/lib/brand';
import { getSiteUrl } from '@/lib/supabase/config';
import { PLATFORM_DESCRIPTION } from '@/lib/metadata';
import { HatsiGlobalPreloader } from '@/components/loading/HatsiGlobalPreloader';
import { HatsiBootSignal } from '@/components/loading/HatsiBootSignal';
import { HatsiLoadingIndicator } from '@/components/loading/HatsiLoadingIndicator';
import { HatsiLoadingProvider } from '@/components/loading/HatsiLoadingProvider';
import './globals.css';

/**
 * Two families, both self-hosted by next/font at build time — no third-party
 * font request reaches a field agent's phone.
 *
 *  - Inter carries the interface and the numbers. Its tabular figures keep
 *    price columns aligned.
 *  - Manrope carries the editorial voice: a humanist sans with wide apertures
 *    that reads as an intelligence publication rather than a trading desk.
 */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
});

const siteUrl = getSiteUrl();

const defaultTitle = `${BRAND.name} — ${BRAND.descriptor}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${defaultTitle} in ${BRAND.operatingMarket}`,
    template: `%s | ${BRAND.name}`,
  },
  description: PLATFORM_DESCRIPTION,
  applicationName: BRAND.name,
  keywords: [
    'agricultural commodity prices Nigeria',
    'grain prices Northern Nigeria',
    'market prices Kano',
    'Dawanau market prices',
    'maize prices Nigeria',
    'sorghum market prices',
    'rice prices Nigeria',
    'sesame prices Nigeria',
    'agricultural price comparison',
    'Nigeria commodity market reports',
    'farmer price information',
    'agricultural market intelligence',
    'Hatsi360',
  ],
  authors: [{ name: 'Pluck Agro' }],
  creator: 'Pluck Agro',
  publisher: 'Pluck Agro',
  category: BRAND.category,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: BRAND.name,
    locale: BRAND.locale,
    url: siteUrl,
    title: `${BRAND.name} | Agricultural Commodity Prices & Market Intelligence`,
    description: PLATFORM_DESCRIPTION,
    images: [
      {
        url: '/brand/hatsi360-social-1200x630.png',
        width: 1200,
        height: 630,
        alt: `${BRAND.name} — ${BRAND.descriptor}`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${BRAND.name} | Agricultural Commodity Prices & Market Intelligence`,
    description: PLATFORM_DESCRIPTION,
    images: ['/brand/hatsi360-social-1200x630.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/brand/hatsi360-favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/hatsi360-favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/brand/hatsi360-icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/brand/hatsi360-apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#123B2A',
  colorScheme: 'light',
};

/**
 * The root layout.
 *
 * It carries only what every surface shares: the document, the fonts, the
 * skip link, the metadata and the loading shell. The chrome belongs to the
 * surface — the public platform has the site header and footer, the access
 * portal has its own frame, and the Control Centre and the Field App have
 * their own shells.
 *
 * It stays a **server component**. The preloader is server-rendered markup
 * with one small inline script; the only client components are the readiness
 * signal and the route progress indicator, and both are leaves — turning the
 * layout itself into a client component would send the whole document to the
 * browser for no reason.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={BRAND.locale} className={`${inter.variable} ${manrope.variable}`}>
      <body className="flex min-h-screen flex-col antialiased">
        <a href="#main" className="skip-link">
          Skip to main content
        </a>

        {/* The application-level preloader for the first startup. */}
        <HatsiGlobalPreloader />
        {/* Tells the preloader the application has hydrated and painted. */}
        <HatsiBootSignal />
        {/* The route-level progress indicator. */}
        <HatsiLoadingProvider>
          <HatsiLoadingIndicator />
          {children}
        </HatsiLoadingProvider>
      </body>
    </html>
  );
}

/** Exported for the contact page and the footer. */
export const CONTACT_DETAILS = CONTACT;
