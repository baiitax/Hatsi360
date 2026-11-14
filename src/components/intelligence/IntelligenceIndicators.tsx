/**
 * Intelligence indicator components for commodity cards.
 *
 * These components annotate commodity listings with intelligence availability,
 * so users can see at a glance which commodities have FAOSTAT data before
 * clicking through.
 */

import Link from 'next/link';
import { IconArrowRight, IconChart, IconDatabase, IconTrendingUp } from '@/components/ui/icons';
import type { CommodityIntelligenceOverview } from '@/lib/intelligence/commodity-intelligence';

/**
 * A compact indicator shown on commodity cards.
 *
 * Shows that intelligence data exists, with a key metric and a link to the
 * full intelligence page. When no intelligence data exists, renders nothing
 * (the card shows the default state).
 */
export function IntelligenceIndicator({
  intelligence,
  compact = false,
}: {
  intelligence: CommodityIntelligenceOverview | null;
  compact?: boolean;
}) {
  if (!intelligence) return null;

  // Pick the most meaningful single metric to show
  let metricLabel = '';
  let metricValue = '';

  if (intelligence.selfSufficiencyPercent !== null) {
    metricLabel = 'Self-sufficiency';
    metricValue = `${intelligence.selfSufficiencyPercent.toFixed(0)}%`;
  } else if (intelligence.latestProductionMt !== null) {
    metricLabel = 'Production';
    if (intelligence.latestProductionMt >= 1_000_000) {
      metricValue = `${(intelligence.latestProductionMt / 1_000_000).toFixed(1)}M MT`;
    } else if (intelligence.latestProductionMt >= 1_000) {
      metricValue = `${(intelligence.latestProductionMt / 1_000).toFixed(0)}K MT`;
    } else {
      metricValue = `${intelligence.latestProductionMt.toFixed(0)} MT`;
    }
  }

  if (compact) {
    return (
      <Link
        href={`/intelligence/${intelligence.commoditySlug}`}
        className="mt-2 flex items-center gap-1.5 text-[0.625rem] font-medium text-harvest-400 transition-colors hover:text-harvest-300"
        aria-label={`View intelligence data for ${intelligence.commodityName}`}
      >
        <IconChart className="size-3" aria-hidden="true" />
        <span>Intelligence available</span>
        <IconArrowRight className="size-2.5" aria-hidden="true" />
      </Link>
    );
  }

  return (
    <Link
      href={`/intelligence/${intelligence.commoditySlug}`}
      className="mt-2 flex items-center justify-between gap-2 border-t border-terminal-border pt-2 text-[0.6875rem] text-terminal-text-secondary transition-colors hover:text-harvest-300"
      aria-label={`View intelligence data for ${intelligence.commodityName}`}
    >
      <div className="flex items-center gap-1.5">
        <IconDatabase className="size-3" aria-hidden="true" />
        <span>{intelligence.totalEvidenceRecords} evidence records</span>
      </div>
      {metricLabel && (
        <div className="flex items-center gap-1">
          <IconTrendingUp className="size-3" aria-hidden="true" />
          <span className="font-medium text-terminal-text">
            {metricLabel}: {metricValue}
          </span>
        </div>
      )}
    </Link>
  );
}

/**
 * A badge-style indicator for intelligence availability.
 *
 * Smaller than the full indicator, suitable for tight layouts.
 */
export function IntelligenceBadge({
  intelligence,
}: {
  intelligence: CommodityIntelligenceOverview | null;
}) {
  if (!intelligence) return null;

  return (
    <Link
      href={`/intelligence/${intelligence.commoditySlug}`}
      className="inline-flex items-center gap-1 rounded-full bg-harvest-500/10 px-2 py-0.5 text-[0.625rem] font-medium text-harvest-400 transition-colors hover:bg-harvest-500/20"
      aria-label={`View intelligence for ${intelligence.commodityName}`}
    >
      <IconChart className="size-2.5" aria-hidden="true" />
      <span>Intelligence</span>
    </Link>
  );
}
