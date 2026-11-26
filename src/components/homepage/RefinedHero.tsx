/**
 * Hatsi360 — the homepage hero.
 *
 * The opening screen is a photograph of a maize estate at sunrise, with grain
 * silos and a loaded lorry at the yard. It is composed twice, because it has
 * two different jobs:
 *
 *  - **On a phone** the photograph is a band at the top, shown whole, and the
 *    words sit beneath it on warm ivory. Nothing is written across the picture.
 *  - **From a tablet up** the photograph runs edge to edge behind the whole
 *    hero, and an ivory sheet carries the words on the left, its right edge
 *    dissolving into the picture. The image is revealed, untouched, on the
 *    right — no darkening, no tint — while the type sits on solid ground.
 *
 * That second decision is the one that matters. The earlier version set white
 * text over a bright photograph and relied on a scrim to hold it up; measured
 * against the picture's own pixels the body copy fell to about 3:1. Here the
 * words are never on the photograph at all, so contrast does not depend on
 * which image the site is using — it is ivory and forest green, every time.
 *
 * The photograph drifts more slowly than the page as the visitor scrolls. The
 * drift is capped by the image's own overhang inside the frame, so the band on
 * a phone and the full-height hero on a desktop both stay covered.
 */

import Link from 'next/link';
import { formatDate } from '@/lib/money';
import { getPageImage } from '@/lib/images/registry';
import { ParallaxBackdrop } from './ParallaxBackdrop';

export interface RefinedHeroProps {
  /** e.g. "28 published observations · 22 commodities · 11 markets". */
  coverageLine: string;
  latestObservedAt: string | null;
}

export function RefinedHero({ coverageLine, latestObservedAt }: RefinedHeroProps) {
  const photo = getPageImage('home.hero');

  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate flex flex-col overflow-hidden border-b border-ink-200 bg-sand-50 text-ink-900 lg:min-h-[640px]"
    >
      {/*
        One image, two geometries: a band in the flow on phones, a full-bleed
        ground from `lg`. The photograph is decorative here — the section is
        announced by its heading, not by its picture — so it carries
        `aria-hidden` inside the parallax component.
      */}
      <div className="relative h-56 w-full sm:h-72 lg:absolute lg:inset-0 lg:h-auto">
        <ParallaxBackdrop asset={photo} strength={56} className="absolute inset-0" />
      </div>

      <div className="container-page relative flex flex-1 items-center py-10 lg:py-20">
        {/*
          The ivory sheet. It is anchored to the copy column rather than to a
          percentage of the viewport, so it always covers the words exactly,
          whatever the screen width — and it runs past the top and bottom of the
          section so the photograph never bleeds into the left margin.
        */}
        <div className="relative max-w-[46rem]">
          {/*
            Anchored to this column, not to the container: `-right-16` is four
            rem past the words, so the photograph is untouched beyond it. The
            fade that follows is the sheet's soft edge.
          */}
          <div
            aria-hidden="true"
            className="absolute -top-48 -right-16 -bottom-48 -left-[100vw] hidden bg-sand-50 lg:block"
          />
          <div
            aria-hidden="true"
            className="absolute -top-48 -right-32 -bottom-48 hidden w-16 bg-gradient-to-r from-sand-50 to-transparent lg:block"
          />

          <div className="relative">
            <p className="flex items-center gap-3 font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-brand-700">
              <span aria-hidden="true" className="inline-block h-px w-8 bg-harvest-500" />
              Field-recorded agricultural prices
            </p>

            <h1
              id="hero-title"
              className="mt-4 text-balance font-display text-[2.25rem] font-extrabold leading-[1.06] tracking-[-0.03em] text-ink-900 sm:text-[2.625rem] lg:text-[3.125rem]"
            >
              <span className="block">Know the Market.</span>
              <span className="block">Understand the Movement.</span>
              <span className="block text-brand-700">Trade with Confidence.</span>
            </h1>

            <p className="mt-4 max-w-[34rem] text-[0.9375rem] leading-relaxed text-ink-700 sm:text-[1.0625rem]">
              African agricultural market intelligence built on verified field observations, market
              movements and actionable trade insights — every figure carrying the market it came
              from and the date it was collected.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/markets"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-800 px-6 py-3.5 font-display text-sm font-bold text-sand-50 transition-colors hover:bg-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-sand-50"
              >
                Explore Markets
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                href="/trade"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-brand-800/30 bg-white px-6 py-3.5 font-display text-sm font-bold text-brand-800 transition-colors hover:border-brand-800/50 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-sand-50"
              >
                Discover Trade Intelligence
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ─── The tape: what the record holds, along the bottom edge ─── */}
      <div className="relative border-t border-ink-200 bg-white">
        <div className="container-page flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.6875rem] text-ink-500">
            <span className="uppercase tracking-[0.14em] text-brand-700">Record status</span>
            <span aria-hidden="true" className="text-ink-300">
              ·
            </span>
            <span>{coverageLine}</span>
            {latestObservedAt ? (
              <>
                <span aria-hidden="true" className="text-ink-300">
                  ·
                </span>
                <span>Last recorded {formatDate(latestObservedAt)}</span>
              </>
            ) : null}
          </p>

          <div className="flex items-center gap-4">
            <span className="hidden font-mono text-[0.625rem] text-ink-400 sm:inline">
              Image: Hatsi360
            </span>
            <Link
              href="/prices"
              className="shrink-0 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-brand-700 transition-colors hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              Price directory →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
