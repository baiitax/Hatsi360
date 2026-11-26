// @vitest-environment jsdom
/**
 * The homepage hero's parallax backdrop.
 *
 * The hero photograph drifts behind the headline. Three behaviours matter, and
 * each is asserted here rather than left to a manual scroll:
 *
 *   1. the layer moves by a fraction of the scroll, through a transform only;
 *   2. it never runs when the reader has asked for reduced motion — the
 *      photograph is still there, it simply does not move;
 *   3. it leaves no listener behind when the hero unmounts.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';

import { ParallaxBackdrop } from '@/components/homepage/ParallaxBackdrop';
import { getPageImage } from '@/lib/images/registry';

const asset = getPageImage('home.hero');

/** A MediaQueryList stub for the two motion preferences. */
function stubMatchMedia(reducedMotion: boolean) {
  const listeners = new Set<() => void>();
  const query = {
    matches: reducedMotion,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: (_: string, handler: () => void) => listeners.add(handler),
    removeEventListener: (_: string, handler: () => void) => listeners.delete(handler),
    addListener: (handler: () => void) => listeners.add(handler),
    removeListener: (handler: () => void) => listeners.delete(handler),
    dispatchEvent: () => true,
    onchange: null,
  };

  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation(() => query),
  );

  return { query, listeners };
}

/** The host is the hero section; jsdom has no layout, so place it by hand. */
function placeHero(container: HTMLElement, top: number, height = 600) {
  const host = container.firstElementChild as HTMLElement;
  host.getBoundingClientRect = () =>
    ({
      top,
      bottom: top + height,
      height,
      left: 0,
      right: 1200,
      width: 1200,
      x: 0,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect;
  return host;
}

const movingLayer = (container: HTMLElement) =>
  container.querySelector('.will-change-transform') as HTMLElement;

describe('hero parallax backdrop', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('moves the photograph a fraction of the scroll, by transform only', async () => {
    stubMatchMedia(false);
    const { container } = render(<ParallaxBackdrop asset={asset} strength={30} zoom={1.14} />);

    // Half the hero has scrolled past the top of the viewport.
    placeHero(container, -300);
    window.dispatchEvent(new Event('scroll'));
    await waitFor(() => expect(movingLayer(container).style.transform).toContain('translate3d'));

    const transform = movingLayer(container).style.transform;
    // 0.5 progress × 30px of travel.
    expect(transform).toContain('translate3d(0, 15.00px, 0)');
    // The pre-scale is what stops the drift exposing an edge of the image.
    expect(transform).toContain('scale(1.14)');
    // Nothing here may touch layout.
    expect(transform).not.toContain('top');
    expect(transform).not.toContain('margin');
  });

  it('never drifts further than the image overhangs its frame', async () => {
    // The same component draws a 640px hero on a desktop and a 224px band on a
    // phone. A travel of 88px inside a 224px frame at 1.14 scale would slide the
    // photograph off its own edge and show the page through the gap.
    stubMatchMedia(false);
    const { container } = render(<ParallaxBackdrop asset={asset} strength={88} zoom={1.14} />);

    // A short band, half scrolled.
    placeHero(container, -112, 224);
    window.dispatchEvent(new Event('scroll'));
    await waitFor(() => expect(movingLayer(container).style.transform).toContain('7.84px'));

    const bandTravel = Number(/translate3d\(0, ([\d.]+)px/.exec(movingLayer(container).style.transform)?.[1]);
    const bandOverhang = ((1.14 - 1) / 2) * 224; // 15.68px
    expect(bandTravel).toBeGreaterThan(0);
    expect(bandTravel).toBeLessThanOrEqual(bandOverhang);

    // The same strength in a tall hero is allowed to travel further, because the
    // taller frame overhangs further: 42px at half of a 600px frame.
    placeHero(container, -300, 600);
    window.dispatchEvent(new Event('scroll'));
    await waitFor(() => expect(movingLayer(container).style.transform).toContain('21.00px'));
  });

  it('holds the photograph still when reduced motion is requested', async () => {
    stubMatchMedia(true);
    const { container } = render(<ParallaxBackdrop asset={asset} strength={88} zoom={1.14} />);

    placeHero(container, -300);
    window.dispatchEvent(new Event('scroll'));
    await waitFor(() => expect(movingLayer(container).style.transform).not.toBe(''));

    expect(movingLayer(container).style.transform).toBe('scale(1.14)');
  });

  it('stops listening when the hero unmounts', () => {
    stubMatchMedia(false);
    const removeListener = vi.spyOn(window, 'removeEventListener');
    const { container, unmount } = render(<ParallaxBackdrop asset={asset} />);

    placeHero(container, -120);
    unmount();

    const removed = removeListener.mock.calls.map(([type]) => type);
    expect(removed).toContain('scroll');
    expect(removed).toContain('resize');
    removeListener.mockRestore();
  });
});
