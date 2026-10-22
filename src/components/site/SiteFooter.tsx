import Link from 'next/link';
import Image from 'next/image';

const COLUMNS = [
  {
    title: 'Prices',
    links: [
      { href: '/prices', label: 'Price directory' },
      { href: '/compare', label: 'Compare markets' },
      { href: '/commodities', label: 'Commodity catalogue' },
      { href: '/markets', label: 'Market directory' },
    ],
  },
  {
    title: 'Intelligence',
    links: [
      { href: '/insights', label: 'Market insights' },
      { href: '/pricing', label: 'Premium plans' },
      { href: '/dashboard', label: 'Customer workspace' },
      { href: '/api-docs', label: 'Developer API' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About Pluck Live' },
      { href: '/contact', label: 'Contact us' },
      { href: '/faq', label: 'FAQs' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/privacy', label: 'Privacy policy' },
      { href: '/terms', label: 'Terms of service' },
      { href: '/disclaimer', label: 'Price data disclaimer' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-ink-200 bg-white">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <Image
            src="/img/logo.png"
            alt="Pluck Agro"
            width={160}
            height={60}
            className="h-11 w-auto"
          />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-600">
            Pluck Live is Pluck Agro&rsquo;s agricultural commodity price system. We collect
            price observations from markets across Nigeria, verify them, and publish them
            with their provenance attached.
          </p>
          <div className="mt-5 flex flex-col gap-2 text-sm text-ink-600">
            <a href="tel:+2348012345678" className="hover:text-brand-700">
              +234 801 234 5678
            </a>
            <a href="mailto:info@agripricelive.com" className="hover:text-brand-700">
              info@agripricelive.com
            </a>
          </div>
        </div>

        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-900">
              {column.title}
            </h2>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-ink-600 transition-colors hover:text-brand-700"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-ink-200">
        <div className="container-page flex flex-col gap-3 py-6 text-sm text-ink-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} Pluck Live System. All rights reserved. Designed by
            the Pluck Agro team.
          </p>
          <p className="text-ink-400">
            Prices are observations, not guarantees. Read our{' '}
            <Link href="/disclaimer" className="underline hover:text-brand-700">
              price data disclaimer
            </Link>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
