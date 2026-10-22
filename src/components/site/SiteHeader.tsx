import Link from 'next/link';
import Image from 'next/image';
import { getUser } from '@/lib/auth';
import { SignOutButton } from './SignOutButton';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/prices', label: 'Prices' },
  { href: '/markets', label: 'Markets' },
  { href: '/commodities', label: 'Commodities' },
  { href: '/compare', label: 'Compare' },
  { href: '/insights', label: 'Insights' },
];

const SECONDARY_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/api-docs', label: 'API Access' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/faq', label: 'FAQs' },
  { href: '/contact', label: 'Contact' },
];

export async function SiteHeader() {
  const user = await getUser();

  return (
    <header className="sticky top-0 z-50 border-b border-ink-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      {/* Top bar — mirrors the production site's utility strip. */}
      <div className="hidden border-b border-ink-100 bg-ink-50 lg:block">
        <div className="container-page flex h-11 items-center justify-between text-sm text-ink-600">
          <div className="flex items-center gap-5">
            <a
              href="tel:+2348012345678"
              className="inline-flex items-center gap-2 transition-colors hover:text-brand-700"
            >
              <span aria-hidden="true" className="text-brand-700">☎</span>
              <span className="font-medium">+234 801 234 5678</span>
            </a>
            <a
              href="mailto:info@agripricelive.com"
              className="inline-flex items-center gap-2 transition-colors hover:text-brand-700"
            >
              <span aria-hidden="true" className="text-brand-700">✉</span>
              info@agripricelive.com
            </a>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="font-medium text-ink-800 transition-colors hover:text-brand-700"
                >
                  My Dashboard
                </Link>
                <span aria-hidden="true" className="h-4 w-px bg-ink-200" />
                <span className="text-ink-700">{user.email}</span>
                <SignOutButton />
              </>
            ) : (
              <>
                <Link
                  href="/register"
                  className="font-medium text-ink-800 transition-colors hover:text-brand-700"
                >
                  Register
                </Link>
                <span aria-hidden="true" className="h-4 w-px bg-ink-200" />
                <Link
                  href="/login"
                  className="font-medium text-ink-800 transition-colors hover:text-brand-700"
                >
                  Login
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div className="container-page flex h-16 items-center gap-4 lg:h-20">
        <Link href="/" className="flex shrink-0 items-center" aria-label="Pluck Live home">
          <Image
            src="/img/logo.png"
            alt="Pluck Agro"
            width={150}
            height={56}
            priority
            className="h-9 w-auto lg:h-11"
          />
          <span className="sr-only">Pluck Live — Pluck Agro</span>
        </Link>

        {/* Desktop navigation */}
        <nav className="ml-auto hidden items-center gap-1 lg:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-800"
            >
              {link.label}
            </Link>
          ))}
          <div className="group relative">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-800 group-focus-within:bg-brand-50 group-focus-within:text-brand-800"
              aria-haspopup="true"
            >
              More
              <span aria-hidden="true" className="text-[0.6rem]">▼</span>
            </button>
            <div className="invisible absolute right-0 top-full w-48 translate-y-1 rounded-xl border border-ink-200 bg-white py-2 opacity-0 shadow-lift transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
              {SECONDARY_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block px-4 py-2 text-sm text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-800"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        {/* Search */}
        <form action="/prices" method="get" role="search" className="hidden md:block">
          <label htmlFor="site-search" className="sr-only">
            Search commodities and markets
          </label>
          <div className="relative">
            <input
              id="site-search"
              type="search"
              name="q"
              placeholder="Search commodities…"
              className="w-44 rounded-full border border-ink-200 bg-ink-50 py-2 pl-4 pr-10 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:bg-white focus:outline-none lg:w-56"
            />
            <button
              type="submit"
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-brand-700 px-2.5 py-1 text-xs text-white transition-colors hover:bg-brand-800"
            >
              <span aria-hidden="true">⌕</span>
              <span className="sr-only">Search</span>
            </button>
          </div>
        </form>

        <Link
          href="/prices"
          className="ml-auto hidden shrink-0 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 lg:ml-0 lg:inline-flex"
        >
          View Prices
        </Link>

        {/* Mobile menu — a disclosure element, no JavaScript required. */}
        <details className="group relative ml-auto lg:hidden">
          <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-ink-200 text-ink-700 transition-colors hover:bg-ink-50">
            <span className="sr-only">Open navigation menu</span>
            <span aria-hidden="true" className="text-lg leading-none">☰</span>
          </summary>
          <div className="absolute right-0 top-12 w-64 rounded-xl border border-ink-200 bg-white p-3 shadow-lift">
            <nav aria-label="Mobile" className="flex flex-col">
              {[...NAV_LINKS, ...SECONDARY_LINKS].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-800"
                >
                  {link.label}
                </Link>
              ))}
              <div className="my-2 h-px bg-ink-200" />
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-brand-800 hover:bg-brand-50"
                  >
                    My Dashboard
                  </Link>
                  <SignOutButton className="w-full justify-start" />
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-ink-700 hover:bg-brand-50"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-brand-800 hover:bg-brand-50"
                  >
                    Register
                  </Link>
                </>
              )}
            </nav>
            <form action="/prices" method="get" role="search" className="mt-3 md:hidden">
              <label htmlFor="site-search-mobile" className="sr-only">
                Search commodities and markets
              </label>
              <input
                id="site-search-mobile"
                type="search"
                name="q"
                placeholder="Search commodities…"
                className="w-full rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </form>
          </div>
        </details>
      </div>
    </header>
  );
}
