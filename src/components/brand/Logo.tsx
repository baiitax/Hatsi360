import Link from 'next/link';
import { BRAND } from '@/lib/brand';

/**
 * The GonaPulse logo.
 *
 * The mark is inline SVG rather than an <img> so that it inherits
 * `currentColor`, needs no network request, and stays crisp on every screen.
 * The raster files in `public/brand/` are generated from the same geometry by
 * `scripts/brand_icons.py` and are used for the favicon, the installable app
 * icon and the social avatar.
 *
 * The wordmark is real text in the site's own type, so it is searchable,
 * selectable, translatable and accessible. The SVG files in `public/brand/`
 * carry the same wordmark for use outside the application (documents,
 * presentations, watermarks).
 */

export function BrandMark({
  size = 40,
  className = '',
  title = BRAND.name,
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={className}
    >
      <defs>
        <linearGradient id="gpDeep" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#17512f" />
          <stop offset="1" stopColor="#0d2c1b" />
        </linearGradient>
        <linearGradient id="gpLeaf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4fc98c" />
          <stop offset="1" stopColor="#2a8a4e" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#gpDeep)" />
      <path d="M32 11c11 9.5 12.5 23 0 42C19.5 34 21 20.5 32 11Z" fill="url(#gpLeaf)" />
      <path
        d="M11 34h9.5l3-11 4.5 19 4-8H53"
        fill="none"
        stroke="#e8a33d"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export type BrandLogoVariant = 'full' | 'mark' | 'wordmark';

export function BrandLogo({
  variant = 'full',
  size = 40,
  className = '',
  showDescriptor = false,
}: {
  variant?: BrandLogoVariant;
  size?: number;
  className?: string;
  /** Show the category line under the wordmark. Off in tight spaces. */
  showDescriptor?: boolean;
}) {
  if (variant === 'mark') {
    return <BrandMark size={size} className={className} />;
  }

  if (variant === 'wordmark') {
    return (
      <span className={`font-display text-2xl font-bold tracking-tight text-ink-950 ${className}`}>
        {BRAND.name}
      </span>
    );
  }

  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <BrandMark size={size} />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.35rem] font-bold tracking-tight text-ink-950">
          {BRAND.name}
        </span>
        {showDescriptor ? (
          <span className="mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-ink-500">
            {BRAND.descriptor}
          </span>
        ) : null}
      </span>
    </span>
  );
}

/** The logo as a home link. The accessible name is the product name. */
export function BrandHomeLink({
  size = 40,
  showDescriptor = false,
  className = '',
}: {
  size?: number;
  showDescriptor?: boolean;
  className?: string;
}) {
  return (
    <Link href="/" className={`flex shrink-0 items-center ${className}`} aria-label={`${BRAND.name} home`}>
      <BrandLogo size={size} showDescriptor={showDescriptor} />
      <span className="sr-only">
        {BRAND.name} — {BRAND.descriptor}. {BRAND.endorsement}.
      </span>
    </Link>
  );
}
