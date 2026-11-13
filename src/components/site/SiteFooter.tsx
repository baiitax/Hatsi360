import Link from 'next/link';
import { BRAND, CONTACT, LEGAL_NAV } from '@/lib/brand';
import { BrandLockup } from '@/components/brand/Logo';

const COLUMNS = [
  {
    title: 'Market data',
    links: [
      { href: '/prices', label: 'Price directory' },
      { href: '/compare', label: 'Compare markets' },
      { href: '/commodities', label: 'Commodity catalogue' },
      { href: '/markets', label: 'Market directory' },
      { href: '/coverage', label: 'Collection coverage' },
    ],
  },
  {
    title: 'Intelligence',
    links: [
      { href: '/insights', label: 'Market insights' },
      { href: '/reports', label: 'Published reports' },
      { href: '/methodology', label: 'Price methodology' },
      { href: '/pricing', label: 'Intelligence plans' },
      { href: '/api-docs', label: 'Developer API' },
    ],
  },
  {
    title: 'Platform',
    links: [
      { href: '/about', label: 'About Hatsi360' },
      { href: '/dashboard', label: 'Customer workspace' },
      { href: '/contact', label: 'Business enquiries' },
      { href: '/faq', label: 'FAQs' },
    ],
  },
];

/**
 * The Hatsi360 footer.
 *
 * The corporate endorsement appears here, subordinate to the product brand,
 * exactly as the brand architecture requires. Social links are omitted
 * deliberately: no social account has been verified, and an unverified link is
 * a broken promise.
 */
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-ink-200 bg-white">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <BrandLockup width={300} />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-600">
            {BRAND.name} collects, verifies and publishes agricultural commodity prices from
            the markets of {BRAND.operatingMarket}. Every published figure carries the market,
            the unit, the collection time and the verification behind it.
          </p>
          <div className="mt-5 flex flex-col gap-2 text-sm text-ink-600">
            <a href={CONTACT.phoneHref} className="hover:text-brand-700">
              {CONTACT.phone}
            </a>
            <a href={CONTACT.emailHref} className="hover:text-brand-700">
              {CONTACT.email}
            </a>
            <p className="text-ink-500">
              {CONTACT.address.line1}
              <br />
              {CONTACT.address.city}, {CONTACT.address.country}
            </p>
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
            &copy; {new Date().getFullYear()} {BRAND.name}. {BRAND.endorsement}. All rights
            reserved.
          </p>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-4 gap-y-1">
            {LEGAL_NAV.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-ink-500 transition-colors hover:text-brand-700"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="border-t border-ink-100">
          <div className="container-page py-4 text-xs text-ink-400">
            {BRAND.ownershipStatement} Prices are observations, not guarantees — read our{' '}
            <Link href="/disclaimer" className="underline hover:text-brand-700">
              price data disclaimer
            </Link>
            .
          </div>
        </div>
      </div>
    </footer>
  );
}
