/**
 * Interactive Market Explorer — inspired by Afex markets page.
 *
 * Professional trading-style interface with:
 * - 4 KPI stat cards at top (Total Markets, Active Markets, Commodities, Observations)
 * - Interactive search and state filter (client-side, instant)
 * - Market table with trading-style columns: Name, State, Commodities, Latest Price, Status
 * - Grid/list view toggle
 * - Responsive layout
 *
 * All data from database — nothing fabricated.
 */

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { Market, Commodity, PriceObservation, State } from '@/types/domain';
import {
  IconSearch,
  IconMapPin,
  IconActivity,
  IconDatabase,
  IconLayers,
  IconGrid,
  IconList,
  IconCheck,
  IconAlertTriangle,
  IconX,
  IconArrowRight,
} from '@/components/ui/icons';
import { formatDate } from '@/lib/money';

export interface MarketExplorerData {
  markets: Market[];
  commodities: Commodity[];
  observations: PriceObservation[];
  states: State[];
}

interface MarketRow {
  id: number;
  name: string;
  slug: string;
  stateName: string;
  stateSlug: string;
  commodityCount: number;
  commodityNames: string[];
  observationCount: number;
  latestObservationAt: string | null;
  latestPrice: number | null;
  currencyCode: string;
  unitName: string | null;
  isActive: boolean;
  daysSinceLastCollection: number | null;
}

export function MarketExplorer({ data }: { data: MarketExplorerData }) {
  const { markets, commodities, observations, states } = data;

  const [search, setSearch] = useState('');
  const [activeState, setActiveState] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [sortBy, setSortBy] = useState<'name' | 'observations' | 'latest'>('name');

  // Compute market rows with aggregated data
  const marketRows = useMemo(() => {
    const byMarket = new Map<number, PriceObservation[]>();
    for (const obs of observations) {
      const list = byMarket.get(obs.marketId) ?? [];
      list.push(obs);
      byMarket.set(obs.marketId, list);
    }

    return markets.map((market) => {
      const obs = byMarket.get(market.id) ?? [];
      const commodityIds = new Set(obs.map((o) => o.commodityId));
      const commodityNames = commodities
        .filter((c) => commodityIds.has(c.id))
        .map((c) => c.name);

      const latest = obs.reduce<string | null>((acc, o) => {
        if (!acc || o.collectedAt > acc) return o.collectedAt;
        return acc;
      }, null);

      const latestObs = obs.find((o) => o.collectedAt === latest);
      const daysSinceLastCollection = latest
        ? Math.floor((Date.now() - new Date(latest).getTime()) / 86400000)
        : null;

      return {
        id: market.id,
        name: market.name,
        slug: market.slug,
        stateName: market.stateName ?? '',
        stateSlug: market.stateSlug ?? '',
        commodityCount: commodityIds.size,
        commodityNames: commodityNames.slice(0, 5),
        observationCount: obs.length,
        latestObservationAt: latest,
        latestPrice: latestObs?.normalizedAmount ?? latestObs?.reportedAmount ?? null,
        currencyCode: latestObs?.currencyCode ?? 'NGN',
        unitName: latestObs?.unitName ?? null,
        isActive: market.isActive,
        daysSinceLastCollection,
      } as MarketRow;
    });
  }, [markets, observations, commodities]);

  // Filter and sort
  const filtered = useMemo(() => {
    let result = marketRows;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.stateName.toLowerCase().includes(q) ||
          r.commodityNames.some((c) => c.toLowerCase().includes(q)),
      );
    }

    if (activeState !== null) {
      result = result.filter((r) => {
        const state = states.find((s) => s.slug === r.stateSlug);
        return state?.id === activeState;
      });
    }

    const sorted = [...result];
    switch (sortBy) {
      case 'observations':
        sorted.sort((a, b) => b.observationCount - a.observationCount);
        break;
      case 'latest':
        sorted.sort((a, b) => (b.latestObservationAt ?? '').localeCompare(a.latestObservationAt ?? ''));
        break;
      case 'name':
      default:
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return sorted;
  }, [marketRows, search, activeState, sortBy, states]);

  // KPI stats
  const stats = useMemo(() => {
    const activeMarkets = markets.filter((m) => m.isActive).length;
    const marketsWithPrices = marketRows.filter((r) => r.observationCount > 0).length;
    const totalCommodities = new Set(observations.map((o) => o.commodityId)).size;

    return {
      totalMarkets: markets.length,
      activeMarkets,
      marketsWithPrices,
      totalCommodities,
      totalObservations: observations.length,
    };
  }, [markets, marketRows, observations]);

  const activeFilterCount = (search ? 1 : 0) + (activeState !== null ? 1 : 0);

  const getFreshnessStatus = (daysAgo: number | null): { label: string; color: string; icon: React.ReactNode } => {
    if (daysAgo === null) return { label: 'No data', color: 'bg-ink-100 text-ink-500', icon: null };
    if (daysAgo <= 3) return { label: 'Fresh', color: 'bg-success-50 text-success-700', icon: <IconCheck className="size-3" /> };
    if (daysAgo <= 7) return { label: 'Recent', color: 'bg-warning-50 text-warning-700', icon: <IconActivity className="size-3" /> };
    return { label: 'Stale', color: 'bg-error-50 text-error-700', icon: <IconAlertTriangle className="size-3" /> };
  };

  return (
    <div className="space-y-6">
      {/* ─── KPI Stats Cards ─── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<IconMapPin className="size-5 text-brand-500" />}
          label="Total Markets"
          value={stats.totalMarkets.toLocaleString()}
          detail={`${stats.marketsWithPrices} with prices`}
          color="bg-brand-50"
        />
        <KpiCard
          icon={<IconActivity className="size-5 text-success-500" />}
          label="Active Markets"
          value={stats.activeMarkets.toLocaleString()}
          detail={`${stats.totalMarkets - stats.activeMarkets} inactive`}
          color="bg-success-50"
        />
        <KpiCard
          icon={<IconLayers className="size-5 text-info-500" />}
          label="Commodities Tracked"
          value={stats.totalCommodities.toLocaleString()}
          detail={`${commodities.length} in catalogue`}
          color="bg-info-50"
        />
        <KpiCard
          icon={<IconDatabase className="size-5 text-warning-500" />}
          label="Observations"
          value={stats.totalObservations.toLocaleString()}
          detail="Published prices"
          color="bg-warning-50"
        />
      </div>

      {/* ─── Search and Controls ─── */}
      <div className="card overflow-hidden">
        <div className="border-b border-ink-100 p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search markets, states, commodities…  (press /)"
                className="w-full rounded-xl border border-ink-200 bg-white py-2.5 pl-10 pr-10 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none"
              />
              {search ? (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                  aria-label="Clear search"
                >
                  <IconX className="size-4" />
                </button>
              ) : null}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setViewMode('table')}
                className={`rounded-lg p-2 transition-colors ${
                  viewMode === 'table' ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-ink-50'
                }`}
                aria-label="Table view"
              >
                <IconList className="size-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`rounded-lg p-2 transition-colors ${
                  viewMode === 'grid' ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-ink-50'
                }`}
                aria-label="Grid view"
              >
                <IconGrid className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* State filter chips */}
        <div className="border-b border-ink-100 px-4 py-2.5">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveState(null)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeState === null
                  ? 'bg-brand-600 text-white'
                  : 'bg-ink-50 text-ink-600 hover:bg-ink-100'
              }`}
            >
              All states ({markets.length})
            </button>
            {states.map((state) => {
              const count = markets.filter((m) => m.stateId === state.id).length;
              if (count === 0) return null;
              return (
                <button
                  key={state.id}
                  onClick={() => setActiveState(activeState === state.id ? null : state.id)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    activeState === state.id
                      ? 'bg-brand-600 text-white'
                      : 'bg-ink-50 text-ink-600 hover:bg-ink-100'
                  }`}
                >
                  {state.name} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Sort and filters */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-ink-500">Sort:</span>
            {(['name', 'observations', 'latest'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                  sortBy === s ? 'bg-ink-100 text-ink-800' : 'text-ink-500 hover:text-ink-700'
                }`}
              >
                {s === 'name' ? 'A–Z' : s === 'observations' ? 'Most obs.' : 'Latest'}
              </button>
            ))}
          </div>
          {activeFilterCount > 0 && (
            <div className="ml-auto flex items-center gap-1.5">
              <span className="text-xs text-ink-500">Filters:</span>
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700 hover:bg-brand-100"
                >
                  "{search}"
                  <IconX className="size-3" />
                </button>
              )}
              {activeState !== null && (
                <button
                  onClick={() => setActiveState(null)}
                  className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700 hover:bg-brand-100"
                >
                  {states.find((s) => s.id === activeState)?.name}
                  <IconX className="size-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Results ─── */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-ink-50">
            <IconSearch className="size-8 text-ink-400" />
          </div>
          <h3 className="text-lg font-semibold text-ink-900">No markets match your filters</h3>
          <p className="mt-2 text-sm text-ink-500">Try clearing some filters or searching differently.</p>
          <button
            onClick={() => {
              setSearch('');
              setActiveState(null);
            }}
            className="mt-4 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Clear all filters
          </button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-200 bg-ink-50/80">
                  <th className="px-4 py-3 text-left font-semibold text-ink-600">Market</th>
                  <th className="px-4 py-3 text-left font-semibold text-ink-600">State</th>
                  <th className="px-4 py-3 text-left font-semibold text-ink-600">Commodities</th>
                  <th className="px-4 py-3 text-right font-semibold text-ink-600">Observations</th>
                  <th className="px-4 py-3 text-right font-semibold text-ink-600">Latest Price</th>
                  <th className="px-4 py-3 text-left font-semibold text-ink-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filtered.map((row) => {
                  const freshness = getFreshnessStatus(row.daysSinceLastCollection);
                  return (
                    <tr key={row.id} className="transition-colors hover:bg-brand-50/30">
                      <td className="px-4 py-3">
                        <Link
                          href={`/markets/${row.slug}`}
                          className="font-semibold text-ink-900 hover:text-brand-700"
                        >
                          {row.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-ink-600">{row.stateName}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {row.commodityNames.slice(0, 3).map((c) => (
                            <span
                              key={c}
                              className="rounded-full bg-ink-50 px-2 py-0.5 text-[0.625rem] text-ink-600"
                            >
                              {c}
                            </span>
                          ))}
                          {row.commodityNames.length > 3 && (
                            <span className="text-[0.625rem] text-ink-400">
                              +{row.commodityNames.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold tabular-nums text-ink-900">{row.observationCount}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {row.latestPrice !== null ? (
                          <span className="font-semibold tabular-nums text-ink-900">
                            ₦{Math.round(row.latestPrice).toLocaleString('en-NG')}
                          </span>
                        ) : (
                          <span className="text-ink-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-medium ${freshness.color}`}>
                          {freshness.icon}
                          {freshness.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((row) => {
            const freshness = getFreshnessStatus(row.daysSinceLastCollection);
            return (
              <Link
                key={row.id}
                href={`/markets/${row.slug}`}
                className="card group p-5 transition-all hover:border-brand-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                      {row.stateName}
                    </p>
                    <h3 className="mt-1 text-lg font-bold text-ink-900 group-hover:text-brand-700">
                      {row.name}
                    </h3>
                  </div>
                  <IconArrowRight className="size-4 text-ink-400 group-hover:text-brand-600" />
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {row.commodityNames.slice(0, 4).map((c) => (
                    <span
                      key={c}
                      className="rounded-full bg-ink-50 px-2 py-0.5 text-[0.625rem] text-ink-600"
                    >
                      {c}
                    </span>
                  ))}
                  {row.commodityNames.length > 4 && (
                    <span className="text-[0.625rem] text-ink-400">
                      +{row.commodityNames.length - 4}
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3">
                  <div>
                    <p className="text-xs text-ink-500">Observations</p>
                    <p className="text-lg font-bold tabular-nums text-ink-900">{row.observationCount}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-ink-500">Latest</p>
                    {row.latestPrice !== null ? (
                      <p className="text-lg font-bold tabular-nums text-ink-900">
                        ₦{Math.round(row.latestPrice).toLocaleString('en-NG')}
                      </p>
                    ) : (
                      <p className="text-sm text-ink-400">No data</p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-medium ${freshness.color}`}>
                    {freshness.icon}
                    {freshness.label}
                  </span>
                  {row.latestObservationAt && (
                    <span className="text-[0.625rem] text-ink-400">
                      {row.daysSinceLastCollection === 0 ? 'Today' : `${row.daysSinceLastCollection}d ago`}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ─── Footer Stats ─── */}
      <div className="text-center text-sm text-ink-500">
        Showing <span className="font-semibold text-ink-900">{filtered.length}</span> of{' '}
        <span className="font-semibold text-ink-900">{markets.length}</span> markets
      </div>
    </div>
  );
}

/* ===================================================== Sub-components ===== */

function KpiCard({
  icon,
  label,
  value,
  detail,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
  color: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start gap-3">
        <div className={`rounded-lg ${color} p-2`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-ink-900">{value}</p>
          {detail && <p className="mt-1 text-xs text-ink-400">{detail}</p>}
        </div>
      </div>
    </div>
  );
}
