/**
 * Interactive Compare Explorer — client-side market comparison tool.
 *
 * Replaces the old form-based approach with an instant, reactive comparison
 * interface. Users pick a commodity and price type, and see an interactive
 * bar chart comparing prices across markets, plus a responsive data table.
 *
 * All data is real — from published observations. Nothing fabricated.
 */

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { formatMoney, formatDate } from '@/lib/money';
import { PRICE_TYPE_META, type PriceType } from '@/types/domain';
import type { Commodity, PriceObservation } from '@/types/domain';
import {
  IconSearch,
  IconArrowRight,
  IconBarChart,
  IconTable,
  IconChevronDown,
} from '@/components/ui/icons';

export interface CompareServerData {
  commodities: Commodity[];
  observations: PriceObservation[];
}

interface MarketSummary {
  marketId: number;
  marketName: string;
  marketSlug: string;
  stateName: string;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  latestPrice: number;
  observationCount: number;
  currencyCode: string;
  priceType: string;
  unitName: string | null;
  unitAmbiguous: boolean;
  isStale: boolean;
  latestCollectedAt: string;
}

function summariseByMarket(observations: PriceObservation[]): MarketSummary[] {
  const byMarket = new Map<number, PriceObservation[]>();
  for (const obs of observations) {
    const list = byMarket.get(obs.marketId) ?? [];
    list.push(obs);
    byMarket.set(obs.marketId, list);
  }

  return [...byMarket.entries()]
    .map(([marketId, obsList]) => {
      const sorted = [...obsList].sort((a, b) =>
        new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime(),
      );
      const prices = obsList
        .map((o) => o.normalizedAmount ?? o.reportedAmount ?? 0)
        .filter((p) => p > 0)
        .sort((a, b) => a - b);

      const median =
        prices.length > 0
          ? prices.length % 2 === 0
            ? (prices[prices.length / 2 - 1]! + prices[prices.length / 2]!) / 2
            : prices[Math.floor(prices.length / 2)]!
          : 0;

      const latest = sorted[0];
      return {
        marketId,
        marketName: latest?.marketName ?? `Market ${marketId}`,
        marketSlug: latest?.marketSlug ?? '',
        stateName: latest?.stateName ?? '',
        medianPrice: median,
        minPrice: prices[0] ?? 0,
        maxPrice: prices[prices.length - 1] ?? 0,
        latestPrice: latest?.normalizedAmount ?? latest?.reportedAmount ?? 0,
        observationCount: obsList.length,
        currencyCode: latest?.currencyCode ?? 'NGN',
        priceType: latest?.priceType ?? 'wholesale',
        unitName: latest?.unitName ?? null,
        unitAmbiguous: obsList.some((o) => o.unitIsSpecific === false),
        isStale: latest
          ? Date.now() - new Date(latest.collectedAt).getTime() > 7 * 86400000
          : false,
        latestCollectedAt: latest?.collectedAt ?? '',
      };
    })
    .sort((a, b) => b.medianPrice - a.medianPrice);
}

export function CompareExplorer({ data }: { data: CompareServerData }) {
  const { commodities, observations } = data;
  const [selectedSlug, setSelectedSlug] = useState<string>(() => {
    const firstWithPrices = commodities.find((c) => (c.observationCount ?? 0) > 0);
    return firstWithPrices?.slug ?? commodities[0]?.slug ?? '';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  const selectedCommodity = commodities.find((c) => c.slug === selectedSlug) ?? null;

  const commodityObservations = useMemo(() => {
    if (!selectedCommodity) return [];
    return observations.filter((o) => o.commodityId === selectedCommodity.id);
  }, [selectedCommodity, observations]);

  const availablePriceTypes = useMemo(() => {
    return Array.from(new Set(commodityObservations.map((o) => o.priceType)));
  }, [commodityObservations]);

  const [selectedPriceType, setSelectedPriceType] = useState<string>(
    availablePriceTypes[0] ?? '',
  );

  const typedObservations = useMemo(() => {
    if (!selectedPriceType) return commodityObservations;
    return commodityObservations.filter((o) => o.priceType === selectedPriceType);
  }, [commodityObservations, selectedPriceType]);

  const summaries = useMemo(() => summariseByMarket(typedObservations), [typedObservations]);

  const filteredSummaries = useMemo(() => {
    if (!searchQuery) return summaries;
    const q = searchQuery.toLowerCase();
    return summaries.filter(
      (s) =>
        s.marketName.toLowerCase().includes(q) ||
        s.stateName.toLowerCase().includes(q),
    );
  }, [summaries, searchQuery]);

  const maxPrice = filteredSummaries.length > 0 ? Math.max(...filteredSummaries.map((s) => s.medianPrice)) : 1;
  const minPrice = filteredSummaries.length > 0 ? Math.min(...filteredSummaries.map((s) => s.medianPrice)) : 0;
  const priceRange = maxPrice - minPrice || 1;

  const commoditiesWithPrices = commodities.filter((c) => (c.observationCount ?? 0) > 0);
  const commoditiesWithoutPrices = commodities.filter((c) => (c.observationCount ?? 0) === 0);

  return (
    <div className="space-y-6">
      {/* ─── Commodity Selector ─── */}
      <div className="card overflow-hidden">
        <div className="border-b border-ink-100 p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
              <select
                value={selectedSlug}
                onChange={(e) => {
                  setSelectedSlug(e.target.value);
                  setSelectedPriceType('');
                }}
                className="w-full rounded-xl border border-ink-200 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-ink-900 focus:border-brand-500 focus:outline-none"
              >
                <option value="">Choose a commodity…</option>
                <optgroup label="With published prices">
                  {commoditiesWithPrices.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name} ({c.observationCount} obs.)
                    </option>
                  ))}
                </optgroup>
                {commoditiesWithoutPrices.length > 0 && (
                  <optgroup label="No prices yet">
                    {commoditiesWithoutPrices.map((c) => (
                      <option key={c.id} value={c.slug} disabled>
                        {c.name} — no prices yet
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Price type selector */}
        {availablePriceTypes.length > 1 && (
          <div className="border-b border-ink-100 px-4 py-2.5">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="shrink-0 text-xs text-ink-500">Price type:</span>
              {availablePriceTypes.map((pt) => {
                const meta = PRICE_TYPE_META[pt as keyof typeof PRICE_TYPE_META];
                return (
                  <button
                    key={pt}
                    onClick={() => setSelectedPriceType(pt)}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      selectedPriceType === pt
                        ? 'bg-brand-600 text-white'
                        : 'bg-ink-50 text-ink-600 hover:bg-ink-100'
                    }`}
                  >
                    {meta?.label ?? pt}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* View toggle */}
        <div className="flex items-center justify-between px-4 py-2.5">
          <p className="text-xs text-ink-500">
            {selectedCommodity ? (
              <>
                <span className="font-semibold text-ink-900">{selectedCommodity.name}</span> compared across{' '}
                {filteredSummaries.length} market{filteredSummaries.length === 1 ? '' : 's'}
              </>
            ) : (
              'Select a commodity to compare'
            )}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode('chart')}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                viewMode === 'chart' ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-ink-50'
              }`}
            >
              <IconBarChart className="size-3.5" />
              Chart
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                viewMode === 'table' ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-ink-50'
              }`}
            >
              <IconTable className="size-3.5" />
              Table
            </button>
          </div>
        </div>
      </div>

      {/* ─── Price type description ─── */}
      {selectedPriceType && PRICE_TYPE_META[selectedPriceType as keyof typeof PRICE_TYPE_META] && (
        <div className="rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-600">
          <span className="font-semibold text-ink-900">
            {PRICE_TYPE_META[selectedPriceType as keyof typeof PRICE_TYPE_META].label}
          </span>{' '}
          —{' '}
          {PRICE_TYPE_META[selectedPriceType as keyof typeof PRICE_TYPE_META].description}
        </div>
      )}

      {/* ─── Content ─── */}
      {!selectedCommodity || commodityObservations.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-ink-50">
            <IconBarChart className="size-8 text-ink-400" />
          </div>
          <h3 className="text-lg font-semibold text-ink-900">No observations to compare</h3>
          <p className="mt-2 text-sm text-ink-500">
            This commodity has no published price observations yet.
          </p>
          <Link
            href="/prices"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Browse the price directory
            <IconArrowRight className="size-3.5" />
          </Link>
        </div>
      ) : viewMode === 'chart' ? (
        <CompareBarChart
          summaries={filteredSummaries}
          maxPrice={maxPrice}
          minPrice={minPrice}
          priceRange={priceRange}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          commodityName={selectedCommodity?.name ?? ''}
        />
      ) : (
        <CompareTable
          summaries={filteredSummaries}
          commodityName={selectedCommodity?.name ?? ''}
        />
      )}
    </div>
  );
}

/* ==================================================== Bar Chart View ====== */

function CompareBarChart({
  summaries,
  maxPrice,
  minPrice,
  priceRange,
  searchQuery,
  onSearchChange,
  commodityName,
}: {
  summaries: MarketSummary[];
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  commodityName: string;
}) {
  if (summaries.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-ink-500">No markets match your search.</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-ink-100 px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <IconSearch className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Filter markets…"
              className="w-full rounded-lg border border-ink-200 bg-white py-2 pl-9 pr-3 text-xs text-ink-800 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none"
            />
          </div>
          <span className="text-xs text-ink-500">
            {summaries.length} market{summaries.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Bar chart */}
      <div className="p-4 space-y-3">
        {summaries.map((s, i) => {
          const barWidth = Math.max(8, ((s.medianPrice - minPrice) / priceRange) * 100);
          const isHighest = s.medianPrice === maxPrice;
          const isLowest = s.medianPrice === minPrice && summaries.length > 1;

          return (
            <div key={s.marketId} className="group">
              <div className="mb-1 flex items-center justify-between text-xs">
                <Link
                  href={`/markets/${s.marketSlug}`}
                  className="font-medium text-ink-800 hover:text-brand-700"
                >
                  {s.marketName}
                  {s.stateName && (
                    <span className="ml-1 font-normal text-ink-400">· {s.stateName}</span>
                  )}
                </Link>
                <div className="flex items-center gap-2">
                  <span className="text-[0.625rem] text-ink-400">
                    {s.observationCount} obs.
                  </span>
                  <span
                    className={`font-bold tabular-nums ${
                      isHighest
                        ? 'text-success-600'
                        : isLowest
                          ? 'text-error-600'
                          : 'text-ink-900'
                    }`}
                  >
                    ₦{Math.round(s.medianPrice).toLocaleString('en-NG')}
                  </span>
                </div>
              </div>
              <div className="h-6 w-full rounded-lg bg-ink-50 overflow-hidden">
                <div
                  className={`h-full rounded-lg transition-all duration-500 ${
                    isHighest
                      ? 'bg-gradient-to-r from-brand-500 to-brand-700'
                      : isLowest
                        ? 'bg-gradient-to-r from-error-400 to-error-600'
                        : 'bg-gradient-to-r from-ink-300 to-ink-500'
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              {/* Range indicators */}
              <div className="mt-0.5 flex items-center justify-between text-[0.625rem] text-ink-400">
                <span>₦{Math.round(s.minPrice).toLocaleString('en-NG')}</span>
                <span>₦{Math.round(s.maxPrice).toLocaleString('en-NG')}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 border-t border-ink-100 px-4 py-2.5 text-[0.6875rem] text-ink-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-brand-600" /> Highest
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-ink-400" /> Median
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-error-500" /> Lowest
        </span>
      </div>
    </div>
  );
}

/* ==================================================== Table View ========== */

function CompareTable({
  summaries,
  commodityName,
}: {
  summaries: MarketSummary[];
  commodityName: string;
}) {
  if (summaries.length === 0) return null;

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-200 bg-ink-50/80">
              <th className="px-4 py-3 text-left font-semibold text-ink-600">Market</th>
              <th className="px-4 py-3 text-left font-semibold text-ink-600">State</th>
              <th className="px-4 py-3 text-right font-semibold text-ink-600">Median price</th>
              <th className="px-4 py-3 text-right font-semibold text-ink-600">Range</th>
              <th className="px-4 py-3 text-right font-semibold text-ink-600">Latest</th>
              <th className="px-4 py-3 text-center font-semibold text-ink-600">Obs.</th>
              <th className="px-4 py-3 text-left font-semibold text-ink-600">Collected</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {summaries.map((s) => (
              <tr key={s.marketId} className="transition-colors hover:bg-brand-50/30">
                <td className="px-4 py-3">
                  <Link
                    href={`/markets/${s.marketSlug}`}
                    className="font-semibold text-ink-900 hover:text-brand-700"
                  >
                    {s.marketName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-600">{s.stateName}</td>
                <td className="px-4 py-3 text-right font-bold tabular-nums text-ink-900">
                  ₦{Math.round(s.medianPrice).toLocaleString('en-NG')}
                </td>
                <td className="px-4 py-3 text-right text-ink-600 tabular-nums">
                  ₦{Math.round(s.minPrice).toLocaleString('en-NG')} – ₦{Math.round(s.maxPrice).toLocaleString('en-NG')}
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums text-ink-800">
                  ₦{Math.round(s.latestPrice).toLocaleString('en-NG')}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex size-6 items-center justify-center rounded-full bg-ink-50 text-xs font-semibold text-ink-700">
                    {s.observationCount}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-600">{formatDate(s.latestCollectedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
