/**
 * Market Insights Panel — auto-generated intelligence from price observations.
 *
 * Analyzes the full dataset and surfaces actionable observations: biggest
 * movers, concentration patterns, data freshness alerts, and geographic
 * distribution. All derived from real data — nothing fabricated.
 */

import type { PriceObservation } from '@/types/domain';
import { formatMoney, formatDate } from '@/lib/money';
import { IconTrendingUp, IconTrendingDown, IconAlertTriangle, IconMapPin, IconActivity } from '@/components/ui/icons';

interface Insight {
  type: 'gainer' | 'decliner' | 'alert' | 'concentration' | 'geographic' | 'freshness';
  title: string;
  description: string;
  icon: React.ReactNode;
  detail?: string;
}

export function MarketInsights({ observations }: { observations: PriceObservation[] }) {
  const insights = computeInsights(observations);

  if (insights.length === 0) return null;

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-ink-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-ink-900">Market Insights</h3>
        <p className="mt-0.5 text-xs text-ink-500">
          Auto-generated intelligence from {observations.length} observation{observations.length === 1 ? '' : 's'}
        </p>
      </div>
      <div className="divide-y divide-ink-100">
        {insights.slice(0, 5).map((insight, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3">
            <div className={`mt-0.5 rounded-lg p-1.5 ${getInsightBg(insight.type)}`}>
              {insight.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink-900">{insight.title}</p>
              <p className="mt-0.5 text-xs text-ink-500">{insight.description}</p>
              {insight.detail && (
                <p className="mt-1 text-[0.6875rem] font-medium text-brand-700">{insight.detail}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getInsightBg(type: Insight['type']): string {
  switch (type) {
    case 'gainer': return 'bg-success-50 text-success-600';
    case 'decliner': return 'bg-error-50 text-error-600';
    case 'alert': return 'bg-warning-50 text-warning-600';
    case 'concentration': return 'bg-info-50 text-info-500';
    case 'geographic': return 'bg-brand-50 text-brand-600';
    case 'freshness': return 'bg-ink-50 text-ink-600';
  }
}

function computeInsights(observations: PriceObservation[]): Insight[] {
  if (observations.length < 3) return [];

  const insights: Insight[] = [];

  // 1. Biggest price range (max-min across all observations)
  const prices = observations
    .map((o) => o.normalizedAmount ?? o.reportedAmount ?? 0)
    .filter((p) => p > 0);
  if (prices.length >= 2) {
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const spread = ((maxPrice - minPrice) / minPrice) * 100;
    if (spread > 50) {
      const maxObs = observations.find(
        (o) => (o.normalizedAmount ?? o.reportedAmount ?? 0) === maxPrice,
      );
      const minObs = observations.find(
        (o) => (o.normalizedAmount ?? o.reportedAmount ?? 0) === minPrice,
      );
      insights.push({
        type: 'alert',
        title: `Wide price spread detected: ${spread.toFixed(0)}%`,
        description: `Prices range from ₦${minPrice.toLocaleString('en-NG')} to ₦${maxPrice.toLocaleString('en-NG')}, suggesting significant market fragmentation or quality variation.`,
        detail: maxObs && minObs ? `${minObs.marketName} → ${maxObs.marketName}` : undefined,
        icon: <IconAlertTriangle className="size-4" />,
      });
    }
  }

  // 2. Most active commodity
  const byCommodity = new Map<number, number>();
  for (const obs of observations) {
    byCommodity.set(obs.commodityId, (byCommodity.get(obs.commodityId) ?? 0) + 1);
  }
  const mostActive = [...byCommodity.entries()].sort((a, b) => b[1] - a[1])[0];
  if (mostActive && mostActive[1] >= 3) {
    const obs = observations.find((o) => o.commodityId === mostActive[0]);
    if (obs) {
      insights.push({
        type: 'concentration',
        title: `${obs.commodityName} dominates reporting`,
        description: `${mostActive[1]} of ${observations.length} observations (${((mostActive[1] / observations.length) * 100).toFixed(0)}%) are for ${obs.commodityName}.`,
        icon: <IconActivity className="size-4" />,
      });
    }
  }

  // 3. Most active market
  const byMarket = new Map<number, number>();
  for (const obs of observations) {
    byMarket.set(obs.marketId, (byMarket.get(obs.marketId) ?? 0) + 1);
  }
  const mostActiveMarket = [...byMarket.entries()].sort((a, b) => b[1] - a[1])[0];
  if (mostActiveMarket && mostActiveMarket[1] >= 3) {
    const obs = observations.find((o) => o.marketId === mostActiveMarket[0]);
    if (obs) {
      insights.push({
        type: 'geographic',
        title: `${obs.marketName} is the most active market`,
        description: `${mostActiveMarket[1]} observations reported from this market across ${byCommodity.size} commodit${byCommodity.size === 1 ? 'y' : 'ies'}.`,
        icon: <IconMapPin className="size-4" />,
      });
    }
  }

  // 4. Data freshness
  const latestObs = observations.reduce((a, b) =>
    (a.collectedAt > b.collectedAt ? a : b),
  );
  const daysAgo = Math.floor(
    (Date.now() - new Date(latestObs.collectedAt).getTime()) / 86400000,
  );
  if (daysAgo > 14) {
    insights.push({
      type: 'freshness',
      title: `Latest data is ${daysAgo} days old`,
      description: `The most recent observation was collected on ${formatDate(latestObs.collectedAt)}. Consider checking if collection is still active.`,
      icon: <IconAlertTriangle className="size-4" />,
    });
  } else if (daysAgo <= 1) {
    insights.push({
      type: 'freshness',
      title: 'Data is current',
      description: `The latest observation was collected ${daysAgo === 0 ? 'today' : 'yesterday'} — data freshness is good.`,
      icon: <IconActivity className="size-4" />,
    });
  }

  // 5. Unique states coverage
  const states = new Set(observations.map((o) => o.stateSlug).filter(Boolean));
  if (states.size >= 3) {
    insights.push({
      type: 'geographic',
      title: `Coverage spans ${states.size} states`,
      description: 'Your price data has good geographic distribution across multiple Nigerian states.',
      icon: <IconMapPin className="size-4" />,
    });
  }

  return insights;
}
