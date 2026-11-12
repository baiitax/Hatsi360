import Link from 'next/link';
import { getUser } from '@/lib/auth';
import { BRAND, CONTACT, PRIMARY_NAV, SECONDARY_NAV } from '@/lib/brand';
import { BrandHomeLink } from '@/components/brand/Logo';
import { SignOutButton } from './SignOutButton';

/**
 * The GonaPulse site header.
 *
 * One navigation for the whole product: prices, commodities, markets,
 * comparisons, insights, reports and the platform itself. The "More" menu
 * carries the informational and commercial pages so the primary bar stays
 * short enough to read at a glance.
 */
export async function SiteHeader() {
  const user = await getUser();

  return (
    <header className="sticky top-0 z-50 border-b border-ink-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      {/* Utility strip */}
      <div className="hidden border-b border-ink-100 bg-ink-50 lg:block">
        <div className="container-page flex h-10 items-center justify-between text-xs text-ink-600">
          <div className="flex items-center gap-5">
            <a
              href={CONTACT.phoneHref}
              className="inline-flex items-center gap-1.5 transition-colors hover:text-brand-700"
            >
              <span aria-hidden="true" className="text-brand-600">
                &#9742;
              </span>
              <span className="font-medium">{CONTACT.phone}</span>
            </a>
            <a
              href={CONTACT.emailHref}
              className="inline-flex items-center gap-1.5 transition-colors hover:text-brand-700"
            >
              <span aria-hidden="true" className="text-brand-600">
                &#9993;
              </span>
              {CONTACT.email}
            </a>
            <span className="hidden items-center gap-1.5 text-ink-500 md:inline-flex">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-leaf-500" />
              {BRAND.endorsement}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="font-medium text-ink-700 transition-colors hover:text-brand-700"
                >
                  {BRAND.surfaces.customerWorkspace}
                </Link>
                <span aria-hidden="true" className="h-4 w-px bg-ink-200" />
                <span className="text-ink-600">{user.email}</span>
                <SignOutButton />
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="font-medium text-ink-700 transition-colors hover:text-brand-700"
                >
                  Login
                </Link>
                <span aria-hidden="true" className="h-4 w-px bg-ink-200" />
                <Link
                  href="/register"
                  className="font-medium text-ink-700 transition-colors hover:text-brand-700"
                >
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div className="container-page flex h-16 items-center gap-4 lg:h-20">
        <BrandHomeLink size={38} />

        {/* Desktop navigation */}
        <nav className="ml-2 hidden items-center gap-0.5 lg:flex" aria-label="Primary">
          {PRIMARY_NAV.map((link) => (
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
              <span aria-hidden="true" className="text-[0.6rem]">
                &#9662;
              </span>
            </button>
            <div className="invisible absolute right-0 top-full w-60 translate-y-1 rounded-xl border border-ink-200 bg-white py-2 opacity-0 shadow-lift transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
              {SECONDARY_NAV.map((link) => (
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
        <form action="/prices" method="get" role="search" className="ml-auto hidden md:block">
          <label htmlFor="site-search" className="sr-only">
            Search commodities and markets
          </label>
          <div className="relative">
            <input
              id="site-search"
              type="search"
              name="q"
              placeholder="Search commodities&hellip;"
              className="w-44 rounded-full border border-ink-200 bg-ink-50 py-2 pl-4 pr-10 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:bg-white focus:outline-none lg:w-56"
            />
            <button
              type="submit"
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-brand-700 px-2.5 py-1 text-xs text-white transition-colors hover:bg-brand-800"
            >
              <span aria-hidden="true">&#8981;</span>
              <span className="sr-only">Search</span>
            </button>
          </div>
        </form>

        <Link
          href="/contact"
          className="hidden shrink-0 rounded-full border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-800 transition-colors hover:bg-brand-100 lg:inline-flex"
        >
          Business enquiry
        </Link>

        <Link
          href="/prices"
          className="hidden shrink-0 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 lg:inline-flex"
        >
          View prices
        </Link>

        {/* Mobile menu — a disclosure element, no JavaScript required. */}
        <details className="group relative ml-auto lg:hidden">
          <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-ink-200 text-ink-700 transition-colors hover:bg-ink-50">
            <span className="sr-only">Open navigation menu</span>
            <span aria-hidden="true" className="text-lg leading-none">
              &#9776;
            </span>
          </summary>
          <div className="absolute right-0 top-12 max-h-[75vh] w-72 overflow-y-auto rounded-xl border border-ink-200 bg-white p-3 shadow-lift">
            <nav aria-label="Mobile" className="flex flex-col">
              {[...PRIMARY_NAV, ...SECONDARY_NAV].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-800"
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
                    {BRAND.surfaces.customerWorkspace}
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
                    Create account
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
                placeholder="Search commodities&hellip;"
                className="w-full rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </form>
            <p className="mt-3 border-t border-ink-100 pt-3 text-[0.7rem] text-ink-400">
              {BRAND.endorsement}
            </p>
          </div>
        </details>
      </div>
    </header>
  );
}
