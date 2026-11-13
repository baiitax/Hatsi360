import type { Metadata } from 'next';
import { BRAND } from './brand';
import { getSiteUrl } from './supabase/config';

/**
 * Shareable metadata.
 *
 * A shared link is often the only thing anyone sees of a page before deciding
 * whether to open it. Every public route therefore builds its Open Graph and
 * Twitter tags through here, so that:
 *
 *   - the canonical URL is always absolute and always correct;
 *   - the title, description and image always agree with each other;
 *   - the corporate endorsement travels with the card rather than being
 *     remembered by whoever writes the page;
 *   - nothing is indexed that should not be.
 *
 * The rules that make a link legible before it is opened:
 *
 *   - the description says what the page is *for*, not what it is called;
 *   - the title carries the brand, so an unlabelled card still identifies the
 *     platform;
 *   - the image is the composed social card, never a cropped screenshot;
 *   - the endorsement is subordinate but present.
 */

const SOCIAL_CARD = '/brand/hatsi360-social-1200x630.png';

export interface ShareInput {
  /** The page's own title, without the brand suffix. */
  title: string;
  /**
   * One or two sentences a stranger can act on. Written as the answer to
   * "what will I get here", never as a restatement of the title.
   */
  description: string;
  /** The route path, starting with a slash. Used for the canonical URL. */
  path: string;
  /** Override the card, for a page with its own composed image. */
  image?: string;
  /** Set false for anything that must not be indexed. */
  indexable?: boolean;
  /** 'article' for dated content, 'website' otherwise. */
  type?: 'website' | 'article';
}

/**
 * Build the metadata for one shareable page.
 *
 * The returned object is spread into the route's `metadata` export, or
 * returned from `generateMetadata` for a dynamic route.
 */
export function buildShareMetadata(input: ShareInput): Metadata {
  const siteUrl = getSiteUrl();
  const url = new URL(input.path, siteUrl).toString();
  const image = input.image ?? SOCIAL_CARD;
  const imageUrl = new URL(image, siteUrl).toString();
  const indexable = input.indexable ?? true;

  const fullTitle = `${input.title} | ${BRAND.name}`;
  const ogTitle = input.title.includes(BRAND.name)
    ? input.title
    : `${input.title} | ${BRAND.name}`;

  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
    openGraph: {
      type: input.type ?? 'website',
      siteName: BRAND.name,
      locale: BRAND.locale,
      url,
      title: ogTitle,
      description: input.description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${BRAND.name} — ${BRAND.descriptor}. ${input.description}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: input.description,
      images: [imageUrl],
    },
    robots: indexable
      ? { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } }
      : { index: false, follow: false },
  };
}

/**
 * The platform's own description, used wherever the whole product is shared.
 *
 * It leads with what a visitor gets, names who it is for, and states the
 * discipline that distinguishes it: prices are verified before they are
 * published. The previous wording was a list of features; this one is a
 * proposition.
 */
export const PLATFORM_DESCRIPTION =
  'Verified agricultural commodity prices from Nigerian markets, collected by ' +
  'field agents and checked before publication. Compare markets, track price ' +
  'movement and find where the best prices are — for traders, aggregators, ' +
  'processors and exporters.';

/** A shorter form, for cards and lists where space is tight. */
export const PLATFORM_DESCRIPTION_SHORT =
  'Verified agricultural commodity prices from Nigerian markets, checked ' +
  'before publication.';

/**
 * The description for the Trade Intelligence section.
 *
 * The terminal is the platform's flagship surface, so its shared link has to
 * say what a trader gets from it rather than describing a chart.
 */
export const TRADE_DESCRIPTION =
  'A commodity trading terminal for Nigerian agricultural markets: candlestick ' +
  'price movement, market comparison, and where the best verified buying and ' +
  'selling prices were recorded.';
