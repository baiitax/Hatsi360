/**
 * Interactive Price Explorer — client-side enhanced price directory.
 *
 * Replaces the old form-based filter with a reactive, instant-search
 * experience. The server still provides the full dataset on first load; all
 * filtering, sorting, and pagination happen in the browser.
 *
 * Every figure is real — pulled from published observations on the server —
 * but the UI reacts instantly to user input.
 */

'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { formatDate, formatMoney } from '@/lib/money';
import { PRICE_TYPE_META } from '@/types/domain';
import type { PriceObservation } from '@/types/domain';
import type { Commodity, CommodityCategory, Market, State } from '@/types/domain';
import {
  IconSearch,
  IconFilter,
  IconX,
  IconArrowDown,
  IconArrowUp,
  IconChevronLeft,
  IconChevronRight,
  IconTrendingUp,
  IconTrendingDown,
  IconActivity,
  IconDatabase,
  IconMapPin,
  IconCalendar,
} from '@/components/ui/icons';
import { PriceExplorerChart } from './PriceExplorerChart';
import { PriceHeatmap } from './PriceHeatmap';

export interface PriceExplorerServerData {
  observations: PriceObservation[];
  commodities: Commodity[];
  categories: CommodityCategory[];
  markets: Market[];
  states: State[];
  totalPublished: number;
  totalCommodities: number;
  totalMarkets: number;
  latestCollectedAt: string | null;
  oldestCollectedAt: string | null;
}

type SortKey = 'recent' | 'price_asc' | 'price_desc' | 'commodity' | 'market';

interface FilterState {
  search: string;
  commodityId: number | null;
  categoryId: number | null;
  stateId: number | null;
  marketId: number | null;
  priceType: string | null;
  from: string;
  to: string;
  sort: SortKey;
}

const PAGE_SIZE = 20;

export function PriceExplorer({ data }: { data: PriceExplorerServerData }) {
  const { observations, commodities, categories, markets, states, totalPublished, totalCommodities, totalMarkets, latestCollectedAt } = data;

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    commodityId: null,
    categoryId: null,
    stateId: null,
    marketId: null,
    priceType: null,
    from: '',
    to: '',
    sort: 'recent',
  });

  const [page, setPage] = useState(1);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: / to focus search
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  // Filtered observations
  const filtered = useMemo(() => {
    let result = observations;

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (o) =>
          o.commodityName?.toLowerCase().includes(q) ||
          o.marketName?.toLowerCase().includes(q) ||
          o.stateName?.toLowerCase().includes(q),
      );
    }

    if (filters.commodityId !== null) {
      result = result.filter((o) => o.commodityId === filters.commodityId);
    }
    if (filters.categoryId !== null) {
      const commodityIds = new Set(
        commodities.filter((c) => c.categoryId === filters.categoryId).map((c) => c.id),
      );
      result = result.filter((o) => commodityIds.has(o.commodityId));
    }
    if (filters.stateId !== null) {
      const stateSlug = states.find((s) => s.id === filters.stateId)?.slug;
      if (stateSlug) {
        result = result.filter((o) => o.stateSlug === stateSlug);
      }
    }
    if (filters.marketId !== null) {
      result = result.filter((o) => o.marketId === filters.marketId);
    }
    if (filters.priceType !== null) {
      result = result.filter((o) => o.priceType === filters.priceType);
    }
    if (filters.from) {
      result = result.filter((o) => o.collectedAt >= `${filters.from}T00:00:00.000Z`);
    }
    if (filters.to) {
      result = result.filter((o) => o.collectedAt <= `${filters.to}T23:59:59.999Z`);
    }

    // Sort
    const sorted = [...result];
    switch (filters.sort) {
      case 'price_asc':
        sorted.sort((a, b) => (a.normalizedAmount ?? a.reportedAmount ?? 0) - (b.normalizedAmount ?? b.reportedAmount ?? 0));
        break;
      case 'price_desc':
        sorted.sort((a, b) => (b.normalizedAmount ?? b.reportedAmount ?? 0) - (a.normalizedAmount ?? a.reportedAmount ?? 0));
        break;
      case 'commodity':
        sorted.sort((a, b) => (a.commodityName ?? '').localeCompare(b.commodityName ?? ''));
        break;
      case 'market':
        sorted.sort((a, b) => (a.marketName ?? '').localeCompare(b.marketName ?? ''));
        break;
      case 'recent':
      default:
        sorted.sort((a, b) => b.collectedAt.localeCompare(a.collectedAt));
        break;
    }

    return sorted;
  }, [observations, filters, commodities]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Summary stats
  const stats = useMemo(() => {
    const uniqueCommodities = new Set(filtered.map((o) => o.commodityId)).size;
    const uniqueMarkets = new Set(filtered.map((o) => o.marketId)).size;
    const avgPrice =
      filtered.length > 0
        ? filtered.reduce((sum, o) => sum + (o.normalizedAmount ?? o.reportedAmount ?? 0), 0) / filtered.length
        : 0;
    return { uniqueCommodities, uniqueMarkets, avgPrice };
  }, [filtered]);

  const activeFilterCount = [
    filters.commodityId !== null,
    filters.categoryId !== null,
    filters.stateId !== null,
    filters.marketId !== null,
    filters.priceType !== null,
    filters.from !== '',
    filters.to !== '',
    filters.search !== '',
  ].filter(Boolean).length;

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      commodityId: null,
      categoryId: null,
      stateId: null,
      marketId: null,
      priceType: null,
      from: '',
      to: '',
      sort: 'recent',
    });
    setPage(1);
  }, []);

  const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const commodityById = useMemo(() => new Map(commodities.map((c) => [c.id, c])), [commodities]);

  return (
    <div className="space-y-6">
      {/* ─── Summary Dashboard ─── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryStat
          icon={<IconDatabase className="size-4 text-brand-500" />}
          label="Observations"
          value={filtered.length.toLocaleString()}
          detail={filters.search || activeFilterCount > 0 ? `of ${totalPublished} total` : 'published total'}
        />
        <SummaryStat
          icon={<IconActivity className="size-4 text-brand-500" />}
          label="Commodities"
          value={String(stats.uniqueCommodities)}
          detail={filters.categoryId !== null ? `in category` : `of ${totalCommodities} total`}
        />
        <SummaryStat
          icon={<IconMapPin className="size-4 text-brand-500" />}
          label="Markets"
          value={String(stats.uniqueMarkets)}
          detail={`of ${totalMarkets} total`}
        />
        <SummaryStat
          icon={<IconCalendar className="size-4 text-brand-500" />}
          label="Latest data"
          value={latestCollectedAt ? formatDate(latestCollectedAt) : 'None'}
          detail="Most recent collection"
        />
      </div>

      {/* ─── Search and Quick Filters ─── */}
      <div className="card overflow-hidden">
        {/* Search bar */}
        <div className="border-b border-ink-100 p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
              <input
                ref={searchRef}
                type="search"
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                placeholder="Search commodities, markets, states…  (press /)"
                className="w-full rounded-xl border border-ink-200 bg-white py-2.5 pl-10 pr-10 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/20"
              />
              {filters.search ? (
                <button
                  onClick={() => updateFilter('search', '')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                  aria-label="Clear search"
                >
                  <IconX className="size-4" />
                </button>
              ) : null}
            </div>
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="relative inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:border-brand-400 lg:hidden"
            >
              <IconFilter className="size-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-brand-600 text-[0.625rem] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="hidden items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-medium text-ink-600 transition-colors hover:border-error-300 hover:text-error-600 lg:inline-flex"
              >
                <IconX className="size-3.5" />
                Clear ({activeFilterCount})
              </button>
            )}
          </div>
        </div>

        {/* Quick commodity chips */}
        <div className="border-b border-ink-100 px-4 py-2.5">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <button
              onClick={() => updateFilter('commodityId', null)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filters.commodityId === null
                  ? 'bg-brand-600 text-white'
                  : 'bg-ink-50 text-ink-600 hover:bg-ink-100'
              }`}
            >
              All
            </button>
            {commodities.slice(0, 15).map((c) => (
              <button
                key={c.id}
                onClick={() => updateFilter('commodityId', filters.commodityId === c.id ? null : c.id)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filters.commodityId === c.id
                    ? 'bg-brand-600 text-white'
                    : 'bg-ink-50 text-ink-600 hover:bg-ink-100'
                }`}
              >
                {c.name}
              </button>
            ))}
            {commodities.length > 15 && (
              <span className="shrink-0 text-xs text-ink-400">
                +{commodities.length - 15} more
              </span>
            )}
          </div>
        </div>

        {/* Filter panel */}
        <div className={`p-4 ${showMobileFilters ? 'block' : 'hidden lg:block'}`}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            <FilterSelect
              label="Category"
              value={filters.categoryId}
              options={[
                { value: null, label: 'All categories' },
                ...categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
              onChange={(v) => updateFilter('categoryId', v)}
            />
            <FilterSelect
              label="State"
              value={filters.stateId}
              options={[
                { value: null, label: 'All states' },
                ...states.map((s) => ({ value: s.id, label: s.name })),
              ]}
              onChange={(v) => updateFilter('stateId', v)}
            />
            <FilterSelect
              label="Market"
              value={filters.marketId}
              options={[
                { value: null, label: 'All markets' },
                ...markets.map((m) => ({ value: m.id, label: m.name })),
              ]}
              onChange={(v) => updateFilter('marketId', v)}
            />
            <FilterSelect
              label="Price type"
              value={filters.priceType}
              options={[
                { value: null, label: 'All price types' },
                ...Object.values(PRICE_TYPE_META).map((t) => ({ value: t.code, label: t.label })),
              ]}
              onChange={(v) => updateFilter('priceType', v)}
            />
            <FilterSelect
              label="Sort by"
              value={filters.sort}
              options={[
                { value: 'recent', label: 'Most recent' },
                { value: 'price_asc', label: 'Price: low → high' },
                { value: 'price_desc', label: 'Price: high → low' },
                { value: 'commodity', label: 'Commodity A–Z' },
                { value: 'market', label: 'Market A–Z' },
              ]}
              onChange={(v) => updateFilter('sort', v)}
            />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <FilterDateInput
              label="From"
              value={filters.from}
              onChange={(v) => updateFilter('from', v)}
            />
            <FilterDateInput
              label="To"
              value={filters.to}
              onChange={(v) => updateFilter('to', v)}
            />
          </div>
        </div>
      </div>

      {/* ─── Active filter pills ─── */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-ink-500">Active:</span>
          {filters.search && (
            <FilterPill label={`"${filters.search}"`} onRemove={() => updateFilter('search', '')} />
          )}
          {filters.commodityId !== null && (
            <FilterPill
              label={commodityById.get(filters.commodityId)?.name ?? 'Commodity'}
              onRemove={() => updateFilter('commodityId', null)}
            />
          )}
          {filters.categoryId !== null && (
            <FilterPill
              label={categories.find((c) => c.id === filters.categoryId)?.name ?? 'Category'}
              onRemove={() => updateFilter('categoryId', null)}
            />
          )}
          {filters.stateId !== null && (
            <FilterPill
              label={states.find((s) => s.id === filters.stateId)?.name ?? 'State'}
              onRemove={() => updateFilter('stateId', null)}
            />
          )}
          {filters.marketId !== null && (
            <FilterPill
              label={markets.find((m) => m.id === filters.marketId)?.name ?? 'Market'}
              onRemove={() => updateFilter('marketId', null)}
            />
          )}
          {filters.priceType !== null && (
            <FilterPill
              label={PRICE_TYPE_META[filters.priceType as keyof typeof PRICE_TYPE_META]?.label ?? filters.priceType}
              onRemove={() => updateFilter('priceType', null)}
            />
          )}
          {filters.from && <FilterPill label={`From ${filters.from}`} onRemove={() => updateFilter('from', '')} />}
          {filters.to && <FilterPill label={`To ${filters.to}`} onRemove={() => updateFilter('to', '')} />}
        </div>
      )}

      {/* ─── Results count ─── */}
      <div className="flex items-center justify-between text-sm">
        <p className="text-ink-500">
          {filtered.length} observation{filtered.length === 1 ? '' : 's'}
          {currentPage > 1 || totalPages > 1 ? ` · page ${currentPage} of ${totalPages}` : ''}
        </p>
      </div>

      {/* ─── Price Heatmap ─── */}
      {filtered.length > 0 && (
        <PriceHeatmap observations={filtered} />
      )}

      {/* ─── Price Chart ─── */}
      {filtered.length >= 2 && (
        <PriceExplorerChart observations={filtered} />
      )}

      {/* ─── Results Table ─── */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-ink-50">
            <IconSearch className="size-8 text-ink-400" />
          </div>
          <h3 className="text-lg font-semibold text-ink-900">No observations match your filters</h3>
          <p className="mt-2 text-sm text-ink-500">
            Try clearing some filters or searching for a different commodity.
          </p>
          <button
            onClick={clearFilters}
            className="mt-4 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block">
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink-200 bg-ink-50/80">
                      <th className="px-4 py-3 text-left font-semibold text-ink-600">Commodity</th>
                      <th className="px-4 py-3 text-left font-semibold text-ink-600">Market</th>
                      <th className="px-4 py-3 text-right font-semibold text-ink-600">Price</th>
                      <th className="px-4 py-3 text-left font-semibold text-ink-600">Type</th>
                      <th className="px-4 py-3 text-left font-semibold text-ink-600">Collected</th>
                      <th className="px-4 py-3 text-left font-semibold text-ink-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {pageItems.map((obs) => {
                      const type = PRICE_TYPE_META[obs.priceType];
                      return (
                        <tr
                          key={obs.id}
                          className="transition-colors hover:bg-brand-50/30"
                        >
                          <td className="px-4 py-3">
                            <Link
                              href={`/prices/${obs.commoditySlug}`}
                              className="font-semibold text-ink-900 hover:text-brand-700"
                            >
                              {obs.commodityName}
                            </Link>
                            {obs.gradeName && (
                              <p className="mt-0.5 text-xs text-ink-400">{obs.gradeName}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/markets/${obs.marketSlug}`}
                              className="font-medium text-ink-700 hover:text-brand-700"
                            >
                              {obs.marketName}
                            </Link>
                            <p className="mt-0.5 text-xs text-ink-400">{obs.stateName}</p>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-bold tabular-nums text-ink-900">
                              ₦{(obs.normalizedAmount ?? obs.reportedAmount ?? 0).toLocaleString('en-NG')}
                            </span>
                            {obs.unitName && (
                              <span className="ml-1 text-xs text-ink-400">/{obs.unitName}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="rounded-full bg-ink-50 px-2 py-0.5 text-xs text-ink-600"
                              title={type.description}
                            >
                              {type.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-ink-600">
                            {formatDate(obs.collectedAt)}
                          </td>
                          <td className="px-4 py-3">
                            <VerificationPill status={obs.verificationStatus} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-2">
            {pageItems.map((obs) => {
              const type = PRICE_TYPE_META[obs.priceType];
              return (
                <Link
                  key={obs.id}
                  href={`/prices/${obs.commoditySlug}`}
                  className="card flex items-center gap-4 p-4 transition-all hover:shadow-md"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink-900">{obs.commodityName}</p>
                    <p className="mt-0.5 truncate text-xs text-ink-500">
                      {obs.marketName} · {obs.stateName}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="rounded-full bg-ink-50 px-2 py-0.5 text-[0.625rem] text-ink-500">
                        {type.label}
                      </span>
                      <VerificationPill status={obs.verificationStatus} />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-bold tabular-nums text-ink-900">
                      ₦{(obs.normalizedAmount ?? obs.reportedAmount ?? 0).toLocaleString('en-NG')}
                    </p>
                    <p className="text-xs text-ink-400">
                      {obs.unitName ? `/${obs.unitName}` : ''} · {formatDate(obs.collectedAt)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="rounded-lg border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 transition-colors hover:border-brand-400 disabled:opacity-40"
              >
                <IconChevronLeft className="size-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + i;
                if (pageNum > totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      pageNum === currentPage
                        ? 'bg-brand-600 text-white'
                        : 'border border-ink-200 text-ink-700 hover:border-brand-400'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="rounded-lg border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 transition-colors hover:border-brand-400 disabled:opacity-40"
              >
                <IconChevronRight className="size-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ===================================================== Sub-components ===== */

function SummaryStat({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <div className="card flex items-start gap-3 p-4">
      <div className="rounded-lg bg-brand-50 p-2">{icon}</div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
        <p className="mt-0.5 text-2xl font-bold tabular-nums text-ink-900">{value}</p>
        <p className="text-xs text-ink-400">{detail}</p>
      </div>
    </div>
  );
}

function FilterSelect<T extends string | number | null>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-[0.6875rem] font-semibold uppercase tracking-wide text-ink-500">
        {label}
      </label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? (isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value)) as T : null as T)}
        className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 focus:border-brand-500 focus:outline-none"
      >
        {options.map((opt) => (
          <option key={String(opt.value)} value={opt.value ?? ''}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function FilterDateInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-[0.6875rem] font-semibold uppercase tracking-wide text-ink-500">
        {label}
      </label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 focus:border-brand-500 focus:outline-none"
      />
    </div>
  );
}

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
      {label}
      <button onClick={onRemove} className="ml-0.5 text-brand-500 hover:text-brand-800" aria-label={`Remove filter: ${label}`}>
        <IconX className="size-3" />
      </button>
    </span>
  );
}

function VerificationPill({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; dot: string }> = {
    verified: { bg: 'bg-success-50', text: 'text-success-700', dot: 'bg-success-500' },
    pending: { bg: 'bg-warning-50', text: 'text-warning-700', dot: 'bg-warning-500' },
    rejected: { bg: 'bg-error-50', text: 'text-error-700', dot: 'bg-error-500' },
  };
  const c = config[status] ?? { bg: 'bg-ink-50', text: 'text-ink-600', dot: 'bg-ink-400' };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ${c.bg} ${c.text}`}>
      <span className={`size-1.5 rounded-full ${c.dot}`} />
      {status}
    </span>
  );
}
