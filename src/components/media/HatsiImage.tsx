import Image from 'next/image';
import type { ImageAsset } from '@/lib/images/registry';
import { REPRESENTATIVE_BADGE, representativeCaption } from '@/lib/images/registry';

/**
 * The one component every photograph on the platform is rendered through.
 *
 * It exists so that the delivery rules are stated once and cannot drift
 * between pages:
 *
 *  - the box is reserved before the file arrives, so a photograph never pushes
 *    the page around as it loads;
 *  - the intrinsic dimensions come from the registry, which reads them from
 *    the file itself, so an image is never squashed;
 *  - `sizes` is always given, so the browser downloads the smallest sensible
 *    rendition rather than the full file;
 *  - a neutral blur placeholder stands in while the file is in flight;
 *  - only the true hero is eager; everything else stays lazy.
 *
 * The component is a server component. It carries no state and no hooks.
 */

/** The aspect ratios the library is built to. */
export const IMAGE_RATIOS = {
  wide: '16 / 9',
  landscape: '3 / 2',
  portrait: '4 / 5',
  square: '1 / 1',
} as const;

export type ImageRatio = keyof typeof IMAGE_RATIOS;

export function HatsiImage({
  asset,
  sizes,
  priority = false,
  ratio = 'landscape',
  fill = false,
  className = '',
  imageClassName = '',
  alt,
  loading,
}: {
  asset: ImageAsset;
  /** The `sizes` attribute. Required — the library is never served at full size. */
  sizes: string;
  /** Eager loading. Reserved for the one true hero on a page. */
  priority?: boolean;
  /** The reserved box. Ignored when `fill` is set. */
  ratio?: ImageRatio;
  /**
   * Fills the nearest positioned ancestor instead of reserving its own box.
   * Used for a full-bleed hero image.
   */
  fill?: boolean;
  /** Classes on the wrapper element. */
  className?: string;
  /** Classes on the image element itself. */
  imageClassName?: string;
  /** Overrides the registered alternative text. */
  alt?: string;
  loading?: 'lazy' | 'eager';
}) {
  const resolvedAlt = alt ?? asset.alt;

  return (
    <div
      className={
        fill
          ? `absolute inset-0 overflow-hidden bg-ink-100 ${className}`
          : `relative overflow-hidden bg-ink-100 ${className}`
      }
      style={fill ? undefined : { aspectRatio: IMAGE_RATIOS[ratio] }}
    >
      <Image
        src={asset.src}
        alt={resolvedAlt}
        fill
        sizes={sizes}
        priority={priority}
        loading={priority ? undefined : (loading ?? 'lazy')}
        placeholder={asset.blurDataURL ? 'blur' : 'empty'}
        blurDataURL={asset.blurDataURL || undefined}
        className={`object-cover ${imageClassName}`}
      />
    </div>
  );
}

/**
 * A photograph with an optional caption.
 *
 * A representative image — an illustration of a kind of place rather than a
 * verified photograph of a named one — always carries a visible caption and a
 * badge, so the distinction is made in the interface and not only in the
 * metadata.
 */
export function HatsiFigure({
  asset,
  sizes,
  priority = false,
  ratio = 'landscape',
  className = '',
  imageClassName = '',
  caption,
  showBadge = true,
}: {
  asset: ImageAsset;
  sizes: string;
  priority?: boolean;
  ratio?: ImageRatio;
  className?: string;
  imageClassName?: string;
  /** Overrides the caption the registry would show. */
  caption?: string | null;
  /** Set to false to suppress the representative badge. */
  showBadge?: boolean;
}) {
  const note = caption === undefined ? representativeCaption(asset) : caption;
  const badge = showBadge && asset.representation === 'representative';

  return (
    <figure className={className}>
      <div className="relative overflow-hidden rounded-xl bg-ink-100">
        <HatsiImage
          asset={asset}
          sizes={sizes}
          priority={priority}
          ratio={ratio}
          imageClassName={imageClassName}
        />
        {badge ? (
          <span className="absolute left-3 top-3 rounded-full bg-ink-950/75 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
            {REPRESENTATIVE_BADGE}
          </span>
        ) : null}
      </div>
      {note ? (
        <figcaption className="mt-2 text-xs leading-relaxed text-ink-500">{note}</figcaption>
      ) : null}
    </figure>
  );
}
