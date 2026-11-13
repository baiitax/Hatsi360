import rawCatalogue from './catalogue.json';
import { SERVED_IMAGES, SERVED_IMAGE_PATHS } from './generated-manifest';

/**
 * The Hatsi360 image registry.
 *
 * Every photograph the platform serves is registered here, keyed by a stable
 * identifier, and every component resolves its image through this file rather
 * than through a hard-coded path. That means:
 *
 *  - a commodity image is matched by the commodity's canonical **slug**, which
 *    comes from the catalogue in `src/data/seed/reference-data.ts` — not by
 *    its display name, which can change;
 *  - a market image is matched by the market's canonical **slug**, and can also
 *    be looked up by market id, which is what the data layer exposes;
 *  - a page image is matched by a **route key**, so a page asks for
 *    `"home.hero"` and never carries a URL.
 *
 * The registry is the seam a future CMS or admin media manager would replace:
 * `resolveImage` is the only entry point components use, so swapping the
 * source of truth later touches this file and nothing else.
 *
 * The semantic data (subject, alternative text, licence, attribution) lives in
 * `catalogue.json`, which is also read by `scripts/build_image_library.py`. The
 * dimensions and byte weights come from `generated-manifest.ts`, which the
 * build script writes from the files it actually produced — so the numbers in
 * the interface can never drift from the files on disk.
 */

/* ------------------------------------------------------------------ types -- */

export type ImageRole =
  | 'hero'
  | 'commodity'
  | 'market'
  | 'agriculture'
  | 'infrastructure'
  | 'professionals'
  | 'insights'
  | 'reports'
  | 'ui';

/**
 * How faithfully a picture represents the record it illustrates.
 *
 * `exact` means the picture shows the thing it is filed under. `representative`
 * means it shows that *kind* of place or activity — Hatsi360 holds licensed
 * photography for some commodities and markets and not for others, and a
 * representative image is labelled as one in the interface rather than being
 * passed off as a verified photograph of a named market.
 */
export type ImageRepresentation = 'exact' | 'representative';

export interface ImageAsset {
  /** The stable registry identifier, e.g. `commodity.maize-yellow`. */
  id: string;
  /** The served path, e.g. `/images/hatsi360/commodities/maize-yellow.jpg`. */
  src: string;
  /** Intrinsic width of the served file, in pixels. */
  width: number;
  /** Intrinsic height of the served file, in pixels. */
  height: number;
  /** The weight of the served file, in bytes. */
  bytes: number;
  /** A neutral blur placeholder, used by `next/image` to reserve the box. */
  blurDataURL: string;
  /** Meaningful alternative text. Empty for a decorative image. */
  alt: string;
  /** What the picture shows, in plain language. */
  subject: string;
  /** The licence the asset is published under. */
  licence: string;
  /** The attribution line shown where an asset requires one. */
  credit?: string;
  /** The family the asset belongs to. */
  role: ImageRole;
  /** True when the image carries no information and must use `alt=""`. */
  decorative: boolean;
  /** How faithfully the image represents what it is filed under. */
  representation: ImageRepresentation;
}

/** A page-level image request. */
export interface PageImage extends ImageAsset {
  /** The route key the page asked for, e.g. `home.hero`. */
  key: string;
}

/* -------------------------------------------------------------- catalogue -- */

interface CatalogueAsset {
  source: string;
  folder: string;
  name: string;
  width: number;
  height: number;
  alt: string;
  subject: string;
  licence: string;
  credit?: string;
  role: ImageRole;
  decorative?: boolean;
  representation?: ImageRepresentation;
}

interface Catalogue {
  assets: Record<string, CatalogueAsset>;
  commodities: Record<string, string>;
  markets: Record<string, string>;
  categories: Record<string, string>;
  pages: Record<string, string>;
  insights: Record<string, string>;
  commodityIds: Record<string, string>;
  marketIds: Record<string, string>;
}

const catalogue = rawCatalogue as unknown as Catalogue;

const ROLE_SET = new Set<string>([
  'hero',
  'commodity',
  'market',
  'agriculture',
  'infrastructure',
  'professionals',
  'insights',
  'reports',
  'ui',
]);

/* ------------------------------------------------------------- resolution -- */

const assetCache = new Map<string, ImageAsset>();

function buildAsset(id: string): ImageAsset | null {
  const entry = catalogue.assets[id];
  if (!entry) return null;

  const path = SERVED_IMAGE_PATHS[id];
  if (!path) return null;

  const served = SERVED_IMAGES[path];
  if (!served) return null;

  const role = ROLE_SET.has(entry.role) ? (entry.role as ImageRole) : 'ui';

  return {
    id,
    src: path,
    width: served.width,
    height: served.height,
    bytes: served.bytes,
    blurDataURL: served.blur,
    alt: entry.alt ?? '',
    subject: entry.subject ?? '',
    licence: entry.licence ?? '',
    credit: entry.credit,
    role,
    decorative: entry.decorative === true || !entry.alt,
    representation: entry.representation ?? 'exact',
  };
}

/** The raw registry entry for an asset id, or `null` when it is unknown. */
export function getAsset(id: string): ImageAsset | null {
  if (!id) return null;
  const cached = assetCache.get(id);
  if (cached) return cached;
  const built = buildAsset(id);
  if (built) assetCache.set(id, built);
  return built;
}

/**
 * The fallback used when a record has no image of its own.
 *
 * It is a neutral grain panel rather than a photograph, so it never implies
 * that a specific subject was photographed.
 */
const FALLBACK_ID = 'ui.placeholder';

function fallbackAsset(): ImageAsset {
  return (
    getAsset(FALLBACK_ID) ?? {
      id: FALLBACK_ID,
      src: '/images/hatsi360/ui/placeholder.jpg',
      width: 1200,
      height: 800,
      bytes: 0,
      blurDataURL: '',
      alt: '',
      subject: 'Placeholder panel',
      licence: 'Hatsi360 original asset',
      role: 'ui',
      decorative: true,
      representation: 'representative',
    }
  );
}

/**
 * Resolve an asset id, falling back to the neutral placeholder.
 *
 * The fallback is deliberately non-photographic: a page that cannot find the
 * right picture shows a quiet panel rather than a wrong photograph.
 */
export function resolveImage(id: string | null | undefined): ImageAsset {
  if (!id) return fallbackAsset();
  return getAsset(id) ?? fallbackAsset();
}

/* ------------------------------------------------------- page-level keys -- */

/**
 * The image for a page key, such as `home.hero` or `insights.<slug>`.
 *
 * Unknown keys resolve to the neutral placeholder, so a new page can ask for
 * an image before one has been commissioned and still render cleanly.
 */
export function getPageImage(key: string): PageImage {
  const id = catalogue.pages[key];
  const asset = resolveImage(id);
  return { ...asset, key };
}

/** Whether a page key has a real image registered for it. */
export function hasPageImage(key: string): boolean {
  const id = catalogue.pages[key];
  return Boolean(id && getAsset(id));
}

/* ------------------------------------------------------------ commodities -- */

/**
 * The image for a commodity, matched by its canonical slug.
 *
 * The slug comes from the catalogue, so a renamed commodity keeps its image
 * and a newly added one falls back to the neutral placeholder until an image
 * is registered for it.
 */
export function getCommodityImage(slug: string | null | undefined): ImageAsset {
  if (!slug) return fallbackAsset();
  const id = catalogue.commodities[slug];
  return resolveAssetOrFallback(id);
}

/**
 * The image for a commodity, matched by its catalogue id.
 *
 * The data layer exposes commodity ids rather than slugs in some places, so
 * the registry can be asked either way. The id map mirrors the canonical
 * catalogue in `src/data/seed/reference-data.ts`, and a test asserts that the
 * two agree.
 */
export function getCommodityImageById(
  id: number | null | undefined,
  slug?: string | null,
): ImageAsset {
  if (slug) return getCommodityImage(slug);
  if (typeof id !== 'number') return fallbackAsset();
  const mapped = catalogue.commodityIds[String(id)];
  return mapped ? getCommodityImage(mapped) : fallbackAsset();
}

/**
 * The image for a category, used when a category is shown on its own.
 */
export function getCategoryImage(categorySlug: string | null | undefined): ImageAsset {
  if (!categorySlug) return fallbackAsset();
  return resolveAssetOrFallback(catalogue.categories[categorySlug]);
}

/* ---------------------------------------------------------------- markets -- */

/**
 * The image for a market, matched by its canonical slug.
 *
 * Hatsi360 holds licensed photography for some markets and not for others.
 * Where no photograph of the market itself is held, the registry returns a
 * **representative** image of that kind of trading environment, and the
 * interface labels it as one. It is never presented as a verified photograph
 * of the named market.
 */
export function getMarketImage(slug: string | null | undefined): ImageAsset {
  if (!slug) return fallbackAsset();
  return resolveAssetOrFallback(catalogue.markets[slug]);
}

/**
 * The image for a market, matched by its catalogue id.
 *
 * The market id is the identifier the data layer exposes, so the registry can
 * be keyed on it directly. The id map mirrors the canonical market catalogue
 * in `src/data/seed/reference-data.ts`, and a test asserts that the two agree.
 */
export function getMarketImageById(
  id: number | null | undefined,
  slug?: string | null,
): ImageAsset {
  if (slug) return getMarketImage(slug);
  if (typeof id !== 'number') return fallbackAsset();
  const mapped = catalogue.marketIds[String(id)];
  return mapped ? getMarketImage(mapped) : fallbackAsset();
}

/* --------------------------------------------------------------- insights -- */

/** The feature image for a published article, matched by the article slug. */
export function getInsightImage(slug: string | null | undefined): ImageAsset {
  if (!slug) return fallbackAsset();
  return resolveAssetOrFallback(catalogue.insights[slug]);
}

/* ---------------------------------------------------------------- helpers -- */

function resolveAssetOrFallback(id: string | undefined): ImageAsset {
  if (!id) return fallbackAsset();
  return getAsset(id) ?? fallbackAsset();
}

/** Every registered asset id, for the manifest tooling and the admin screens. */
export function listAssetIds(): string[] {
  return Object.keys(catalogue.assets).sort();
}

/** The served path for an asset id, or `null` when the asset is unknown. */
export function assetPath(id: string): string | null {
  return SERVED_IMAGE_PATHS[id] ?? null;
}

/** The total weight of the served library, in bytes. */
export function libraryBytes(): number {
  return Object.values(SERVED_IMAGES).reduce((total, image) => total + image.bytes, 0);
}

/**
 * The caption a representative image must carry.
 *
 * It is deliberately specific: it says what the picture is and what it is
 * not, so a reader is never misled about the provenance of a market image.
 */
export function representativeCaption(asset: ImageAsset): string | null {
  if (asset.representation !== 'representative') return null;
  return 'Representative image — an illustration of this type of trading environment, not a photograph of the named market.';
}

/** The short badge shown beside a representative image. */
export const REPRESENTATIVE_BADGE = 'Representative image';
