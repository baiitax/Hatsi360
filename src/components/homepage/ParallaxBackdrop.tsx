'use client';

import { useEffect, useRef } from 'react';
import { HatsiImage } from '@/components/media/HatsiImage';
import type { ImageAsset } from '@/lib/images/registry';

/**
 * A photograph that moves more slowly than the page.
 *
 * The effect is deliberately small — the image drifts by `strength` pixels
 * across the whole of the hero — because the point is depth, not spectacle. A
 * background that races the content reads as a gimmick; one that lags it
 * slightly reads as distance.
 *
 * The implementation rules, and why:
 *
 *  - **Transform only.** The layer is moved with `translate3d`, which the
 *    compositor handles. Nothing here touches layout, so scrolling stays at
 *    frame rate and no element is re-measured except the hero itself.
 *  - **One frame per scroll.** Reads and writes are throttled to
 *    `requestAnimationFrame`, so a fast flick cannot queue up dozens of
 *    style writes.
 *  - **Off by default when the reader asked for calm.** Under
 *    `prefers-reduced-motion: reduce` the layer is left still and the hero is
 *    simply a photograph behind text. The preference is watched, not sampled
 *    once, so changing it mid-session takes effect.
 *  - **Scaled up before it moves.** The layer is enlarged by `zoom` so the
 *    drift never exposes an edge of the photograph.
 *  - **Decorative and hidden from assistive technology.** The wrapper carries
 *    `aria-hidden`, so the hero is announced as its heading and copy rather
 *    than as a background picture.
 */
export function ParallaxBackdrop({
  asset,
  strength = 88,
  zoom = 1.18,
  className = 'absolute inset-0',
}: {
  asset: ImageAsset;
  /** The furthest, in pixels, the image may drift across its frame. */
  strength?: number;
  /** Pre-scale, so the drift cannot expose an edge. */
  zoom?: number;
  /** Where the frame sits. Defaults to filling its positioned parent. */
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = host.current;
    const image = layer.current;
    if (!wrapper || !image) return;

    // Not every environment implements matchMedia (jsdom, some embedded
    // webviews). Without it the effect simply runs; the preference is an
    // enhancement, not a requirement.
    const motionQuery =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;

    let frame = 0;
    let still = motionQuery?.matches ?? false;

    const paint = () => {
      frame = 0;

      if (still) {
        image.style.transform = `scale(${zoom})`;
        return;
      }

      const bounds = wrapper.getBoundingClientRect();
      const viewport = window.innerHeight;

      // Outside the viewport there is nothing to draw.
      if (bounds.bottom <= 0 || bounds.top >= viewport) return;

      // 0 while the frame's top edge is at the top of the viewport, 1 once it
      // has scrolled its own height past.
      const progress = Math.min(Math.max(-bounds.top / Math.max(bounds.height, 1), 0), 1);

      // The pre-scale leaves `(zoom - 1) / 2` of the image hanging beyond each
      // edge. Drifting further than that would slide the photograph off its own
      // frame and show the background through the gap, so the travel is capped
      // by the overhang — which matters when the same component draws a tall
      // hero on a desktop and a short band on a phone.
      const overhang = ((zoom - 1) / 2) * bounds.height;
      const travel = Math.max(0, Math.min(strength, overhang));

      image.style.transform = `translate3d(0, ${(progress * travel).toFixed(2)}px, 0) scale(${zoom})`;
    };

    const request = () => {
      if (!frame) frame = window.requestAnimationFrame(paint);
    };

    const onPreferenceChange = () => {
      still = motionQuery?.matches ?? false;
      paint();
    };

    paint();
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request, { passive: true });

    // `addEventListener` on a MediaQueryList is the modern API; Safari below 14
    // only has `addListener`.
    if (motionQuery) {
      if (typeof motionQuery.addEventListener === 'function') {
        motionQuery.addEventListener('change', onPreferenceChange);
      } else if (typeof motionQuery.addListener === 'function') {
        motionQuery.addListener(onPreferenceChange);
      }
    }

    return () => {
      window.removeEventListener('scroll', request);
      window.removeEventListener('resize', request);
      if (motionQuery) {
        if (typeof motionQuery.removeEventListener === 'function') {
          motionQuery.removeEventListener('change', onPreferenceChange);
        } else if (typeof motionQuery.removeListener === 'function') {
          motionQuery.removeListener(onPreferenceChange);
        }
      }
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [strength, zoom]);

  return (
    <div
      ref={host}
      aria-hidden="true"
      className={`pointer-events-none overflow-hidden ${className}`}
    >
      <div
        ref={layer}
        className="absolute inset-0 will-change-transform"
        style={{ transform: `scale(${zoom})` }}
      >
        <HatsiImage asset={asset} fill priority sizes="100vw" />
      </div>
    </div>
  );
}
