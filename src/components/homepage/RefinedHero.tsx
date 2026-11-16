/**
 * Hatsi360 — Refined Hero Section.
 *
 * Clean, confident, enterprise-grade hero communicating:
 * - Agricultural market intelligence
 * - African commodity markets
 * - Reliable market information
 * - Better commercial decisions
 *
 * Design principles:
 * - Professional, minimal, confident
 * - Strong typography hierarchy
 * - Restrained color palette
 * - Authentic agricultural imagery
 */

import Link from 'next/link';
import { IconArrowRight } from '@/components/ui/icons';

export interface RefinedHeroProps {
  publishedCount: number;
  commodityCount: number;
  marketCount: number;
  coverageLine: string;
  latestObservedAt: string | null;
}

export function RefinedHero({
  publishedCount,
  commodityCount,
  marketCount,
  coverageLine,
  latestObservedAt,
}: RefinedHeroProps) {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-center">
          {/* Left Column — Messaging */}
          <div className="space-y-6">
            {/* Eyebrow Label */}
            <div className="inline-flex items-center gap-2 rounded-full bg-[#EAF4EE] px-4 py-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#1D805A]">
                African Agricultural Market Intelligence
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl font-bold tracking-tight text-[#0B2A20] sm:text-5xl lg:text-[3.5rem] lg:leading-[1.1]">
              Understand Agricultural Markets. Make Better Trade Decisions.
            </h1>

            {/* Supporting Paragraph */}
            <p className="max-w-xl text-lg leading-relaxed text-[#64736B]">
              Access agricultural commodity prices, market intelligence and trade insights
              that help businesses understand market movements, identify opportunities and
              make more informed decisions across African agricultural markets.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/markets"
                className="inline-flex items-center gap-2 rounded-lg bg-[#1D805A] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#103C2D]"
              >
                Explore Markets
                <IconArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/trade"
                className="inline-flex items-center gap-2 rounded-lg border border-[#E3EAE5] px-6 py-3 text-sm font-semibold text-[#103C2D] transition-colors hover:bg-[#F7F9F7]"
              >
                Explore Trade Intelligence
              </Link>
            </div>

            {/* Trust Indicator */}
            {publishedCount > 0 && (
              <div className="flex items-center gap-4 border-t border-[#E3EAE5] pt-6">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[#1D805A]" />
                  <span className="text-sm text-[#64736B]">
                    {publishedCount.toLocaleString()} verified price observations
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[#1D805A]" />
                  <span className="text-sm text-[#64736B]">
                    {commodityCount} commodities
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[#1D805A]" />
                  <span className="text-sm text-[#64736B]">
                    {marketCount} markets
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right Column — Hero Image */}
          <div className="relative lg:order-none">
            <div className="relative overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/hatsi360-hero.png"
                alt="African agricultural market — farmers and traders in a vibrant market setting"
                className="h-auto w-full object-cover"
                width={800}
                height={600}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
