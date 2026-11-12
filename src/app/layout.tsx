import type { Metadata, Viewport } from 'next';
import { Inter, Sora } from 'next/font/google';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { BRAND, CONTACT } from '@/lib/brand';
import { getSiteUrl } from '@/lib/supabase/config';
import './globals.css';

/**
 * Two families, both self-hosted by next/font at build time — no third-party
 * font request reaches a field agent's phone.
 *
 *  - Inter carries the interface and the numbers. Its tabular figures keep
 *    price columns aligned.
 *  - Sora carries the display voice: a geometric, confident face that reads
 *    as an intelligence product rather than a trading desk.
 */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sora',
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
  description:
    'Verified agricultural commodity prices collected in the field across Northern Nigeria. Search prices for grains, pulses, tubers and cash crops, compare markets, and see the collection, verification and publication time behind every figure.',
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
  ],
  authors: [{ name: 'Pluck Agro' }],
  creator: 'Pluck Agro',
  publisher: 'Pluck Agro',
  category: 'Agricultural Market Intelligence',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: BRAND.name,
    locale: BRAND.locale,
    url: siteUrl,
    title: `${defaultTitle} in ${BRAND.operatingMarket}`,
    description:
      'Verified agricultural commodity prices collected in the field across Northern Nigeria, with the provenance behind every figure.',
    images: [{ url: '/brand/gonapulse-icon-512.png', width: 512, height: 512, alt: BRAND.name }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${defaultTitle} in ${BRAND.operatingMarket}`,
    description:
      'Verified agricultural commodity prices collected in the field across Northern Nigeria.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/brand/gonapulse-favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/brand/gonapulse-apple-touch-icon.png', sizes: '180x180' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0d2c1b',
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={BRAND.locale} className={`${inter.variable} ${sora.variable}`}>
      <body className="flex min-h-screen flex-col antialiased">
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
