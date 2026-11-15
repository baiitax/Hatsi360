/**
 * Hatsi360 Homepage — Professional market intelligence components.
 *
 * Light theme using logo color palette:
 * - Primary: #0B3D2C (deep forest green)
 * - Gold: #E5A020 (warm amber)
 * - Accent: #1A6B40 (medium green)
 * - Highlight: #4CAF50 (light green)
 *
 * Every figure comes from the database; nothing is fabricated.
 * Professional, responsive, Afex-inspired design.
 */

import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  IconLeaf,
  IconShieldCheck,
  IconTrendingUp,
  IconActivity,
  IconZap,
  IconUsers,
  IconDatabase,
  IconTarget,
  IconBriefcase,
  IconBookOpen,
  IconBarChart,
  IconPieChart,
  IconAward,
  IconArrowRight,
  IconCheck,
  IconCode,
} from '@/components/ui/icons';

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

  // Duplicate items 3x to ensure seamless loop for longer lists
  const loopedItems = [...items, ...items, ...items];

  return (
    <div className="relative overflow-hidden border-y border-[#0B3D2C]/10 bg-[#0B3D2C]">
      {/* Fade edges */}
      <div className="pointer-events-none absolute top-0 left-0 bottom-0 z-10 w-16 bg-gradient-to-r from-[#0B3D2C] to-transparent" />
      <div className="pointer-events-none absolute top-0 right-0 bottom-0 z-10 w-16 bg-gradient-to-l from-[#0B3D2C] to-transparent" />

      {/* Scrolling track */}
      <div className="flex animate-[ticker_60s_linear_infinite] gap-0 whitespace-nowrap py-2.5">
        {loopedItems.map((item, i) => {
          const changePercent = item.change;
          const isUp = changePercent !== null && changePercent > 0;
          const isDown = changePercent !== null && changePercent < 0;
          const changeAbs = changePercent !== null ? Math.abs(changePercent).toFixed(1) : null;

          return (
            <div
              key={`${item.commodity}-${i}`}
              className="inline-flex items-center gap-2 border-r border-white/[0.08] px-5"
            >
              {/* Commodity name */}
              <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-white/70">
                {item.commodity}
              </span>

              {/* Price */}
              <span className="figure-num text-[0.8125rem] font-bold tabular-nums text-white">
                {formatPrice(item.price, item.currency)}
              </span>

              {/* Unit */}
              <span className="text-[0.625rem] text-white/40">/{item.unit}</span>

              {/* Change indicator with up/down icons */}
              {changePercent !== null && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.625rem] font-bold tabular-nums ${
                    isUp
                      ? 'bg-[#4CAF50]/15 text-[#4CAF50]'
                      : isDown
                        ? 'bg-red-500/15 text-red-400'
                        : 'bg-white/5 text-white/40'
                  }`}
                >
                  {isUp ? (
                    <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  ) : isDown ? (
                    <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  ) : (
                    <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  )}
                  {changeAbs}%
                </span>
              )}

              {/* Market name */}
              {item.market && (
                <span className="text-[0.625rem] text-white/30">· {item.market}</span>
              )}
            </div>
          );
        })}
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
    <div className="relative overflow-hidden border-b border-gray-200 bg-[#0B3D2C]">
      {/* Parallax hero background image */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(/brand/hatsi360-hero.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
          minHeight: '100%',
        }}
      />

      {/* Gradient overlays for readability and depth */}
      {/* Bottom-up gradient for text contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0B3D2C]/95 via-[#0B3D2C]/70 to-[#0B3D2C]/40" />
      {/* Left-side emphasis for content area */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0B3D2C]/85 via-[#0B3D2C]/30 to-transparent" />

      {/* Subtle gold accent line at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#E5A020]/60 to-transparent" />

      <div className="relative px-4 py-16 sm:py-20 lg:px-8 lg:py-28 xl:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-12 lg:items-center">
            {/* Left Column */}
            <div className="lg:col-span-7">
              {/* Badge */}
              <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-sm">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#4CAF50] opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-[#4CAF50]" />
                </span>
                <span className="text-[0.6875rem] font-semibold text-white/90">
                  Live Market Intelligence Platform
                </span>
              </div>

              {/* Headline */}
              <h1 className="font-display text-[2.25rem] font-extrabold tracking-tight text-white sm:text-[3rem] lg:text-[3.75rem] xl:text-[4rem]">
                <div className="flex items-baseline flex-wrap gap-x-2">
                  <span className="text-white">HATSI</span>
                  <span className="text-[#E5A020]">360</span>
                </div>
                <span className="mt-3 block text-[1.25rem] font-bold text-white/80 sm:text-[1.5rem] lg:text-[1.75rem]">
                  African Agricultural Market Intelligence
                </span>
              </h1>

              {/* Subtitle */}
              <p className="mt-6 max-w-xl text-[0.9375rem] leading-relaxed text-white/75 sm:text-[1.0625rem]">
                Verified commodity prices collected in the field, analysed for
                sourcing, procurement and trade decisions. Every figure traces
                back to a person, a market and a moment.
              </p>

              {/* CTA Buttons */}
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/prices"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#E5A020] px-6 py-3 text-[0.8125rem] font-semibold text-white shadow-lg shadow-black/20 transition-all hover:bg-[#C88A15] hover:shadow-xl hover:shadow-black/30"
                >
                  Explore Prices
                  <IconArrowRight className="size-4" />
                </Link>
                <Link
                  href="/trade/terminal"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-6 py-3 text-[0.8125rem] font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
                >
                  Trade Terminal
                </Link>
                <Link
                  href="/commodities"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-6 py-3 text-[0.8125rem] font-semibold text-white/90 transition-all hover:bg-white/10"
                >
                  Commodities
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="mt-10 flex flex-wrap gap-6 border-t border-white/10 pt-6">
                <div className="flex items-center gap-2 text-[0.75rem] text-white/60">
                  <IconShieldCheck className="size-4 text-[#4CAF50]" />
                  <span>Verified Data</span>
                </div>
                <div className="flex items-center gap-2 text-[0.75rem] text-white/60">
                  <IconLeaf className="size-4 text-[#4CAF50]" />
                  <span>Field Collected</span>
                </div>
                <div className="flex items-center gap-2 text-[0.75rem] text-white/60">
                  <IconActivity className="size-4 text-[#E5A020]" />
                  <span>Real-Time Updates</span>
                </div>
              </div>
            </div>

            {/* Right Column: Dashboard Preview Card */}
            <div className="lg:col-span-5">
              <div className="relative">
                {/* Glow effect behind card */}
                <div className="absolute -inset-4 rounded-2xl bg-gradient-to-br from-[#E5A020]/20 via-[#0B3D2C]/20 to-[#4CAF50]/20 blur-2xl" />

                <div className="relative rounded-2xl border border-white/10 bg-[#0B3D2C]/60 p-6 shadow-2xl backdrop-blur-md">
                  {/* Card Header */}
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-red-400" />
                        <span className="size-2 rounded-full bg-[#E5A020]" />
                        <span className="size-2 rounded-full bg-[#4CAF50]" />
                      </div>
                      <span className="ml-2 text-[0.6875rem] font-semibold text-white/60">Market Dashboard</span>
                    </div>
                    <span className="text-[0.625rem] text-white/50">
                      {latestObservedAt ? `Updated ${formatRelative(latestObservedAt)}` : 'Live'}
                    </span>
                  </div>

                  {/* KPI Row */}
                  <div className="mb-5 grid grid-cols-3 gap-3">
                    <DashboardKPI value={publishedCount.toLocaleString()} label="Published" icon="📊" accent />
                    <DashboardKPI value={commodityCount.toLocaleString()} label="Commodities" icon="🌾" accent />
                    <DashboardKPI value={marketCount.toLocaleString()} label="Markets" icon="🏪" accent />
                  </div>

                  {/* Mini Chart */}
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[0.6875rem] font-semibold text-white/70">Platform Activity</span>
                      <span className="flex items-center gap-1 text-[0.625rem] text-[#4CAF50]">
                        <IconTrendingUp className="size-3" /> Growing
                      </span>
                    </div>
                    <svg viewBox="0 0 200 60" className="w-full" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4CAF50" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#4CAF50" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M 0 50 Q 25 45 40 42 T 80 35 T 120 28 T 160 20 T 200 12"
                        fill="none"
                        stroke="#4CAF50"
                        strokeWidth="2"
                      />
                      <path
                        d="M 0 50 Q 25 45 40 42 T 80 35 T 120 28 T 160 20 T 200 12 L 200 60 L 0 60 Z"
                        fill="url(#chartGrad)"
                      />
                    </svg>
                  </div>

                  {/* Coverage line */}
                  <p className="mt-4 text-[0.625rem] leading-relaxed text-white/50">{coverageLine}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardKPI({ value, label, icon, accent }: { value: string; label: string; icon: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-2.5 text-center">
      <div className="mb-1 text-lg">{icon}</div>
      <div className={`figure-num text-lg font-extrabold tracking-tight ${accent ? 'text-[#E5A020]' : 'text-white'}`}>
        {value}
      </div>
      <div className="text-[0.5625rem] font-medium text-white/60">{label}</div>
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
      className="group flex flex-col rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-[#E5A020]/40 hover:shadow-lg hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <h3 className="truncate text-[0.875rem] font-bold text-[#0B3D2C] group-hover:text-[#E5A020] transition-colors">
            {data.commodityName}
          </h3>
          {data.marketName && <p className="mt-0.5 truncate text-[0.6875rem] text-gray-500">{data.marketName}</p>}
        </div>
        {data.change !== null && (
          <span className={`ml-2 inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${
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
  const maxTrend = Math.max(...data.priceTrend, 1);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-[0.9375rem] font-bold text-[#0B3D2C]">
            <IconBarChart className="size-5 text-[#E5A020]" />
            Market Analytics
          </h2>
          <p className="mt-0.5 text-[0.75rem] text-gray-500">Key platform metrics and activity</p>
        </div>
        <span className="rounded-full border border-[#0B3D2C]/10 bg-[#0B3D2C]/5 px-3 py-1 text-[0.6875rem] font-medium text-[#0B3D2C]/70">
          Last 7 days
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <AnalyticsCard
          icon={<IconDatabase className="size-5 text-[#1A6B40]" />}
          label="Total Observations"
          value={data.totalObservations.toLocaleString()}
          trend={data.priceTrend}
          trendColor="#1A6B40"
        />
        <AnalyticsCard
          icon={<IconShieldCheck className="size-5 text-[#E5A020]" />}
          label="Verified Today"
          value={data.verifiedToday.toLocaleString()}
          trend={data.verificationTrend}
          trendColor="#E5A020"
        />
        <AnalyticsCard
          icon={<IconUsers className="size-5 text-[#4CAF50]" />}
          label="Active Markets"
          value={data.activeMarkets.toLocaleString()}
          trend={[]}
          trendColor="#4CAF50"
        />
        <AnalyticsCard
          icon={<IconTarget className="size-5 text-red-500" />}
          label="Pending Review"
          value={data.pendingVerification.toLocaleString()}
          trend={[]}
          trendColor="#DC2626"
        />
      </div>

      {/* Bar Chart */}
      {data.priceTrend.length > 1 && (
        <div className="mt-5 rounded-lg border border-gray-100 bg-gray-50/50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <IconPieChart className="size-4 text-[#0B3D2C]/60" />
            <span className="text-[0.6875rem] font-semibold text-[#0B3D2C]/70">Observation Volume (7 days)</span>
          </div>
          <div className="flex items-end gap-2 h-20">
            {data.priceTrend.map((val, i) => {
              const height = maxTrend > 0 ? (val / maxTrend) * 100 : 0;
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-[#1A6B40] to-[#4CAF50] transition-all"
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                  <span className="text-[0.5rem] text-gray-400">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function AnalyticsCard({
  icon,
  label,
  value,
  trend,
  trendColor,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  trend: number[];
  trendColor: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-white to-gray-50/50 p-4 transition-all hover:shadow-md">
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <span className="text-[0.6875rem] text-gray-500">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className="figure-num text-2xl font-extrabold tracking-tight text-[#0B3D2C]">{value}</span>
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
  const height = 220;
  const padding = { top: 20, right: 20, bottom: 30, left: 65 };
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
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-[0.9375rem] font-bold text-[#0B3D2C]">
            <IconActivity className="size-5 text-[#E5A020]" />
            {title}
          </h3>
          <p className="mt-0.5 text-[0.6875rem] text-gray-500">{commodityName} · {currency}/{unit}</p>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-1.5">
          <div className="text-right">
            <div className="figure-num text-lg font-extrabold text-[#0B3D2C]">{formatPrice(points[points.length - 1].value)}</div>
            <div className="text-[0.5625rem] text-gray-500">Latest Price</div>
          </div>
          <div className="size-2 rounded-full bg-[#4CAF50] animate-pulse" />
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="chartAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1A6B40" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#1A6B40" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {yTicks.map((tick, i) => {
          const y = padding.top + chartH - ((tick - min) / range) * chartH;
          return (
            <g key={i}>
              <line x1={padding.left} y1={y} x2={padding.left + chartW} y2={y} stroke="#E5E7EB" strokeWidth={1} strokeDasharray="3 3" />
              <text x={padding.left - 8} y={y + 3} textAnchor="end" fill="#6B7280" fontSize="9">{formatPrice(tick)}</text>
            </g>
          );
        })}
        <path d={areaPath} fill="url(#chartAreaGrad)" />
        <path d={linePath} fill="none" stroke="#1A6B40" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <circle
          cx={padding.left + chartW}
          cy={padding.top + chartH - ((points[points.length - 1].value - min) / range) * chartH}
          r={5}
          fill="#E5A020"
          stroke="white"
          strokeWidth={2}
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

/* ============================================================ Commodity Categories ===== */

export interface CommodityCategory {
  slug: string;
  name: string;
  count: number;
  description: string;
}

export function HomepageCommodityCategories({ categories }: { categories: CommodityCategory[] }) {
  if (categories.length === 0) return null;

  const iconMap: Record<string, ReactNode> = {
    'grains-cereals': <IconLeaf className="size-6 text-[#1A6B40]" />,
    'oilseeds': <IconPieChart className="size-6 text-[#E5A020]" />,
    'pulses-legumes': <IconTarget className="size-6 text-[#4CAF50]" />,
    'tree-crops': <IconLeaf className="size-6 text-[#1A6B40]" />,
    'livestock-poultry': <IconUsers className="size-6 text-[#E5A020]" />,
    'processed-agricultural': <IconBriefcase className="size-6 text-[#0B3D2C]" />,
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5">
        <h2 className="flex items-center gap-2 text-[0.9375rem] font-bold text-[#0B3D2C]">
          <IconLeaf className="size-5 text-[#1A6B40]" />
          Commodity Categories
        </h2>
        <p className="mt-0.5 text-[0.75rem] text-gray-500">Explore prices by category</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => (
          <Link
            key={cat.slug}
            href="/commodities"
            className="group flex items-center gap-3 rounded-lg border border-gray-100 bg-gradient-to-br from-white to-gray-50/50 p-4 transition-all hover:border-[#E5A020]/30 hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#0B3D2C]/[0.04] transition-colors group-hover:bg-[#E5A020]/10">
              {iconMap[cat.slug] ?? <IconLeaf className="size-6 text-[#0B3D2C]/40" />}
            </div>
            <div className="min-w-0">
              <div className="truncate text-[0.8125rem] font-bold text-[#0B3D2C] group-hover:text-[#E5A020] transition-colors">
                {cat.name}
              </div>
              <div className="mt-0.5 text-[0.6875rem] text-gray-500">{cat.count} commodities</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ============================================================ Coverage Section ===== */

export function HomepageCoverage({ rows }: { rows: { label: string; count: number; detail: string; href?: string }[] }) {
  const maxCount = Math.max(...rows.map(r => r.count), 1);
  const icons = [IconLeaf, IconDatabase, IconUsers, IconTarget];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5">
        <h2 className="flex items-center gap-2 text-[0.9375rem] font-bold text-[#0B3D2C]">
          <IconTarget className="size-5 text-[#E5A020]" />
          Platform Coverage
        </h2>
        <p className="mt-0.5 text-[0.75rem] text-gray-500">Market and commodity reach</p>
      </div>
      <div className="space-y-4">
        {rows.map((row, i) => {
          const IconComp = icons[i % icons.length];
          return (
            <div key={row.label} className="flex items-center gap-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#0B3D2C]/[0.04]">
                <IconComp className="size-4.5 text-[#1A6B40]" />
              </div>
              <div className="w-40 shrink-0 sm:w-48">
                <div className="text-[0.8125rem] font-semibold text-[#0B3D2C]">{row.label}</div>
                <div className="text-[0.625rem] text-gray-500">{row.detail}</div>
              </div>
              <div className="flex-1">
                <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#1A6B40] to-[#4CAF50] transition-all duration-500"
                    style={{ width: `${Math.max((row.count / maxCount) * 100, 2)}%` }}
                  />
                </div>
              </div>
              <div className="figure-num w-14 shrink-0 text-right text-[0.9375rem] font-bold text-[#0B3D2C]">
                {row.count.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================ How It Works ===== */

export function HomepageHowItWorks() {
  const steps = [
    {
      icon: <IconDatabase className="size-6 text-[#E5A020]" />,
      title: 'Field Collection',
      description: 'Market agents record prices at assigned markets with grade, unit, price type and evidence.',
    },
    {
      icon: <IconShieldCheck className="size-6 text-[#4CAF50]" />,
      title: 'Verification',
      description: 'Automated checks and human review ensure every published price is accurate and traceable.',
    },
    {
      icon: <IconZap className="size-6 text-[#1A6B40]" />,
      title: 'Market Intelligence',
      description: 'Verified prices become sourcing signals, procurement benchmarks and trade opportunities.',
    },
    {
      icon: <IconAward className="size-6 text-[#0B3D2C]" />,
      title: 'Decision Support',
      description: 'Exports, alerts, API access and analyst reports turn data into actionable intelligence.',
    },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6">
        <h2 className="flex items-center gap-2 text-[0.9375rem] font-bold text-[#0B3D2C]">
          <IconZap className="size-5 text-[#E5A020]" />
          How Hatsi360 Works
        </h2>
        <p className="mt-0.5 text-[0.75rem] text-gray-500">From field to intelligence in four steps</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <div
            key={step.title}
            className="relative rounded-xl border border-gray-100 bg-gradient-to-br from-white to-gray-50/50 p-5 transition-all hover:shadow-md hover:border-[#E5A020]/20"
          >
            {/* Step number */}
            <div className="absolute -top-2.5 -right-2.5 flex size-6 items-center justify-center rounded-full bg-[#0B3D2C] text-[0.625rem] font-bold text-[#E5A020] shadow-sm">
              {i + 1}
            </div>
            <div className="mb-3 flex size-12 items-center justify-center rounded-lg bg-[#0B3D2C]/[0.04]">
              {step.icon}
            </div>
            <h3 className="text-[0.8125rem] font-bold text-[#0B3D2C]">{step.title}</h3>
            <p className="mt-1.5 text-[0.75rem] leading-relaxed text-gray-600">{step.description}</p>
            {/* Connector line (hidden on last item) */}
            {i < steps.length - 1 && (
              <div className="absolute top-1/2 -right-2 hidden h-px w-4 bg-gray-200 lg:block" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================ Market Insights ===== */

export interface InsightItem {
  title: string;
  category: string;
  summary: string;
  date: string;
  href: string;
}

export function HomepageInsights({ items }: { items: InsightItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <h2 className="flex items-center gap-2 text-[0.9375rem] font-bold text-[#0B3D2C]">
            <IconBookOpen className="size-5 text-[#E5A020]" />
            Market Insights
          </h2>
          <p className="mt-0.5 text-[0.75rem] text-gray-500">Research, reports and market commentary</p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-8 text-center">
          <IconBookOpen className="mx-auto mb-3 size-8 text-gray-300" />
          <p className="text-[0.8125rem] font-medium text-gray-600">Market insights coming soon</p>
          <p className="mt-1 text-[0.75rem] text-gray-400">Research reports and analysis will appear here as they are published.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-[0.9375rem] font-bold text-[#0B3D2C]">
            <IconBookOpen className="size-5 text-[#E5A020]" />
            Market Insights
          </h2>
          <p className="mt-0.5 text-[0.75rem] text-gray-500">Research, reports and market commentary</p>
        </div>
        <Link href="/insights" className="text-[0.75rem] font-medium text-[#1A6B40] hover:text-[#0B3D2C] transition-colors">
          View all →
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.href + item.title}
            href={item.href}
            className="group rounded-xl border border-gray-100 bg-gradient-to-br from-white to-gray-50/30 p-4 transition-all hover:border-[#E5A020]/30 hover:shadow-md hover:-translate-y-0.5"
          >
            <span className="inline-block rounded-full bg-[#0B3D2C]/[0.06] px-2.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-[#0B3D2C]/70">
              {item.category}
            </span>
            <h3 className="mt-2 text-[0.875rem] font-bold text-[#0B3D2C] group-hover:text-[#E5A020] transition-colors line-clamp-2">
              {item.title}
            </h3>
            <p className="mt-1.5 text-[0.75rem] leading-relaxed text-gray-500 line-clamp-2">{item.summary}</p>
            <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2">
              <span className="text-[0.625rem] text-gray-400">{item.date}</span>
              <IconArrowRight className="size-3.5 text-gray-400 group-hover:text-[#E5A020] transition-colors" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ============================================================ Platform Features ===== */

export function HomepageFeatures() {
  const features = [
    {
      icon: <IconShieldCheck className="size-6 text-[#4CAF50]" />,
      title: 'Verified Data',
      description: 'Every price is field-collected, verified and traceable to source.',
    },
    {
      icon: <IconActivity className="size-6 text-[#E5A020]" />,
      title: 'Real-Time Updates',
      description: 'Fresh market data as agents collect from markets across Nigeria.',
    },
    {
      icon: <IconBarChart className="size-6 text-[#1A6B40]" />,
      title: 'Analytics & Charts',
      description: 'Price trends, market movers and historical analysis tools.',
    },
    {
      icon: <IconCode className="size-6 text-[#0B3D2C]" />,
      title: 'Developer API',
      description: 'Programmatic access to verified market data via REST API.',
    },
    {
      icon: <IconBriefcase className="size-6 text-[#E5A020]" />,
      title: 'Trade Intelligence',
      description: 'Sourcing, procurement and trade decision support tools.',
    },
    {
      icon: <IconBookOpen className="size-6 text-[#1A6B40]" />,
      title: 'Research Reports',
      description: 'Expert analysis, market briefs and seasonal outlooks.',
    },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5">
        <h2 className="flex items-center gap-2 text-[0.9375rem] font-bold text-[#0B3D2C]">
          <IconAward className="size-5 text-[#E5A020]" />
          Platform Features
        </h2>
        <p className="mt-0.5 text-[0.75rem] text-gray-500">Everything you need for agricultural market intelligence</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gradient-to-br from-white to-gray-50/30 p-4 transition-all hover:border-[#E5A020]/20 hover:shadow-sm"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#0B3D2C]/[0.04]">
              {f.icon}
            </div>
            <div>
              <h3 className="text-[0.8125rem] font-bold text-[#0B3D2C]">{f.title}</h3>
              <p className="mt-0.5 text-[0.6875rem] leading-relaxed text-gray-500">{f.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================ CTA Section ===== */

export function HomepageCTA() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[#0B3D2C]/20 bg-gradient-to-br from-[#0B3D2C] via-[#0D4530] to-[#1A6B40] p-6 sm:p-8">
      {/* Decorative circles */}
      <div className="absolute -top-20 -right-20 size-64 rounded-full bg-[#E5A020]/10 blur-3xl" />
      <div className="absolute -bottom-16 -left-16 size-48 rounded-full bg-[#4CAF50]/10 blur-3xl" />

      <div className="relative flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-lg">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1">
            <IconZap className="size-3.5 text-[#E5A020]" />
            <span className="text-[0.6875rem] font-semibold text-white/90">Get Started Today</span>
          </div>
          <h2 className="text-xl font-bold text-white sm:text-2xl">
            Ready for market intelligence you can trust?
          </h2>
          <p className="mt-2 text-[0.875rem] text-white/70">
            Free price discovery. Professional intelligence with exports, alerts and API access.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/pricing" className="inline-flex items-center gap-2 rounded-lg bg-[#E5A020] px-6 py-3 text-[0.8125rem] font-semibold text-white shadow-md shadow-black/20 transition-all hover:bg-[#C88A15] hover:shadow-lg">
            View Plans
            <IconArrowRight className="size-4" />
          </Link>
          <Link href="/api-docs" className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-6 py-3 text-[0.8125rem] font-semibold text-white transition-all hover:bg-white/10">
            <IconCode className="size-4" />
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
