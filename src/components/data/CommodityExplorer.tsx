/**
 * Interactive Commodity Explorer — client-side commodity directory.
 *
 * Replaces the old server-rendered paginated directory with an instant,
 * reactive interface. Features include:
 * - Instant text search
 * - Category quick-filter chips
 * - Grid/list view toggle
 * - Freshness and observation counts update live
 * - Responsive: cards on mobile, grid on desktop
 *
 * All data from the server on first load; all filtering in the browser.
 */

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { Commodity, CommodityCategory } from '@/types/domain';
import type { CommodityFreshness } from '@/lib/trade/queries';
import {
  IconSearch,
  IconGrid,
  IconList,
  IconArrowRight,
  IconCheck,
  IconClock,
  IconAlertTriangle,
  IconX,
} from '@/components/ui/icons';

export interface CommodityExplorerData {
  commodities: Commodity[];
  categories: CommodityCategory[];
  freshness: CommodityFreshness[];
}

type FreshnessState = 'fresh' | 'recent' | 'stale' | 'delayed' | 'today' | 'unavailable';
type ViewMode = 'grid' | 'list';

export function CommodityExplorer({ data }: { data: CommodityExplorerData }) {
  const { commodities, categories, freshness } = data;
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'observations' | 'freshness'>('name');

  const freshnessById = useMemo(() => new Map(freshness.map((f) => [f.commodityId, f])), [freshness]);

  const filtered = useMemo(() => {
    let result = commodities;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.categoryName?.toLowerCase().includes(q) ||
          c.slug.toLowerCase().includes(q),
      );
    }

    if (activeCategory !== null) {
      result = result.filter((c) => c.categoryId === activeCategory);
    }

    // Sort
    const sorted = [...result];
    switch (sortBy) {
      case 'observations':
        sorted.sort((a, b) => (b.observationCount ?? 0) - (a.observationCount ?? 0));
        break;
      case 'freshness':
        sorted.sort((a, b) => {
          const aFresh = freshnessById.get(a.id);
          const bFresh = freshnessById.get(b.id);
          if (!aFresh && !bFresh) return 0;
          if (!aFresh) return 1;
          if (!bFresh) return -1;
          return (bFresh.collectedAt ?? '').localeCompare(aFresh.collectedAt ?? '');
        });
        break;
      case 'name':
      default:
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return sorted;
  }, [commodities, search, activeCategory, sortBy, freshnessById]);

  const activeFilterCount = (search ? 1 : 0) + (activeCategory !== null ? 1 : 0);

  const getFreshnessState = (commodity: Commodity): FreshnessState => {
    const entry = freshnessById.get(commodity.id);
    if (!entry) return 'unavailable';
    if (entry.state === 'recently_updated' || entry.state === 'latest_verified') return 'fresh';
    if (entry.state === 'stale') return 'stale';
    if (entry.state === 'delayed') return 'delayed';
    return 'today';
  };

  const formatFreshness = (state: FreshnessState): { label: string; color: string; icon: React.ReactNode } => {
    switch (state) {
      case 'fresh':
      case 'today':
        return { label: 'Fresh', color: 'bg-success-50 text-success-700', icon: <IconCheck className="size-3" /> };
      case 'recent':
      case 'delayed':
        return { label: 'Recent', color: 'bg-warning-50 text-warning-700', icon: <IconClock className="size-3" /> };
      case 'stale':
        return { label: 'Stale', color: 'bg-error-50 text-error-700', icon: <IconAlertTriangle className="size-3" /> };
      default:
        return { label: 'No data', color: 'bg-ink-50 text-ink-500', icon: null };
    }
  };

  const stats = useMemo(() => ({
    total: commodities.length,
    withPrices: commodities.filter((c) => (c.observationCount ?? 0) > 0).length,
    filtered: filtered.length,
    categories: categories.length,
  }), [commodities, filtered, categories]);

  return (
    <div className="space-y-5">
      {/* ─── Summary Cards ─── */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs text-ink-500">Total commodities</p>
          <p className="mt-1 text-2xl font-bold text-ink-900">{stats.total}</p>
          <p className="text-xs text-ink-400">{stats.withPrices} with prices</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-500">Categories</p>
          <p className="mt-1 text-2xl font-bold text-ink-900">{stats.categories}</p>
          <p className="text-xs text-ink-400">Across the catalogue</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-500">Showing</p>
          <p className="mt-1 text-2xl font-bold text-ink-900">{stats.filtered}</p>
          <p className="text-xs text-ink-400">{activeFilterCount > 0 ? 'filtered results' : 'all commodities'}</p>
        </div>
      </div>

      {/* ─── Search + Controls ─── */}
      <div className="card overflow-hidden">
        <div className="border-b border-ink-100 p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search commodities, categories…  (press /)"
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
                onClick={() => setViewMode('grid')}
                className={`rounded-lg p-2 transition-colors ${
                  viewMode === 'grid' ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-ink-50'
                }`}
                aria-label="Grid view"
              >
                <IconGrid className="size-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`rounded-lg p-2 transition-colors ${
                  viewMode === 'list' ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-ink-50'
                }`}
                aria-label="List view"
              >
                <IconList className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Category chips */}
        <div className="border-b border-ink-100 px-4 py-2.5">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveCategory(null)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeCategory === null
                  ? 'bg-brand-600 text-white'
                  : 'bg-ink-50 text-ink-600 hover:bg-ink-100'
              }`}
            >
              All ({commodities.length})
            </button>
            {categories.map((cat) => {
              const count = commodities.filter((c) => c.categoryId === cat.id).length;
              if (count === 0) return null;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    activeCategory === cat.id
                      ? 'bg-brand-600 text-white'
                      : 'bg-ink-50 text-ink-600 hover:bg-ink-100'
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Sort + active filters */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-ink-500">Sort:</span>
            {(['name', 'observations', 'freshness'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                  sortBy === s ? 'bg-ink-100 text-ink-800' : 'text-ink-500 hover:text-ink-700'
                }`}
              >
                {s === 'name' ? 'A–Z' : s === 'observations' ? 'Most obs.' : 'Freshness'}
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
              {activeCategory !== null && (
                <button
                  onClick={() => setActiveCategory(null)}
                  className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700 hover:bg-brand-100"
                >
                  {categories.find((c) => c.id === activeCategory)?.name}
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
          <h3 className="text-lg font-semibold text-ink-900">No commodities match your filters</h3>
          <p className="mt-2 text-sm text-ink-500">Try clearing some filters or searching differently.</p>
          <button
            onClick={() => {
              setSearch('');
              setActiveCategory(null);
            }}
            className="mt-4 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Clear all filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((commodity) => {
            const state = getFreshnessState(commodity);
            const freshness = formatFreshness(state);
            const entry = freshnessById.get(commodity.id);
            const observed = (commodity.observationCount ?? 0) > 0;
            return (
              <Link
                key={commodity.id}
                href={`/commodities/${commodity.slug}`}
                className="card group flex h-full flex-col gap-2 p-4 transition-all hover:border-brand-300 hover:shadow-md"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-[0.9375rem] font-semibold text-ink-900 group-hover:text-brand-700">
                    {commodity.name}
                  </h3>
                  {observed && <IconArrowRight className="size-3.5 text-ink-400 group-hover:text-brand-600" />}
                </div>
                <p className="text-xs text-ink-500">
                  {commodity.categoryName ?? 'Uncategorised'}
                  {commodity.marketCount ? ` · ${commodity.marketCount} market${commodity.marketCount === 1 ? '' : 's'}` : ''}
                </p>
                <div className="mt-auto flex items-center justify-between gap-2 border-t border-ink-100 pt-2">
                  <span className="text-xs text-ink-500">
                    {observed ? (
                      <>
                        <span className="font-semibold text-ink-800">{commodity.observationCount}</span>{' '}
                        obs.
                      </>
                    ) : (
                      <span className="text-ink-400">No prices yet</span>
                    )}
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-medium ${freshness.color}`}>
                    {freshness.icon}
                    {freshness.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-200 bg-ink-50/80">
                  <th className="px-4 py-3 text-left font-semibold text-ink-600">Commodity</th>
                  <th className="px-4 py-3 text-left font-semibold text-ink-600">Category</th>
                  <th className="px-4 py-3 text-right font-semibold text-ink-600">Markets</th>
                  <th className="px-4 py-3 text-right font-semibold text-ink-600">Observations</th>
                  <th className="px-4 py-3 text-left font-semibold text-ink-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filtered.map((commodity) => {
                  const state = getFreshnessState(commodity);
                  const freshness = formatFreshness(state);
                  const observed = (commodity.observationCount ?? 0) > 0;
                  return (
                    <tr key={commodity.id} className="transition-colors hover:bg-brand-50/30">
                      <td className="px-4 py-3">
                        <Link
                          href={`/commodities/${commodity.slug}`}
                          className="font-semibold text-ink-900 hover:text-brand-700"
                        >
                          {commodity.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-ink-600">{commodity.categoryName ?? '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-ink-700">{commodity.marketCount ?? 0}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold tabular-nums ${observed ? 'text-ink-900' : 'text-ink-400'}`}>
                          {commodity.observationCount ?? 0}
                        </span>
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
      )}
    </div>
  );
}
