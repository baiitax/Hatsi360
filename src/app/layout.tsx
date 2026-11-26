import type { Metadata, Viewport } from 'next';
import { Inter, Manrope } from 'next/font/google';
import { BRAND, CONTACT } from '@/lib/brand';
import { getSiteUrl } from '@/lib/supabase/config';
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

/**
 * The official brand positioning for search engines and social sharing.
 *
 * Every user-facing title and description must resolve through these
 * strings so that a brand change never touches a single page.
 *
 * The recommended homepage SEO title and description come from the
 * brand positioning document. The OG and Twitter variants use
 * slightly different wording optimised for link previews.
 */
const BRAND_TITLE = 'Hatsi360 Markets';
const BRAND_DESCRIPTOR = 'African Agricultural Market Intelligence';
const BRAND_TAGLINE = 'Agricultural Intelligence for Better Decisions';

/**
 * The homepage meta description — kept within the typical 155-160 character
 * window that search engines display in results.
 */
const HOMEPAGE_DESCRIPTION =
  'Discover agricultural commodity prices, market intelligence, price analytics, ' +
  'commodity research and trade insights across African agricultural markets. ' +
  'Hatsi360 helps businesses, traders, producers and exporters make better-informed decisions.';

/**
 * The Open Graph description — longer, richer, aimed at link previews on
 * WhatsApp, Facebook, LinkedIn and X.
 */
const OG_HOMEPAGE_DESCRIPTION =
  'Explore African agricultural markets through commodity prices, market trends, price analytics, ' +
  'agricultural research and trade intelligence. Discover the information you need to make more ' +
  'informed agricultural business decisions.';

const SOCIAL_CARD = '/brand/hatsi360-social-preview.png';

const defaultTitle = `${BRAND_TITLE} | ${BRAND_DESCRIPTOR} & Trade`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultTitle,
    template: `%s | ${BRAND_TITLE}`,
  },
  description: HOMEPAGE_DESCRIPTION,
  applicationName: BRAND_TITLE,
  keywords: [
    'African agricultural market intelligence',
    'agricultural commodity prices Africa',
    'Nigeria commodity prices',
    'grain prices Northern Nigeria',
    'market prices Kano',
    'Dawanau market prices',
    'maize prices Nigeria',
    'sorghum market prices',
    'rice prices Nigeria',
    'sesame prices Nigeria',
    'agricultural price comparison',
    'Nigeria commodity market reports',
    'agricultural trade intelligence',
    'commodity price analytics',
    'Hatsi360 Markets',
    'Hatsi360',
  ],
  authors: [{ name: BRAND_TITLE }],
  creator: BRAND_TITLE,
  publisher: BRAND_TITLE,
  category: BRAND_DESCRIPTOR,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: BRAND_TITLE,
    locale: BRAND.locale,
    url: siteUrl,
    title: `${BRAND_TITLE} — ${BRAND_TAGLINE}`,
    description: OG_HOMEPAGE_DESCRIPTION,
    images: [
      {
        url: SOCIAL_CARD,
        width: 1200,
        height: 630,
        alt: `${BRAND_TITLE} — ${BRAND_DESCRIPTOR}. ${BRAND_TAGLINE}`,
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Hatsi360',
    title: `${BRAND_TITLE} — ${BRAND_TAGLINE}`,
    description: OG_HOMEPAGE_DESCRIPTION,
    images: [
      {
        url: SOCIAL_CARD,
        alt: `${BRAND_TITLE} — ${BRAND_DESCRIPTOR}. ${BRAND_TAGLINE}`,
      },
    ],
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
  // The boot script stamps `data-hatsi-boot` on <html> before the first paint —
  // that is what makes the curtain work without waiting for JavaScript. The
  // attribute is therefore already present when React hydrates, so the
  // difference from the server's markup is expected, not a defect.
  return (
    <html
      lang={BRAND.locale}
      className={`${inter.variable} ${manrope.variable}`}
      suppressHydrationWarning
    >
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
