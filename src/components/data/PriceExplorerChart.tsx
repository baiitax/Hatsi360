/**
 * Interactive price trend chart for the price explorer.
 *
 * Shows the price trajectory of filtered observations over time, with hover
 * tooltips and the ability to compare multiple commodities.
 */

'use client';

import { useState, useMemo, useRef } from 'react';
import type { PriceObservation } from '@/types/domain';
import { formatMoney, formatDate } from '@/lib/money';
import { IconZoomIn, IconZoomOut, IconRefresh } from '@/components/ui/icons';

interface Props {
  observations: PriceObservation[];
}

export function PriceExplorerChart({ observations }: Props) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('all');
  const svgRef = useRef<SVGSVGElement>(null);

  // Group observations by commodity and take the latest per day
  const dailyPrices = useMemo(() => {
    const now = Date.now();
    const cutoff =
      timeRange === '7d' ? now - 7 * 86400000 :
      timeRange === '30d' ? now - 30 * 86400000 :
      timeRange === '90d' ? now - 90 * 86400000 : 0;

    const filtered = observations.filter((o) => new Date(o.collectedAt).getTime() >= cutoff);

    const byDay = new Map<string, Map<number, { price: number; commodityName: string }>>();
    for (const obs of filtered) {
      const day = obs.collectedAt.slice(0, 10);
      if (!byDay.has(day)) byDay.set(day, new Map());
      const dayMap = byDay.get(day)!;
      const existing = dayMap.get(obs.commodityId);
      if (!existing || obs.collectedAt > existing.price.toString()) {
        dayMap.set(obs.commodityId, {
          price: obs.normalizedAmount ?? obs.reportedAmount ?? 0,
          commodityName: obs.commodityName ?? 'Unknown',
        });
      }
    }

    const days = [...byDay.keys()].sort();
    return days.map((day) => ({
      date: day,
      entries: [...byDay.get(day)!.values()],
    }));
  }, [observations, timeRange]);

  // Flatten for chart: take one representative price per day (average)
  const chartData = useMemo(() => {
    return dailyPrices.map((d) => ({
      date: d.date,
      value: d.entries.reduce((sum, e) => sum + e.price, 0) / d.entries.length,
      count: d.entries.length,
    }));
  }, [dailyPrices]);

  if (chartData.length < 2) return null;

  const width = 800;
  const height = 240;
  const padding = { top: 20, right: 20, bottom: 40, left: 70 };

  const values = chartData.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const xScale = (i: number) => padding.left + (i / (chartData.length - 1)) * (width - padding.left - padding.right);
  const yScale = (v: number) => padding.top + (1 - (v - minVal) / range) * (height - padding.top - padding.bottom);

  const points = chartData.map((d, i) => ({
    x: xScale(i),
    y: yScale(d.value),
    value: d.value,
    date: d.date,
    count: d.count,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`;

  // Y-axis ticks
  const yTicks = Array.from({ length: 5 }, (_, i) => minVal + (range / 4) * i);

  const hoveredPoint = hoverIndex !== null ? points[hoverIndex] : null;
  const overallChange = values.length >= 2 ? ((values[values.length - 1] - values[0]) / values[0]) * 100 : 0;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-ink-900">Price Trend</h3>
          <p className="mt-0.5 text-xs text-ink-500">
            Average price across {chartData[0]?.count ?? 0} commodity{chartData[0]?.count === 1 ? '' : 'ies'} over time
          </p>
        </div>
        <div className="flex items-center gap-1">
          {(['7d', '30d', '90d', 'all'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                timeRange === r ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-ink-50'
              }`}
            >
              {r === 'all' ? 'All' : r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {/* Summary row */}
        <div className="mb-4 flex items-center gap-6 text-sm">
          <div>
            <span className="text-xs text-ink-500">Avg price</span>
            <p className="text-lg font-bold tabular-nums text-ink-900">
              ₦{Math.round(values[values.length - 1]).toLocaleString('en-NG')}
            </p>
          </div>
          <div>
            <span className="text-xs text-ink-500">Change</span>
            <p className={`text-lg font-bold tabular-nums ${overallChange >= 0 ? 'text-success-600' : 'text-error-600'}`}>
              {overallChange >= 0 ? '+' : ''}{overallChange.toFixed(1)}%
            </p>
          </div>
          <div>
            <span className="text-xs text-ink-500">Data points</span>
            <p className="text-lg font-bold tabular-nums text-ink-900">{chartData.length}</p>
          </div>
        </div>

        {/* SVG chart */}
        <div className="overflow-x-auto">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            className="h-60 w-full min-w-[600px]"
            onMouseLeave={() => setHoverIndex(null)}
          >
            {/* Grid */}
            {yTicks.map((tick, i) => (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={yScale(tick)}
                  x2={width - padding.right}
                  y2={yScale(tick)}
                  stroke="#E5E7EB"
                  strokeWidth="1"
                  strokeDasharray="4 2"
                />
                <text x={padding.left - 8} y={yScale(tick) + 4} textAnchor="end" className="text-[10px]" fill="#9CA3AF">
                  ₦{Math.round(tick).toLocaleString()}
                </text>
              </g>
            ))}

            {/* X-axis labels */}
            {points
              .filter((_, i) => i % Math.max(1, Math.floor(points.length / 6)) === 0)
              .map((p, i) => (
                <text
                  key={i}
                  x={p.x}
                  y={height - 8}
                  textAnchor="middle"
                  className="text-[10px]"
                  fill="#9CA3AF"
                >
                  {new Date(p.date).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
                </text>
              ))}

            {/* Area fill */}
            <path d={areaPath} fill="url(#areaGradient)" />

            {/* Line */}
            <path d={linePath} fill="none" stroke="#1D805A" strokeWidth="2.5" strokeLinejoin="round" />

            {/* Hover crosshair */}
            {hoveredPoint && (
              <>
                <line
                  x1={hoveredPoint.x}
                  y1={padding.top}
                  x2={hoveredPoint.x}
                  y2={height - padding.bottom}
                  stroke="#1D805A"
                  strokeWidth="1"
                  strokeDasharray="4 2"
                />
                <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="5" fill="#1D805A" stroke="white" strokeWidth="2" />
              </>
            )}

            {/* Hover targets */}
            {points.map((p, i) => (
              <rect
                key={i}
                x={p.x - (width / points.length) / 2}
                y={padding.top}
                width={width / points.length}
                height={height - padding.top - padding.bottom}
                fill="transparent"
                onMouseEnter={() => setHoverIndex(i)}
              />
            ))}

            {/* Gradient definition */}
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1D805A" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#1D805A" stopOpacity="0.02" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Tooltip */}
        {hoveredPoint && (
          <div className="mt-2 rounded-lg border border-ink-200 bg-white p-3 text-sm shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium text-ink-900">{formatDate(hoveredPoint.date)}</span>
              <span className="font-bold tabular-nums text-ink-900">₦{Math.round(hoveredPoint.value).toLocaleString('en-NG')}</span>
            </div>
            <p className="mt-0.5 text-xs text-ink-500">{hoveredPoint.count} commodity{hoveredPoint.count === 1 ? '' : 'ies'} reported</p>
          </div>
        )}
      </div>
    </div>
  );
}
