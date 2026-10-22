import type { Metadata, Viewport } from 'next';
import { Inter, Roboto } from 'next/font/google';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { getSiteUrl } from '@/lib/supabase/config';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-roboto',
  display: 'swap',
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Pluck Live — Agricultural Commodity Prices in Nigeria',
    template: '%s | Pluck Live',
  },
  description:
    'Verified agricultural commodity price observations from markets across Nigeria. Search prices for grains, pulses, tubers and cash crops, compare markets, and see the collection and verification time behind every figure.',
  applicationName: 'Pluck Live',
  keywords: [
    'agricultural prices',
    'commodity prices Nigeria',
    'grain prices',
    'market prices Kano',
    'Dawanau market prices',
    'farmer price information',
  ],
  authors: [{ name: 'Pluck Agro' }],
  creator: 'Pluck Agro',
  publisher: 'Pluck Agro',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'Pluck Live',
    locale: 'en_NG',
    url: siteUrl,
    title: 'Pluck Live — Agricultural Commodity Prices in Nigeria',
    description:
      'Timestamped, verified commodity price observations from markets across Nigeria.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pluck Live — Agricultural Commodity Prices in Nigeria',
    description:
      'Timestamped, verified commodity price observations from markets across Nigeria.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#243C18',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG" className={`${inter.variable} ${roboto.variable}`}>
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
