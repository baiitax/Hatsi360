/**
 * Interactive Coverage Dashboard — client-side data coverage visualization.
 *
 * Enhances the static coverage page with interactive charts, progress bars,
 * and better data visualization. Shows commodity × market coverage matrix,
 * freshness distribution, and state-by-state breakdown.
 *
 * All data derived from real observations. Nothing fabricated.
 */

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { Commodity, Market, PriceObservation } from '@/types/domain';
import {
  IconMapPin,
  IconActivity,
  IconDatabase,
  IconLayers,
  IconCheck,
  IconAlertTriangle,
  IconChevronDown,
  IconChevronUp,
} from '@/components/ui/icons';

export interface CoverageServerData {
  markets: Market[];
  commodities: Commodity[];
  observations: PriceObservation[];
}

interface StateBucket {
  name: string;
  markets: number;
  reporting: number;
  notReporting: number;
  commodities: number;
}

interface CommodityCoverage {
  commodityId: number;
  commodityName: string;
  commoditySlug: string;
  observationCount: number;
  marketCount: number;
  markets: string[];
  latestCollectedAt: string;
  isStale: boolean;
  daysAgo: number;
}

interface FreshnessBucket {
  label: string;
  count: number;
  color: string;
  description: string;
}

export function CoverageDashboard({ data }: { data: CoverageServerData }) {
  const { markets, commodities, observations } = data;
  const [expandedState, setExpandedState] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<string>('');

  const reportingMarketIds = useMemo(
    () => new Set(observations.map((o) => o.marketId)),
    [observations],
  );

  const reportingCommodityIds = useMemo(
    () => new Set(observations.map((o) => o.commodityId)),
    [observations],
  );

  // Stats
  const stats = useMemo(() => ({
    marketsReporting: reportingMarketIds.size,
    marketsTotal: markets.length,
    marketsCoverage: markets.length > 0 ? (reportingMarketIds.size / markets.length) * 100 : 0,
    commoditiesObserved: reportingCommodityIds.size,
    commoditiesTotal: commodities.length,
    commoditiesCoverage: commodities.length > 0 ? (reportingCommodityIds.size / commodities.length) * 100 : 0,
    totalObservations: observations.length,
    pairs: new Set(observations.map((o) => `${o.commodityId}|${o.marketId}`)).size,
  }), [markets, commodities, observations, reportingMarketIds, reportingCommodityIds]);

  // State buckets
  const stateBuckets = useMemo(() => {
    const map = new Map<string, StateBucket>();
    for (const market of markets) {
      const key = market.stateName ?? 'Nigeria';
      const bucket = map.get(key) ?? {
        name: key,
        markets: 0,
        reporting: 0,
        notReporting: 0,
        commodities: 0,
      };
      bucket.markets += 1;
      if (reportingMarketIds.has(market.id)) bucket.reporting += 1;
      else bucket.notReporting += 1;
      map.set(key, bucket);
    }

    // Count commodities per state
    for (const obs of observations) {
      const market = markets.find((m) => m.id === obs.marketId);
      if (market) {
        const key = market.stateName ?? 'Nigeria';
        const bucket = map.get(key);
        if (bucket) {
          bucket.commodities = Math.max(bucket.commodities, 1);
        }
      }
    }

    return [...map.values()].sort((a, b) => b.reporting - a.reporting);
  }, [markets, observations, reportingMarketIds]);

  // Commodity coverage
  const commodityCoverage = useMemo(() => {
    const coverage: CommodityCoverage[] = commodities.map((c) => {
      const obs = observations.filter((o) => o.commodityId === c.id);
      const marketIds = new Set(obs.map((o) => o.marketId));
      const marketNames = [...new Set(obs.map((o) => o.marketName).filter(Boolean))] as string[];
      const latest = obs.reduce<string | null>((acc, o) => {
        if (!acc || o.collectedAt > acc) return o.collectedAt;
        return acc;
      }, null);
      const daysAgo = latest ? Math.floor((Date.now() - new Date(latest).getTime()) / 86400000) : 999;
      return {
        commodityId: c.id,
        commodityName: c.name,
        commoditySlug: c.slug,
        observationCount: obs.length,
        marketCount: marketIds.size,
        markets: marketNames.slice(0, 5),
        latestCollectedAt: latest ?? '',
        isStale: daysAgo > 7,
        daysAgo,
      };
    });
    return coverage.sort((a, b) => b.observationCount - a.observationCount);
  }, [commodities, observations]);

  // Freshness distribution
  const freshnessBuckets: FreshnessBucket[] = useMemo(() => {
    const buckets: Record<string, number> = { fresh: 0, recent: 0, stale: 0, none: 0 };
    for (const c of commodityCoverage) {
      if (c.observationCount === 0) buckets.none++;
      else if (c.daysAgo <= 3) buckets.fresh++;
      else if (c.daysAgo <= 7) buckets.recent++;
      else buckets.stale++;
    }
    return [
      { label: 'Fresh (≤3 days)', count: buckets.fresh, color: 'bg-success-500', description: 'Actively collected' },
      { label: 'Recent (4–7 days)', count: buckets.recent, color: 'bg-brand-500', description: 'Recent collection' },
      { label: 'Stale (>7 days)', count: buckets.stale, color: 'bg-warning-500', description: 'Needs attention' },
      { label: 'No data', count: buckets.none, color: 'bg-ink-300', description: 'Not yet observed' },
    ];
  }, [commodityCoverage]);

  // Filtered state buckets
  const filteredStates = useMemo(() => {
    if (!filterState) return stateBuckets;
    const q = filterState.toLowerCase();
    return stateBuckets.filter((s) => s.name.toLowerCase().includes(q));
  }, [stateBuckets, filterState]);

  return (
    <div className="space-y-8">
      {/* ─── Key Metrics ─── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={<IconMapPin className="size-5 text-brand-500" />}
          label="Markets reporting"
          value={`${stats.marketsReporting} / ${stats.marketsTotal}`}
          progress={stats.marketsCoverage}
          detail={`${stats.marketsTotal - stats.marketsReporting} not yet reporting`}
        />
        <MetricCard
          icon={<IconDatabase className="size-5 text-brand-500" />}
          label="Commodities observed"
          value={`${stats.commoditiesObserved} / ${stats.commoditiesTotal}`}
          progress={stats.commoditiesCoverage}
          detail={`${stats.commoditiesTotal - stats.commoditiesObserved} not yet observed`}
        />
        <MetricCard
          icon={<IconLayers className="size-5 text-brand-500" />}
          label="Commodity–market pairs"
          value={String(stats.pairs)}
          detail="Unique combinations with observations"
        />
        <MetricCard
          icon={<IconActivity className="size-5 text-brand-500" />}
          label="Published observations"
          value={stats.totalObservations.toLocaleString()}
          detail="Eligible for public display"
        />
      </div>

      {/* ─── Freshness Distribution ─── */}
      <div className="card overflow-hidden">
        <div className="border-b border-ink-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-ink-900">Data Freshness</h3>
          <p className="mt-0.5 text-xs text-ink-500">How current the observations are for each commodity</p>
        </div>
        <div className="p-5">
          {/* Stacked bar */}
          <div className="mb-4 flex h-4 w-full overflow-hidden rounded-full bg-ink-100">
            {freshnessBuckets.map((b) => {
              const pct = commodityCoverage.length > 0 ? (b.count / commodityCoverage.length) * 100 : 0;
              if (pct === 0) return null;
              return (
                <div
                  key={b.label}
                  className={b.color}
                  style={{ width: `${pct}%` }}
                  title={`${b.label}: ${b.count} commodities`}
                />
              );
            })}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {freshnessBuckets.map((b) => (
              <div key={b.label} className="flex items-center gap-3">
                <span className={`size-3 rounded-full ${b.color}`} />
                <div>
                  <p className="text-sm font-semibold text-ink-900">{b.count}</p>
                  <p className="text-xs text-ink-500">{b.label}</p>
                  <p className="text-[0.625rem] text-ink-400">{b.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Commodity Coverage ─── */}
      <div className="card overflow-hidden">
        <div className="border-b border-ink-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-ink-900">Commodity Coverage</h3>
          <p className="mt-0.5 text-xs text-ink-500">
            Observation count and market coverage for each commodity
          </p>
        </div>
        <div className="divide-y divide-ink-50 max-h-[500px] overflow-y-auto">
          {commodityCoverage.map((c) => {
            const maxObs = commodityCoverage[0]?.observationCount ?? 1;
            const barWidth = maxObs > 0 ? (c.observationCount / maxObs) * 100 : 0;
            return (
              <div key={c.commodityId} className="px-5 py-3 hover:bg-ink-50/50 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <Link
                    href={`/commodities/${c.commoditySlug}`}
                    className="font-semibold text-sm text-ink-900 hover:text-brand-700"
                  >
                    {c.commodityName}
                  </Link>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-ink-500">
                      {c.marketCount} market{c.marketCount === 1 ? '' : 's'}
                    </span>
                    {c.observationCount > 0 ? (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold ${
                          c.isStale
                            ? 'bg-warning-50 text-warning-700'
                            : 'bg-success-50 text-success-700'
                        }`}
                      >
                        {c.isStale ? (
                          <IconAlertTriangle className="size-2.5" />
                        ) : (
                          <IconCheck className="size-2.5" />
                        )}
                        {c.daysAgo === 0 ? 'Today' : `${c.daysAgo}d ago`}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-ink-100 px-2 py-0.5 text-[0.625rem] font-medium text-ink-500">
                        No data
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-1.5 w-full rounded-full bg-ink-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      c.observationCount === 0 ? 'bg-ink-200' : c.isStale ? 'bg-warning-400' : 'bg-brand-500'
                    }`}
                    style={{ width: `${Math.max(barWidth, c.observationCount > 0 ? 2 : 0)}%` }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[0.625rem] text-ink-400">
                  <span>{c.observationCount} observations</span>
                  <span className="truncate max-w-[200px]">
                    {c.markets.slice(0, 3).join(', ')}
                    {c.markets.length > 3 && ` +${c.markets.length - 3}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── State Breakdown ─── */}
      <div className="card overflow-hidden">
        <div className="border-b border-ink-100 px-5 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-ink-900">By State</h3>
              <p className="mt-0.5 text-xs text-ink-500">
                Market reporting coverage by state
              </p>
            </div>
            <div className="relative">
              <input
                type="search"
                value={filterState}
                onChange={(e) => setFilterState(e.target.value)}
                placeholder="Filter states…"
                className="w-40 rounded-lg border border-ink-200 bg-white py-1.5 pl-3 pr-3 text-xs text-ink-800 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-200 bg-ink-50/80">
                <th className="px-5 py-3 text-left font-semibold text-ink-600">State</th>
                <th className="px-5 py-3 text-right font-semibold text-ink-600">Total markets</th>
                <th className="px-5 py-3 text-right font-semibold text-ink-600">Reporting</th>
                <th className="px-5 py-3 text-right font-semibold text-ink-600">Not reporting</th>
                <th className="px-5 py-3 text-left font-semibold text-ink-600 min-w-[140px]">Coverage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filteredStates.map((s) => {
                const pct = s.markets > 0 ? (s.reporting / s.markets) * 100 : 0;
                return (
                  <tr key={s.name} className="transition-colors hover:bg-ink-50/50">
                    <td className="px-5 py-3 font-medium text-ink-900">{s.name}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-ink-700">{s.markets}</td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-success-700">{s.reporting}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-ink-500">{s.notReporting}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-full rounded-full bg-ink-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pct === 100 ? 'bg-success-500' : pct > 50 ? 'bg-brand-500' : pct > 0 ? 'bg-warning-500' : 'bg-ink-300'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold tabular-nums text-ink-700 w-10 text-right">
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ===================================================== Sub-components ===== */

function MetricCard({
  icon,
  label,
  value,
  progress,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  progress?: number;
  detail?: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-brand-50 p-2">{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-ink-900">{value}</p>
          {progress !== undefined && (
            <div className="mt-2 h-1 w-full rounded-full bg-ink-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-500"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          )}
          {detail && <p className="mt-1 text-xs text-ink-400">{detail}</p>}
        </div>
      </div>
    </div>
  );
}
