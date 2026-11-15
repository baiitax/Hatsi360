/**
 * Price Trend Section — hero-positioned interactive chart with product sidebar.
 *
 * Sits immediately after the hero and marquee on the homepage. Shows a
 * combined line chart of the top commodities alongside a scrollable product
 * list with live prices and change indicators.
 *
 * All data is real — from the database. Nothing is fabricated.
 */

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { IconTrendingUp, IconTrendingDown, IconArrowRight } from '@/components/ui/icons';

export interface TrendCommodity {
  commodityId: number;
  commodityName: string;
  commoditySlug: string;
  price: number;
  currency: string;
  unit: string;
  changePercent: number | null;
  priceHistory: { date: string; value: number }[];
  marketName?: string;
}

interface Props {
  commodities: TrendCommodity[];
}

export function PriceTrendSection({ commodities }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(
    commodities.length > 0 ? commodities[0].commodityId : null,
  );
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('all');

  const selected = commodities.find((c) => c.commodityId === selectedId) ?? commodities[0] ?? null;

  const filteredCommodities = useMemo(() => {
    return commodities
      .map((c) => {
        const cutoff =
          timeRange === '7d'
            ? Date.now() - 7 * 86400000
            : timeRange === '30d'
              ? Date.now() - 30 * 86400000
              : timeRange === '90d'
                ? Date.now() - 90 * 86400000
                : 0;

        const filtered = c.priceHistory.filter((p) => new Date(p.date).getTime() >= cutoff);
        return { ...c, priceHistory: filtered };
      })
      .filter((c) => c.priceHistory.length >= 2);
  }, [commodities, timeRange]);

  const formatPrice = (price: number, currency: string) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(price);

  const formatChange = (change: number | null) => {
    if (change === null || change === 0) return { text: '0.0%', positive: false, neutral: true };
    const positive = change > 0;
    return {
      text: `${positive ? '+' : ''}${change.toFixed(1)}%`,
      positive,
      neutral: false,
    };
  };

  // Chart dimensions
  const width = 640;
  const height = 280;
  const padding = { top: 20, right: 20, bottom: 36, left: 60 };

  const chartCommodities = filteredCommodities.slice(0, 8);

  // Compute Y range across all commodities
  const allValues = chartCommodities.flatMap((c) => c.priceHistory.map((p) => p.value));
  const minVal = allValues.length > 0 ? Math.min(...allValues) : 0;
  const maxVal = allValues.length > 0 ? Math.max(...allValues) : 1;
  const range = maxVal - minVal || 1;

  // X-axis: unified dates from the first commodity
  const primaryDates = chartCommodities[0]?.priceHistory.map((p) => p.date) ?? [];

  const xScale = (i: number) =>
    padding.left + (i / Math.max(1, primaryDates.length - 1)) * (width - padding.left - padding.right);
  const yScale = (v: number) =>
    padding.top + (1 - (v - minVal) / range) * (height - padding.top - padding.bottom);

  const yTicks = Array.from({ length: 5 }, (_, i) => minVal + (range / 4) * i);

  const xLabelStep = Math.max(1, Math.floor(primaryDates.length / 6));

  // Colors for each commodity line
  const lineColors = [
    '#1D805A', // Brand green
    '#C7A45A', // Gold
    '#2563EB', // Blue
    '#DC2626', // Red
    '#7C3AED', // Purple
    '#EA580C', // Orange
    '#0891B2', // Cyan
    '#BE185D', // Pink
  ];

  return (
    <section className="bg-gradient-to-b from-[#0B3D2C]/[0.03] to-white px-4 py-8 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[1.0625rem] font-bold text-[#0B3D2C]">
              Price Trends
            </h2>
            <p className="mt-0.5 text-[0.75rem] text-gray-500">
              Historical price movements for {commodities.length} tracked commodities
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {(['7d', '30d', '90d', 'all'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  timeRange === r
                    ? 'bg-[#0B3D2C] text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-[#0B3D2C]/30'
                }`}
              >
                {r === 'all' ? 'All' : r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Main content: Chart + Product list */}
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          {/* Chart panel */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            {chartCommodities.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-gray-400">
                Insufficient data for chart
              </div>
            ) : (
              <>
                <svg
                  viewBox={`0 0 ${width} ${height}`}
                  className="h-[280px] w-full"
                  aria-label="Price trend chart"
                >
                  {/* Grid lines */}
                  {yTicks.map((tick, i) => (
                    <g key={i}>
                      <line
                        x1={padding.left}
                        y1={yScale(tick)}
                        x2={width - padding.right}
                        y2={yScale(tick)}
                        stroke="#E5E7EB"
                        strokeWidth="1"
                        strokeDasharray="4 3"
                      />
                      <text
                        x={padding.left - 8}
                        y={yScale(tick) + 4}
                        textAnchor="end"
                        className="text-[10px]"
                        fill="#9CA3AF"
                      >
                        ₦{Math.round(tick).toLocaleString()}
                      </text>
                    </g>
                  ))}

                  {/* X-axis labels */}
                  {primaryDates
                    .filter((_, i) => i % xLabelStep === 0 || i === primaryDates.length - 1)
                    .map((date, idx) => {
                      const origIdx = primaryDates.indexOf(date);
                      return (
                        <text
                          key={idx}
                          x={xScale(origIdx)}
                          y={height - 8}
                          textAnchor="middle"
                          className="text-[10px]"
                          fill="#9CA3AF"
                        >
                          {new Date(date).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
                        </text>
                      );
                    })}

                  {/* Lines for each commodity */}
                  {chartCommodities.map((commodity, ci) => {
                    if (commodity.priceHistory.length < 2) return null;
                    const points = commodity.priceHistory.map((p, i) => `${xScale(i)},${yScale(p.value)}`);
                    const pathD = `M ${points.join(' L ')}`;
                    return (
                      <path
                        key={commodity.commodityId}
                        d={pathD}
                        fill="none"
                        stroke={lineColors[ci % lineColors.length]!}
                        strokeWidth="2"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        opacity="0.9"
                      />
                    );
                  })}

                  {/* Highlight selected commodity with dots */}
                  {selected && (() => {
                    const sCommodity = chartCommodities.find((c) => c.commodityId === selected.commodityId);
                    if (!sCommodity || sCommodity.priceHistory.length < 2) return null;
                    const sIndex = chartCommodities.findIndex((c) => c.commodityId === selected.commodityId);
                    return sCommodity.priceHistory.map((p, i) => (
                      <circle
                        key={i}
                        cx={xScale(i)}
                        cy={yScale(p.value)}
                        r="3"
                        fill={lineColors[sIndex % lineColors.length]}
                        stroke="white"
                        strokeWidth="1.5"
                      />
                    ));
                  })()}
                </svg>

                {/* Legend */}
                <div className="mt-3 flex flex-wrap gap-3 border-t border-gray-100 pt-3">
                  {chartCommodities.map((c, ci) => {
                    const change = formatChange(c.changePercent);
                    return (
                      <button
                        key={c.commodityId}
                        onClick={() => setSelectedId(c.commodityId)}
                        className={`inline-flex items-center gap-2 rounded-lg px-2.5 py-1 text-xs transition-all ${
                          selectedId === c.commodityId
                            ? 'bg-[#0B3D2C]/[0.06] ring-1 ring-[#0B3D2C]/20'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <span
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: lineColors[ci % lineColors.length] }}
                        />
                        <span className="font-medium text-gray-700">{c.commodityName}</span>
                        <span
                          className={`font-semibold tabular-nums ${
                            change.neutral ? 'text-gray-400' : change.positive ? 'text-[#4CAF50]' : 'text-red-500'
                          }`}
                        >
                          {change.text}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Product list panel */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <h3 className="text-[0.8125rem] font-semibold text-[#0B3D2C]">
                Recorded Products
              </h3>
              <Link
                href="/prices"
                className="inline-flex items-center gap-1 text-[0.6875rem] font-medium text-[#0B3D2C] hover:underline"
              >
                All prices
                <IconArrowRight className="size-3" />
              </Link>
            </div>
            <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-50">
              {commodities.map((c) => {
                const change = formatChange(c.changePercent);
                const isSelected = selectedId === c.commodityId;
                return (
                  <button
                    key={c.commodityId}
                    onClick={() => setSelectedId(c.commodityId)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-all ${
                      isSelected
                        ? 'bg-[#0B3D2C]/[0.04] border-l-[3px] border-l-[#0B3D2C]'
                        : 'hover:bg-gray-50/50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.8125rem] font-semibold text-[#0B3D2C]">
                        {c.commodityName}
                      </p>
                      {c.marketName && (
                        <p className="mt-0.5 truncate text-[0.625rem] text-gray-400">
                          {c.marketName}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[0.8125rem] font-bold tabular-nums text-[#0B3D2C]">
                        {formatPrice(c.price, c.currency)}
                      </p>
                      <p className="text-[0.625rem] text-gray-400">
                        per {c.unit}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <div
                        className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[0.6875rem] font-bold tabular-nums ${
                          change.neutral
                            ? 'bg-gray-100 text-gray-500'
                            : change.positive
                              ? 'bg-[#4CAF50]/10 text-[#4CAF50]'
                              : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {change.positive ? (
                          <IconTrendingUp className="size-3" />
                        ) : change.neutral ? null : (
                          <IconTrendingDown className="size-3" />
                        )}
                        {change.text}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
