/**
 * Hatsi360 Homepage — Live analytics and market intelligence components.
 *
 * Light theme using logo color palette:
 * - Primary: #0B3D2C (deep forest green)
 * - Gold: #E5A020 (warm amber)
 * - Accent: #1A6B40 (medium green)
 * - Highlight: #4CAF50 (light green)
 *
 * Every figure comes from the database; nothing is fabricated.
 */

import Link from 'next/link';
import type { ReactNode } from 'react';

/* ============================================================ Sparkline ===== */

export function Sparkline({
  values,
  width = 120,
  height = 32,
  color = '#1A6B40',
  fillOpacity = 0.1,
  className = '',
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  fillOpacity?: number;
  className?: string;
}) {
  if (values.length < 2) {
    return (
      <svg width={width} height={height} className={className} aria-hidden="true">
        <line
          x1="0" y1={height / 2}
          x2={width} y2={height / 2}
          stroke={color}
          strokeOpacity={0.3}
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      </svg>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padding = 2;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const linePath = `M ${points.join(' L ')}`;
  const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <path d={areaPath} fill={color} fillOpacity={fillOpacity} />
      <path d={linePath} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={width}
        cy={height - padding - ((values[values.length - 1] - min) / range) * (height - padding * 2)}
        r={2.5}
        fill={color}
      />
    </svg>
  );
}

/* ============================================================ Market Ticker ===== */

export interface TickerItem {
  commodity: string;
  price: number;
  currency: string;
  unit: string;
  change: number | null;
  market?: string;
}

export function MarketTicker({ items }: { items: TickerItem[] }) {
  if (items.length === 0) return null;

  const formatPrice = (amount: number, currency: string) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="relative overflow-hidden border-y border-gray-200 bg-[#0B3D2C]">
      <div className="flex animate-[ticker_40s_linear_infinite] gap-0 whitespace-nowrap py-2.5">
        {[...items, ...items].map((item, i) => (
          <div
            key={`${item.commodity}-${i}`}
            className="inline-flex items-center gap-2.5 border-r border-[#0B3D2C]/30 px-5"
          >
            <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-gray-300">
              {item.commodity}
            </span>
            <span className="figure-num text-[0.8125rem] font-bold text-white">
              {formatPrice(item.price, item.currency)}
            </span>
            <span className="text-[0.6875rem] text-gray-400">/{item.unit}</span>
            {item.change !== null && (
              <span
                className={`inline-flex items-center gap-0.5 text-[0.6875rem] font-semibold ${
                  item.change > 0 ? 'text-[#4CAF50]' : item.change < 0 ? 'text-red-400' : 'text-gray-400'
                }`}
              >
                <span aria-hidden="true">{item.change > 0 ? '▲' : item.change < 0 ? '▼' : '–'}</span>
                {Math.abs(item.change).toFixed(1)}%
              </span>
            )}
            {item.market && <span className="text-[0.625rem] text-gray-400">{item.market}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================ Hero Section ===== */

export function HomepageHero({
  publishedCount,
  commodityCount,
  marketCount,
  coverageLine,
  latestObservedAt,
}: {
  publishedCount: number;
  commodityCount: number;
  marketCount: number;
  coverageLine: string;
  latestObservedAt: string | null;
}) {
  return (
    <div className="relative overflow-hidden border-b border-gray-200 bg-white">
      {/* Hero background image with overlay */}
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/hatsi360-hero.png"
          alt=""
          className="h-full w-full object-cover opacity-10"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-white via-white/95 to-white/90" />

      <div className="relative px-4 py-12 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#0B3D2C]/20 bg-[#0B3D2C]/5 px-3 py-1">
                <span className="size-2 animate-pulse rounded-full bg-[#4CAF50]" />
                <span className="text-[0.6875rem] font-medium text-[#0B3D2C]/70">
                  Market Intelligence Platform
                </span>
              </div>

              <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#0B3D2C] sm:text-4xl lg:text-5xl">
                African Agricultural
                <span className="block text-[#E5A020]">Market Intelligence</span>
              </h1>

              <p className="mt-4 max-w-lg text-[0.9375rem] leading-relaxed text-gray-600">
                Verified commodity prices collected in the field, analysed for
                sourcing, procurement and trade decisions. Every figure traces
                back to a person, a market and a moment.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/prices"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#E5A020] px-5 py-2.5 text-[0.8125rem] font-semibold text-white transition-colors hover:bg-[#C88A15]"
                >
                  Explore Prices <span aria-hidden="true">→</span>
                </Link>
                <Link
                  href="/trade/terminal"
                  className="inline-flex items-center gap-2 rounded-lg border border-[#0B3D2C]/20 bg-white px-5 py-2.5 text-[0.8125rem] font-semibold text-[#0B3D2C] transition-colors hover:bg-[#0B3D2C]/5"
                >
                  Trade Terminal
                </Link>
                <Link
                  href="/commodities"
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 text-[0.8125rem] font-semibold text-gray-700 transition-colors hover:border-[#0B3D2C]/30 hover:bg-gray-50"
                >
                  Commodities
                </Link>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-lg">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[0.8125rem] font-bold uppercase tracking-wider text-[#0B3D2C]/70">
                  Platform Overview
                </h2>
                <span className="text-[0.625rem] text-gray-500">
                  {latestObservedAt ? `Updated ${formatRelative(latestObservedAt)}` : 'Live'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <StatBlock value={publishedCount.toLocaleString()} label="Published Prices" accent={publishedCount > 0} />
                <StatBlock value={commodityCount.toLocaleString()} label="Commodities" accent />
                <StatBlock value={marketCount.toLocaleString()} label="Markets" accent />
              </div>

              <div className="mt-4 border-t border-gray-200 pt-3">
                <p className="text-[0.6875rem] leading-relaxed text-gray-500">{coverageLine}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBlock({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div>
      <div className={`figure-num text-2xl font-extrabold tracking-tight ${accent ? 'text-[#E5A020]' : 'text-[#0B3D2C]'}`}>
        {value}
      </div>
      <div className="mt-0.5 text-[0.6875rem] text-gray-500">{label}</div>
    </div>
  );
}

/* ============================================================ Price Card ===== */

export interface PriceCardData {
  commodityName: string;
  commoditySlug: string;
  price: number | null;
  currency: string;
  unit: string;
  change: number | null;
  marketName: string | null;
  observedAt: string | null;
  sparklineValues: number[];
  gradeName?: string | null;
  priceTypeLabel?: string;
}

export function HomepagePriceCard({ data }: { data: PriceCardData }) {
  const formatPrice = (amount: number, currency: string) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);

  const sparkColor =
    data.change === null ? '#6B7280' : data.change > 0 ? '#1A6B40' : data.change < 0 ? '#DC2626' : '#6B7280';

  return (
    <Link
      href={`/commodities/${data.commoditySlug}`}
      className="group flex flex-col rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-[#E5A020]/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-[0.875rem] font-bold text-[#0B3D2C] group-hover:text-[#E5A020] transition-colors">
            {data.commodityName}
          </h3>
          {data.marketName && <p className="mt-0.5 text-[0.6875rem] text-gray-500">{data.marketName}</p>}
        </div>
        {data.change !== null && (
          <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${
            data.change > 0 ? 'bg-[#4CAF50]/10 text-[#1A6B40]' : data.change < 0 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'
          }`}>
            <span aria-hidden="true">{data.change > 0 ? '▲' : data.change < 0 ? '▼' : '–'}</span>
            {Math.abs(data.change).toFixed(1)}%
          </span>
        )}
      </div>

      <div className="mt-3 flex items-end justify-between">
        <div>
          {data.price !== null ? (
            <>
              <div className="figure-num text-xl font-extrabold tracking-tight text-[#0B3D2C]">
                {formatPrice(data.price, data.currency)}
              </div>
              <div className="text-[0.625rem] text-gray-500">per {data.unit}</div>
            </>
          ) : (
            <div className="text-sm text-gray-500">No data yet</div>
          )}
        </div>
        <Sparkline values={data.sparklineValues} width={80} height={28} color={sparkColor} />
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2.5">
        {data.priceTypeLabel && <span className="text-[0.625rem] text-gray-500">{data.priceTypeLabel}</span>}
        {data.observedAt && <span className="text-[0.625rem] text-gray-500">{formatRelative(data.observedAt)}</span>}
      </div>
    </Link>
  );
}

/* ============================================================ Analytics Section ===== */

export interface AnalyticsData {
  totalObservations: number;
  verifiedToday: number;
  activeMarkets: number;
  pendingVerification: number;
  priceTrend: number[];
  verificationTrend: number[];
}

export function HomepageAnalytics({ data }: { data: AnalyticsData }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[0.8125rem] font-bold uppercase tracking-wider text-[#0B3D2C]/70">
          Market Analytics
        </h2>
        <span className="rounded-full bg-[#0B3D2C]/5 px-2 py-0.5 text-[0.625rem] text-gray-600">
          Last 7 days
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <AnalyticsCard label="Total Observations" value={data.totalObservations.toLocaleString()} trend={data.priceTrend} trendColor="#1A6B40" />
        <AnalyticsCard label="Verified Today" value={data.verifiedToday.toLocaleString()} trend={data.verificationTrend} trendColor="#E5A020" />
        <AnalyticsCard label="Active Markets" value={data.activeMarkets.toLocaleString()} trend={[]} trendColor="#4CAF50" />
        <AnalyticsCard label="Pending Review" value={data.pendingVerification.toLocaleString()} trend={[]} trendColor="#DC2626" />
      </div>
    </div>
  );
}

function AnalyticsCard({ label, value, trend, trendColor }: { label: string; value: string; trend: number[]; trendColor: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
      <div className="text-[0.6875rem] text-gray-500">{label}</div>
      <div className="mt-1 flex items-end justify-between">
        <span className="figure-num text-xl font-extrabold tracking-tight text-[#0B3D2C]">{value}</span>
        {trend.length > 1 && <Sparkline values={trend} width={48} height={20} color={trendColor} />}
      </div>
    </div>
  );
}

/* ============================================================ Price Trend Chart ===== */

export interface TrendPoint {
  date: string;
  value: number;
}

export function HomepagePriceChart({
  title, commodityName, points, currency, unit,
}: { title: string; commodityName: string; points: TrendPoint[]; currency: string; unit: string; }) {
  if (points.length < 2) return null;

  const width = 600;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const values = points.map(p => p.value);
  const min = Math.min(...values) * 0.95;
  const max = Math.max(...values) * 1.05;
  const range = max - min || 1;

  const pointsStr = points.map((p, i) => {
    const x = padding.left + (i / (points.length - 1)) * chartW;
    const y = padding.top + chartH - ((p.value - min) / range) * chartH;
    return `${x},${y}`;
  });

  const linePath = `M ${pointsStr.join(' L ')}`;
  const areaPath = `${linePath} L ${padding.left + chartW},${padding.top + chartH} L ${padding.left},${padding.top + chartH} Z`;

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);

  const yTicks = Array.from({ length: 4 }, (_, i) => min + (range * i) / 3);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-[0.875rem] font-bold text-[#0B3D2C]">{title}</h3>
          <p className="text-[0.6875rem] text-gray-500">{commodityName} · {currency}/{unit}</p>
        </div>
        <div className="text-right">
          <div className="figure-num text-lg font-extrabold text-[#0B3D2C]">{formatPrice(points[points.length - 1].value)}</div>
          <div className="text-[0.625rem] text-gray-500">Latest</div>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {yTicks.map((tick, i) => {
          const y = padding.top + chartH - ((tick - min) / range) * chartH;
          return (
            <g key={i}>
              <line x1={padding.left} y1={y} x2={padding.left + chartW} y2={y} stroke="#E5E7EB" strokeWidth={1} />
              <text x={padding.left - 8} y={y + 3} textAnchor="end" fill="#6B7280" fontSize="9">{formatPrice(tick)}</text>
            </g>
          );
        })}

        <path d={areaPath} fill="#1A6B40" fillOpacity={0.08} />
        <path d={linePath} fill="none" stroke="#1A6B40" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <circle
          cx={padding.left + chartW}
          cy={padding.top + chartH - ((points[points.length - 1].value - min) / range) * chartH}
          r={4}
          fill="#E5A020"
        />

        {[0, Math.floor(points.length / 2), points.length - 1].map((idx) => {
          if (!points[idx]) return null;
          const x = padding.left + (idx / (points.length - 1)) * chartW;
          const date = new Date(points[idx].date);
          return (
            <text key={idx} x={x} y={height - 5} textAnchor={idx === 0 ? 'start' : idx === points.length - 1 ? 'end' : 'middle'} fill="#6B7280" fontSize="9">
              {date.toLocaleDateString('en-NG', { day: '2-digit', month: 'short' })}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

/* ============================================================ Coverage Section ===== */

export function HomepageCoverage({ rows }: { rows: { label: string; count: number; detail: string; href?: string }[] }) {
  const maxCount = Math.max(...rows.map(r => r.count), 1);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-[0.8125rem] font-bold uppercase tracking-wider text-[#0B3D2C]/70">Platform Coverage</h2>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-4">
            <div className="w-48 shrink-0">
              <div className="text-[0.8125rem] font-medium text-[#0B3D2C]">{row.label}</div>
              <div className="text-[0.625rem] text-gray-500">{row.detail}</div>
            </div>
            <div className="flex-1">
              <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-gradient-to-r from-[#1A6B40] to-[#4CAF50] transition-all" style={{ width: `${Math.max((row.count / maxCount) * 100, 2)}%` }} />
              </div>
            </div>
            <div className="figure-num w-16 text-right text-[0.875rem] font-bold text-[#0B3D2C]">{row.count.toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================ How It Works ===== */

export function HomepageHowItWorks() {
  const steps = [
    { icon: '◉', title: 'Field Collection', description: 'Market agents record prices at assigned markets with grade, unit, price type and evidence.' },
    { icon: '✓', title: 'Verification', description: 'Automated checks and human review ensure every published price is accurate and traceable.' },
    { icon: '◈', title: 'Market Intelligence', description: 'Verified prices become sourcing signals, procurement benchmarks and trade opportunities.' },
    { icon: '▤', title: 'Decision Support', description: 'Exports, alerts, API access and analyst reports turn data into actionable intelligence.' },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-5 text-[0.8125rem] font-bold uppercase tracking-wider text-[#0B3D2C]/70">How Hatsi360 Works</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <div key={step.title} className="relative rounded-lg border border-gray-100 bg-gradient-to-br from-white to-gray-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-[#0B3D2C] text-[0.75rem] font-bold text-[#E5A020]">{i + 1}</span>
              <span className="text-[0.8125rem] font-bold text-[#0B3D2C]">{step.title}</span>
            </div>
            <p className="text-[0.75rem] leading-relaxed text-gray-600">{step.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================ CTA Section ===== */

export function HomepageCTA() {
  return (
    <div className="rounded-xl border border-[#0B3D2C]/20 bg-gradient-to-br from-[#0B3D2C] to-[#1A6B40] p-6">
      <div className="flex flex-col items-start gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Ready for market intelligence you can trust?</h2>
          <p className="mt-1 text-[0.8125rem] text-[#E5A020]/90">
            Free price discovery. Professional intelligence with exports, alerts and API access.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/pricing" className="inline-flex items-center gap-2 rounded-lg bg-[#E5A020] px-5 py-2.5 text-[0.8125rem] font-semibold text-white transition-colors hover:bg-[#C88A15]">
            View Plans
          </Link>
          <Link href="/api-docs" className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-5 py-2.5 text-[0.8125rem] font-semibold text-white transition-colors hover:bg-white/10">
            Developer API
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ============================================================ Helpers ===== */

function formatRelative(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'unknown';
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-NG', { day: '2-digit', month: 'short' });
}
