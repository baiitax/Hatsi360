import Image from 'next/image';
import Link from 'next/link';
import { BRAND } from '@/lib/brand';

/**
 * The Hatsi360 logo.
 *
 * The artwork is the artwork its owner supplied: `/home/user/uploads/HATSI360
 * Logo.png` and `/home/user/uploads/Hatsi360 Favicon.png`. It is never
 * redrawn here, and nothing in the application may replace it with a
 * generated stand-in.
 *
 * `scripts/brand_assets.py` derives every file in `public/brand/` from those
 * two files: the full-colour lockup and mark, a reversed pair for dark
 * surfaces, monochrome pairs for single-ink use, the favicon and installable
 * app icons, and the social card.
 *
 * The mark carries the meaning of the product — a market signal turning into
 * growth, a golden arc that completes the circle, and the field below it. It
 * is kept as a real image so that the mark the site shows is pixel-for-pixel
 * the mark its owner drew.
 */

/** The artwork files, as they are served from `public/brand/`. */
export const BRAND_ARTWORK = {
  /** The full lockup — mark, name, category line and endorsement. */
  horizontal: '/brand/hatsi360-logo-horizontal.png',
  /** The full lockup reversed for dark surfaces. */
  horizontalLight: '/brand/hatsi360-logo-horizontal-light.png',
  /** The full lockup in a single ink, for light surfaces. */
  horizontalMono: '/brand/hatsi360-logo-horizontal-mono.png',
  /** The full lockup in a single light ink, for dark surfaces. */
  horizontalMonoLight: '/brand/hatsi360-logo-horizontal-mono-light.png',
  /** The mark and the name, for a header. */
  compact: '/brand/hatsi360-lockup-compact.png',
  /** The mark and the name, reversed for dark surfaces. */
  compactLight: '/brand/hatsi360-lockup-compact-light.png',
  /** The mark and the name in a single ink, for light surfaces. */
  compactMono: '/brand/hatsi360-lockup-compact-mono.png',
  /** The mark on its own, for light surfaces. */
  mark: '/brand/hatsi360-mark.png',
  /** The mark reversed for dark surfaces. */
  markLight: '/brand/hatsi360-mark-light.png',
  /** The mark in a single ink, for light surfaces. */
  markMono: '/brand/hatsi360-mark-mono.png',
  /** The mark in a single light ink, for dark surfaces. */
  markMonoLight: '/brand/hatsi360-mark-mono-light.png',
  /** The social card. */
  social: '/brand/hatsi360-social-1200x630.png',
} as const;

/**
 * The intrinsic proportions of the artwork, so nothing is ever squashed.
 *
 * The mark is very slightly taller than it is wide, and the compact lockup
 * is a wide band, so both are sized from their height and their width
 * follows.
 */
const COMPACT_RATIO = 415 / 1971;
const MARK_RATIO = 1024 / 997;
const HORIZONTAL_RATIO = 724 / 2016;

export function BrandMark({
  size = 40,
  className = '',
  title = BRAND.name,
  tone = 'light',
  priority = false,
}: {
  size?: number;
  className?: string;
  title?: string;
  /** `dark` is for dark surfaces, where the green body is reversed to white. */
  tone?: 'light' | 'dark';
  /** Set when the mark is among the largest content on the page. */
  priority?: boolean;
}) {
  const source = tone === 'dark' ? BRAND_ARTWORK.markLight : BRAND_ARTWORK.mark;
  return (
    <Image
      src={source}
      alt={title}
      width={size}
      height={Math.round(size * MARK_RATIO)}
      className={`shrink-0 ${className}`}
      priority={priority}
      sizes={`${size}px`}
    />
  );
}

export type BrandLogoVariant = 'full' | 'mark' | 'wordmark';

export function BrandLogo({
  variant = 'full',
  size = 40,
  className = '',
  showDescriptor = false,
  tone = 'light',
  priority = false,
}: {
  variant?: BrandLogoVariant;
  size?: number;
  className?: string;
  /** Show the category line under the wordmark. Off in tight spaces. */
  showDescriptor?: boolean;
  /** `dark` renders the lockup reversed, for dark surfaces. */
  tone?: 'light' | 'dark';
  priority?: boolean;
}) {
  if (variant === 'mark') {
    return <BrandMark size={size} className={className} tone={tone} priority={priority} />;
  }

  const wordmarkColour = tone === 'dark' ? 'text-white' : 'text-ink-950';
  const descriptorColour = tone === 'dark' ? 'text-brand-100' : 'text-ink-500';

  if (variant === 'wordmark') {
    return (
      <span className={`font-display text-2xl font-bold tracking-tight ${wordmarkColour} ${className}`}>
        {BRAND.name}
      </span>
    );
  }

  // The header lockup: the mark and the name, sized from its height so the
  // artwork keeps its own proportions.
  const height = size;
  const width = Math.round(height / COMPACT_RATIO);
  const source = tone === 'dark' ? BRAND_ARTWORK.compactLight : BRAND_ARTWORK.compact;

  return (
    <span className={`flex flex-col items-start ${className}`}>
      <Image
        src={source}
        alt={`${BRAND.name} — ${BRAND.descriptor}`}
        width={width}
        height={height}
        className="h-auto w-auto"
        priority={priority}
        sizes={`${width}px`}
      />
      {showDescriptor ? (
        <span
          className={`mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] ${descriptorColour}`}
        >
          {BRAND.descriptor}
        </span>
      ) : null}
    </span>
  );
}

/**
 * The full lockup as one image.
 *
 * The supplied artwork already carries the mark, the name, the category line
 * and the endorsement, so the lockup is used whole rather than rebuilt from
 * parts. It belongs where the whole identity should be read at once — the
 * footer, the access portal and the social card.
 */
export function BrandLockup({
  className = '',
  tone = 'light',
  width = 280,
  priority = false,
}: {
  className?: string;
  tone?: 'light' | 'dark';
  width?: number;
  priority?: boolean;
}) {
  const source =
    tone === 'dark' ? BRAND_ARTWORK.horizontalLight : BRAND_ARTWORK.horizontal;
  return (
    <Image
      src={source}
      alt={`${BRAND.name} — ${BRAND.descriptor}. ${BRAND.endorsement}.`}
      width={width}
      height={Math.round(width * HORIZONTAL_RATIO)}
      className={`h-auto w-auto ${className}`}
      priority={priority}
      sizes={`(min-width: 1024px) ${width}px, ${Math.round(width * 0.8)}px`}
    />
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
    <Link
      href="/"
      className={`flex shrink-0 items-center ${className}`}
      aria-label={`${BRAND.name} home`}
    >
      <BrandLogo size={size} showDescriptor={showDescriptor} priority />
      <span className="sr-only">
        {BRAND.name} — {BRAND.descriptor}. {BRAND.endorsement}.
      </span>
    </Link>
  );
}
