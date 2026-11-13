import Link from 'next/link';
import { getUser } from '@/lib/auth';
import { BRAND, CONTACT } from '@/lib/brand';
import { BrandHomeLink } from '@/components/brand/Logo';
import { MainNavigation, MobileNavigation, SearchBar, UserMenu } from './navigation';

/**
 * The Hatsi360 site header.
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

          <Link
            href="/contact"
            className="hidden shrink-0 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand-800 transition-colors hover:bg-brand-100 lg:inline-flex"
          >
            Business enquiry
          </Link>

          <SearchBar className="hidden w-48 lg:block" placeholder="Search commodities…" />

          <UserMenu signedIn={Boolean(user)} userEmail={user?.email ?? null} />
        </div>
      </div>

      {/* Main bar */}
      <div className="container-page flex h-16 items-center gap-4 lg:h-20">
        <BrandHomeLink size={38} />

        <MainNavigation className="ml-2 hidden" />

        <SearchBar className="ml-auto hidden w-44 md:block lg:hidden" />

        <Link
          href="/prices"
          className="hidden shrink-0 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 xl:inline-flex"
        >
          Explore market prices
        </Link>

        <MobileNavigation signedIn={Boolean(user)} userEmail={user?.email ?? null} className="ml-auto lg:hidden" />
      </div>
    </header>
  );
}
