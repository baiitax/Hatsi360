import Link from 'next/link';
import { BRAND, CONTACT, PRIMARY_NAV, SECONDARY_NAV } from '@/lib/brand';
import { SignOutButton } from './SignOutButton';

/**
 * The shared navigation surfaces.
 *
 * The public site, the Field App and the Control Centre each have their own
 * shell, but they share the same identity, the same link vocabulary and the
 * same search behaviour. These components are that shared layer.
 */

/* ---------------------------------------------------------------- search bar */

/** The catalogue search. A plain GET form: no JavaScript, bookmarkable. */
export function SearchBar({
  id = 'site-search',
  className = '',
  placeholder = 'Search commodities…',
  compact = false,
}: {
  id?: string;
  className?: string;
  placeholder?: string;
  compact?: boolean;
}) {
  return (
    <form action="/prices" method="get" role="search" className={className}>
      <label htmlFor={id} className="sr-only">
        Search commodities, markets and states
      </label>
      <div className="relative w-full">
        <input
          id={id}
          type="search"
          name="q"
          placeholder={placeholder}
          className={`w-full rounded-full border border-ink-200 bg-ink-50 py-2 pl-4 pr-10 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:bg-white focus:outline-none ${
            compact ? '' : 'min-w-0'
          }`}
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
  );
}

/* ------------------------------------------------------------ main navigation */

/** The desktop navigation. The primary bar plus the informational overflow. */
export function MainNavigation({ className = '' }: { className?: string }) {
  return (
    <nav className={`items-center gap-0.5 lg:flex ${className}`} aria-label="Primary">
      {PRIMARY_NAV.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-800"
          title={link.label}
        >
          {link.short ?? link.label}
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
        <div className="invisible absolute right-0 top-full w-64 translate-y-1 rounded-xl border border-ink-200 bg-white py-2 opacity-0 shadow-lift transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
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
  );
}

/* ---------------------------------------------------------- mobile navigation */

/** The mobile navigation. A disclosure element — no JavaScript required. */
export function MobileNavigation({
  signedIn = false,
  userEmail,
  className = '',
}: {
  signedIn?: boolean;
  userEmail?: string | null;
  className?: string;
}) {
  return (
    <details className={`group relative ${className}`}>
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
          {signedIn ? (
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
                Sign in
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
        <SearchBar id="site-search-mobile" className="mt-3 md:hidden" />
        {userEmail ? (
          <p className="mt-3 truncate text-xs text-ink-500">Signed in as {userEmail}</p>
        ) : null}
        <p className="mt-3 border-t border-ink-100 pt-3 text-[0.7rem] text-ink-400">
          {BRAND.endorsement}
        </p>
      </div>
    </details>
  );
}

/* ------------------------------------------------------------------ user menu */

/** The account menu shown in the utility strip. */
export function UserMenu({
  signedIn = false,
  userEmail,
  className = '',
}: {
  signedIn?: boolean;
  userEmail?: string | null;
  className?: string;
}) {
  if (!signedIn) {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        <Link href="/login" className="font-medium text-ink-700 transition-colors hover:text-brand-700">
          Sign in
        </Link>
        <span aria-hidden="true" className="h-4 w-px bg-ink-200" />
        <Link
          href="/register"
          className="font-medium text-ink-700 transition-colors hover:text-brand-700"
        >
          Create account
        </Link>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <Link
        href="/dashboard"
        className="font-medium text-ink-700 transition-colors hover:text-brand-700"
      >
        {BRAND.surfaces.customerWorkspace}
      </Link>
      <span aria-hidden="true" className="h-4 w-px bg-ink-200" />
      <span className="max-w-[14rem] truncate text-ink-600">{userEmail}</span>
      <SignOutButton />
    </div>
  );
}

/* ------------------------------------------------------- notification centre */

/**
 * The notification centre.
 *
 * The unread count comes from the database. Nothing here invents an alert: an
 * empty inbox says so.
 */
export function NotificationCenter({
  href,
  unreadCount = 0,
  label = 'Notifications',
  className = '',
}: {
  href: string;
  unreadCount?: number;
  label?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`relative inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-100 ${className}`}
    >
      <span aria-hidden="true">✉</span>
      <span className="hidden sm:inline">{label}</span>
      {unreadCount > 0 ? (
        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-error-500 px-1.5 text-[0.65rem] font-bold text-white">
          {unreadCount > 99 ? '99+' : unreadCount}
          <span className="sr-only"> unread notifications</span>
        </span>
      ) : null}
    </Link>
  );
}

/* ------------------------------------------------------------------- contact */

/** The contact detail strip used in the footer and on the contact page. */
export function ContactSummary({ className = '' }: { className?: string }) {
  return (
    <div className={`text-sm ${className}`}>
      <p>
        <a href={CONTACT.phoneHref} className="transition-colors hover:text-brand-700">
          {CONTACT.phone}
        </a>
      </p>
      <p className="mt-1">
        <a href={CONTACT.emailHref} className="transition-colors hover:text-brand-700">
          {CONTACT.email}
        </a>
      </p>
      <p className="mt-2 text-xs leading-relaxed text-ink-500">
        {CONTACT.address.line1}
        <br />
        {CONTACT.address.city}, {CONTACT.address.country}
      </p>
    </div>
  );
}
