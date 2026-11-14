/**
 * Price Tracker — Interactive commodity price and trend visualization.
 *
 * Professional trading interface inspired by AFEX (Africa Exchange).
 * Shows commodity list with live prices and a detailed trend chart.
 *
 * All data comes from the database; nothing is fabricated.
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { TrendPoint } from '@/components/homepage/HomepageComponents';

export interface PriceTrackerCommodity {
  ticker: string;
  name: string;
  price: number;
  change: number | null;
  category: 'cash-settled' | 'deliverable' | 'fixed-income' | 'otc';
  currency: string;
  unit: string;
  chartData: TrendPoint[];
}

interface PriceTrackerProps {
  commodities: PriceTrackerCommodity[];
}

export function PriceTracker({ commodities }: PriceTrackerProps) {
  const [activeTab, setActiveTab] = useState<'cash-settled' | 'deliverable' | 'fixed-income' | 'otc'>('cash-settled');
  const [selectedCommodity, setSelectedCommodity] = useState<PriceTrackerCommodity | null>(null);

  // Filter commodities by active tab
  const filteredCommodities = commodities.filter((c) => c.category === activeTab);

  // Select first commodity when tab changes or on mount
  useEffect(() => {
    if (filteredCommodities.length > 0 && (!selectedCommodity || selectedCommodity.category !== activeTab)) {
      setSelectedCommodity(filteredCommodities[0]);
    }
  }, [activeTab, filteredCommodities, selectedCommodity]);

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatChange = (change: number | null) => {
    if (change === null || change === 0) return { text: '0', color: 'text-gray-400' };
    const sign = change > 0 ? '+' : '';
    return {
      text: `${sign}${change.toFixed(2)}`,
      color: change > 0 ? 'text-green-600' : 'text-red-600',
    };
  };

  // Render simple SVG line chart
  const renderChart = (data: TrendPoint[]) => {
    if (data.length < 2) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-gray-400">
          Insufficient data for chart
        </div>
      );
    }

    const width = 800;
    const height = 400;
    const padding = 40;

    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const points = data.map((d, i) => {
      const x = padding + (i / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((d.value - min) / range) * (height - padding * 2);
      return { x, y, value: d.value, date: d.date };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    // Y-axis labels
    const yLabels = Array.from({ length: 5 }, (_, i) => {
      const value = min + (range / 4) * i;
      const y = height - padding - (i / 4) * (height - padding * 2);
      return { value, y };
    });

    // X-axis labels (show ~6 dates)
    const xLabelStep = Math.floor(data.length / 5);
    const xLabels = data
      .filter((_, i) => i % xLabelStep === 0 || i === data.length - 1)
      .map((d, i) => {
        const x = padding + ((i * xLabelStep) / (data.length - 1)) * (width - padding * 2);
        const date = new Date(d.date);
        const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return { label, x };
      });

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
        {/* Grid lines */}
        {yLabels.map((label, i) => (
          <line
            key={i}
            x1={padding}
            y1={label.y}
            x2={width - padding}
            y2={label.y}
            stroke="#E5E7EB"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="#0B3D2C" opacity="0.05" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="#0B3D2C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Y-axis labels */}
        {yLabels.map((label, i) => (
          <text
            key={i}
            x={padding - 10}
            y={label.y + 4}
            textAnchor="end"
            className="text-xs"
            fill="#6B7280"
          >
            {label.value.toLocaleString('en-NG', { maximumFractionDigits: 0 })}
          </text>
        ))}

        {/* X-axis labels */}
        {xLabels.map((label, i) => (
          <text
            key={i}
            x={label.x}
            y={height - 15}
            textAnchor="middle"
            className="text-xs"
            fill="#6B7280"
          >
            {label.label}
          </text>
        ))}

        {/* Data points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="#0B3D2C" />
        ))}
      </svg>
    );
  };

  if (commodities.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-sm text-gray-500">No price data available yet.</p>
      </div>
    );
  }

  return (
    <section>
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[0.9375rem] font-bold text-[#0B3D2C]">
            Follow the Prices and Trends
          </h2>
          <p className="mt-0.5 text-[0.75rem] text-gray-500">
            Track commodity prices and market trends in real-time
          </p>
        </div>
        <Link
          href="/prices"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#0B3D2C]/20 bg-white px-4 py-2 text-[0.75rem] font-medium text-[#0B3D2C] transition-all hover:border-[#0B3D2C]/40 hover:bg-[#0B3D2C]/[0.02] hover:shadow-sm"
        >
          View all prices
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      {/* Top Navigation Tabs */}
      <div className="mb-6 flex items-center justify-center gap-6 border-b border-gray-200 pb-4">
        {['Buy', 'Sell', 'Trade', 'Invest'].map((tab) => (
          <button
            key={tab}
            className={`text-sm font-medium transition-colors ${
              tab === 'Buy'
                ? 'text-green-600'
                : tab === 'Sell'
                ? 'text-red-600'
                : 'text-gray-600 hover:text-[#0B3D2C]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[320px_1fr]">
          {/* Left Panel - Commodity List */}
          <div className="border-b border-gray-200 lg:border-b-0 lg:border-r">
            {/* Category Tabs */}
            <div className="flex gap-2 border-b border-gray-100 p-3">
              {[
                { id: 'cash-settled', label: 'Cash Settled' },
                { id: 'deliverable', label: 'Deliverable' },
                { id: 'fixed-income', label: 'Fixed Income' },
                { id: 'otc', label: 'OTC' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-[#0B3D2C] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Commodity List */}
            <div className="max-h-[500px] overflow-y-auto">
              {filteredCommodities.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400">
                  No commodities in this category
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredCommodities.map((commodity) => {
                    const isSelected = selectedCommodity?.ticker === commodity.ticker;
                    const changeInfo = formatChange(commodity.change);

                    return (
                      <button
                        key={commodity.ticker}
                        onClick={() => setSelectedCommodity(commodity)}
                        className={`w-full px-4 py-3 text-left transition-all ${
                          isSelected
                            ? 'bg-[#0B3D2C]/[0.05] border-l-4 border-l-[#0B3D2C]'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="font-semibold text-[#0B3D2C]">
                              {commodity.ticker}
                            </div>
                            <div className="text-xs text-gray-500">
                              {commodity.name}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold tabular-nums text-[#0B3D2C]">
                              {formatPrice(commodity.price, commodity.currency)}
                            </div>
                            <div
                              className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-xs font-medium ${changeInfo.color} ${
                                commodity.change !== null && commodity.change !== 0
                                  ? commodity.change > 0
                                    ? 'bg-green-100'
                                    : 'bg-red-100'
                                  : 'bg-gray-100'
                              }`}
                            >
                              {changeInfo.text}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Chart */}
          <div className="p-6">
            {selectedCommodity ? (
              <>
                {/* Commodity Header */}
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-[#0B3D2C]">
                      {selectedCommodity.ticker}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selectedCommodity.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold tabular-nums text-[#0B3D2C]">
                      {formatPrice(selectedCommodity.price, selectedCommodity.currency)}
                    </div>
                    <div className={`mt-1 inline-block rounded px-2 py-1 text-sm font-semibold ${formatChange(selectedCommodity.change).color} ${
                      selectedCommodity.change !== null && selectedCommodity.change !== 0
                        ? selectedCommodity.change > 0
                          ? 'bg-green-100'
                          : 'bg-red-100'
                        : 'bg-gray-100'
                    }`}>
                      {formatChange(selectedCommodity.change).text}
                    </div>
                  </div>
                </div>

                {/* Chart */}
                <div className="h-[400px]">
                  {renderChart(selectedCommodity.chartData)}
                </div>

                {/* Chart Footer */}
                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                  <div className="text-xs text-gray-500">
                    Unit: {selectedCommodity.unit}
                  </div>
                  <Link
                    href={`/commodities/${selectedCommodity.ticker.toLowerCase()}`}
                    className="text-xs font-medium text-[#0B3D2C] hover:underline"
                  >
                    View full details →
                  </Link>
                </div>
              </>
            ) : (
              <div className="flex h-[400px] items-center justify-center text-sm text-gray-400">
                Select a commodity to view price trends
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
