/**
 * Hatsi360 Homepage — Live analytics and market intelligence components.
 *
 * These components power the redesigned homepage with Afex-inspired
 * professional market intelligence presentation. Every figure comes
 * from the database; nothing is fabricated.
 */

import Link from 'next/link';
import type { ReactNode } from 'react';

/* ============================================================ Sparkline ===== */

/**
 * A tiny inline SVG sparkline.
 * Renders a polyline from an array of numeric values.
 * Used in price cards and the market ticker.
 */
export function Sparkline({
  values,
  width = 120,
  height = 32,
  color = 'currentColor',
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
      {/* Endpoint dot */}
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

/**
 * A horizontal scrolling price ticker, like financial market terminals.
 */
export function MarketTicker({ items }: { items: TickerItem[] }) {
  if (items.length === 0) return null;

  const formatPrice = (amount: number, currency: string) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="relative overflow-hidden border-y border-terminal-border bg-terminal-surface">
      <div className="flex animate-[ticker_40s_linear_infinite] gap-0 whitespace-nowrap py-2.5">
        {[...items, ...items].map((item, i) => (
          <div
            key={`${item.commodity}-${i}`}
            className="inline-flex items-center gap-2.5 border-r border-terminal-border px-5"
          >
            <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-terminal-text-secondary">
              {item.commodity}
            </span>
            <span className="figure-num text-[0.8125rem] font-bold text-terminal-text">
              {formatPrice(item.price, item.currency)}
            </span>
            <span className="text-[0.6875rem] text-terminal-text-muted">
              /{item.unit}
            </span>
            {item.change !== null && (
              <span
                className={`inline-flex items-center gap-0.5 text-[0.6875rem] font-semibold ${
                  item.change > 0
                    ? 'text-move-up'
                    : item.change < 0
                      ? 'text-move-down'
                      : 'text-move-flat'
                }`}
              >
                <span aria-hidden="true">
                  {item.change > 0 ? '▲' : item.change < 0 ? '▼' : '–'}
                </span>
                {Math.abs(item.change).toFixed(1)}%
              </span>
            )}
            {item.market && (
              <span className="text-[0.625rem] text-terminal-text-muted">
                {item.market}
              </span>
            )}
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
    <div className="relative overflow-hidden border-b border-terminal-border bg-terminal-bg">
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }} />

      <div className="relative px-4 py-12 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            {/* Left: Copy */}
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-terminal-border bg-terminal-surface px-3 py-1">
                <span className="size-2 animate-pulse rounded-full bg-leaf-500" />
                <span className="text-[0.6875rem] font-medium text-terminal-text-secondary">
                  Market Intelligence Platform
                </span>
              </div>

              <h1 className="font-display text-3xl font-extrabold tracking-tight text-terminal-text sm:text-4xl lg:text-5xl">
                African Agricultural
                <span className="block text-brand-400">Market Intelligence</span>
              </h1>

              <p className="mt-4 max-w-lg text-[0.9375rem] leading-relaxed text-terminal-text-secondary">
                Verified commodity prices collected in the field, analysed for
                sourcing, procurement and trade decisions. Every figure traces
                back to a person, a market and a moment.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/prices"
                  className="inline-flex items-center gap-2 rounded-control bg-brand-600 px-5 py-2.5 text-[0.8125rem] font-semibold text-white transition-colors hover:bg-brand-500"
                >
                  Explore Prices
                  <span aria-hidden="true">→</span>
                </Link>
                <Link
                  href="/trade/terminal"
                  className="inline-flex items-center gap-2 rounded-control border border-terminal-border bg-terminal-surface px-5 py-2.5 text-[0.8125rem] font-semibold text-terminal-text transition-colors hover:bg-terminal-interactive"
                >
                  Trade Terminal
                </Link>
                <Link
                  href="/commodities"
                  className="inline-flex items-center gap-2 rounded-control border border-terminal-border px-5 py-2.5 text-[0.8125rem] font-semibold text-terminal-text-secondary transition-colors hover:bg-terminal-interactive hover:text-terminal-text"
                >
                  Commodities
                </Link>
              </div>
            </div>

            {/* Right: Live stats panel */}
            <div className="rounded-panel border border-terminal-border bg-terminal-surface p-5 shadow-terminal">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[0.8125rem] font-bold uppercase tracking-wider text-terminal-text-secondary">
                  Platform Overview
                </h2>
                <span className="text-[0.625rem] text-terminal-text-muted">
                  {latestObservedAt ? `Updated ${formatRelative(latestObservedAt)}` : 'Live'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <StatBlock
                  value={publishedCount.toLocaleString()}
                  label="Published Prices"
                  accent={publishedCount > 0}
                />
                <StatBlock
                  value={commodityCount.toLocaleString()}
                  label="Commodities"
                  accent
                />
                <StatBlock
                  value={marketCount.toLocaleString()}
                  label="Markets"
                  accent
                />
              </div>

              <div className="mt-4 border-t border-terminal-border pt-3">
                <p className="text-[0.6875rem] leading-relaxed text-terminal-text-muted">
                  {coverageLine}
                </p>
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
      <div className={`figure-num text-2xl font-extrabold tracking-tight ${accent ? 'text-brand-400' : 'text-terminal-text'}`}>
        {value}
      </div>
      <div className="mt-0.5 text-[0.6875rem] text-terminal-text-muted">{label}</div>
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
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);

  const changeColor =
    data.change === null ? 'text-move-flat'
    : data.change > 0 ? 'text-move-up'
    : data.change < 0 ? 'text-move-down'
    : 'text-move-flat';

  const sparkColor =
    data.change === null ? '#748278'
    : data.change > 0 ? '#2f8f57'
    : data.change < 0 ? '#d0584f'
    : '#748278';

  return (
    <Link
      href={`/commodities/${data.commoditySlug}`}
      className="group flex flex-col rounded-panel border border-terminal-border bg-terminal-surface p-4 transition-all hover:border-brand-600/40 hover:shadow-terminal-lift"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-[0.875rem] font-bold text-terminal-text group-hover:text-brand-400 transition-colors">
            {data.commodityName}
          </h3>
          {data.marketName && (
            <p className="mt-0.5 text-[0.6875rem] text-terminal-text-muted">
              {data.marketName}
            </p>
          )}
        </div>
        {data.change !== null && (
          <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${
            data.change > 0 ? 'bg-move-up-soft text-move-up'
            : data.change < 0 ? 'bg-move-down-soft text-move-down'
            : 'bg-terminal-interactive text-move-flat'
          }`}>
            <span aria-hidden="true">
              {data.change > 0 ? '▲' : data.change < 0 ? '▼' : '–'}
            </span>
            {Math.abs(data.change).toFixed(1)}%
          </span>
        )}
      </div>

      {/* Price + Sparkline */}
      <div className="mt-3 flex items-end justify-between">
        <div>
          {data.price !== null ? (
            <>
              <div className="figure-num text-xl font-extrabold tracking-tight text-terminal-text">
                {formatPrice(data.price, data.currency)}
              </div>
              <div className="text-[0.625rem] text-terminal-text-muted">
                per {data.unit}
              </div>
            </>
          ) : (
            <div className="text-sm text-terminal-text-muted">No data yet</div>
          )}
        </div>
        <Sparkline
          values={data.sparklineValues}
          width={80}
          height={28}
          color={sparkColor}
        />
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between border-t border-terminal-border pt-2.5">
        {data.priceTypeLabel && (
          <span className="text-[0.625rem] text-terminal-text-muted">
            {data.priceTypeLabel}
          </span>
        )}
        {data.observedAt && (
          <span className="text-[0.625rem] text-terminal-text-muted">
            {formatRelative(data.observedAt)}
          </span>
        )}
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
    <div className="rounded-panel border border-terminal-border bg-terminal-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[0.8125rem] font-bold uppercase tracking-wider text-terminal-text-secondary">
          Market Analytics
        </h2>
        <span className="rounded-full bg-terminal-interactive px-2 py-0.5 text-[0.625rem] text-terminal-text-muted">
          Last 7 days
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <AnalyticsCard
          label="Total Observations"
          value={data.totalObservations.toLocaleString()}
          trend={data.priceTrend}
          trendColor="#2f8f57"
        />
        <AnalyticsCard
          label="Verified Today"
          value={data.verifiedToday.toLocaleString()}
          trend={data.verificationTrend}
          trendColor="#d5a441"
        />
        <AnalyticsCard
          label="Active Markets"
          value={data.activeMarkets.toLocaleString()}
          trend={[]}
          trendColor="#5b9a57"
        />
        <AnalyticsCard
          label="Pending Review"
          value={data.pendingVerification.toLocaleString()}
          trend={[]}
          trendColor="#d0584f"
        />
      </div>
    </div>
  );
}

function AnalyticsCard({
  label,
  value,
  trend,
  trendColor,
}: {
  label: string;
  value: string;
  trend: number[];
  trendColor: string;
}) {
  return (
    <div className="rounded-control border border-terminal-border bg-terminal-bg p-3">
      <div className="text-[0.6875rem] text-terminal-text-muted">{label}</div>
      <div className="mt-1 flex items-end justify-between">
        <span className="figure-num text-xl font-extrabold tracking-tight text-terminal-text">
          {value}
        </span>
        {trend.length > 1 && (
          <Sparkline values={trend} width={48} height={20} color={trendColor} />
        )}
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
  title,
  commodityName,
  points,
  currency,
  unit,
}: {
  title: string;
  commodityName: string;
  points: TrendPoint[];
  currency: string;
  unit: string;
}) {
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
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);

  // Y-axis ticks
  const yTicks = Array.from({ length: 4 }, (_, i) => min + (range * i) / 3);

  return (
    <div className="rounded-panel border border-terminal-border bg-terminal-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-[0.875rem] font-bold text-terminal-text">{title}</h3>
          <p className="text-[0.6875rem] text-terminal-text-muted">
            {commodityName} · {currency}/{unit}
          </p>
        </div>
        <div className="text-right">
          <div className="figure-num text-lg font-extrabold text-terminal-text">
            {formatPrice(points[points.length - 1].value)}
          </div>
          <div className="text-[0.625rem] text-terminal-text-muted">Latest</div>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {yTicks.map((tick, i) => {
          const y = padding.top + chartH - ((tick - min) / range) * chartH;
          return (
            <g key={i}>
              <line
                x1={padding.left} y1={y}
                x2={padding.left + chartW} y2={y}
                stroke="currentColor"
                strokeOpacity={0.06}
                strokeWidth={1}
              />
              <text
                x={padding.left - 8}
                y={y + 3}
                textAnchor="end"
                className="fill-terminal-text-muted"
                fontSize="9"
              >
                {formatPrice(tick)}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill="#2f8f57" fillOpacity={0.08} />

        {/* Line */}
        <path d={linePath} fill="none" stroke="#2f8f57" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {/* Endpoint */}
        <circle
          cx={padding.left + chartW}
          cy={padding.top + chartH - ((points[points.length - 1].value - min) / range) * chartH}
          r={4}
          fill="#2f8f57"
        />

        {/* X-axis labels */}
        {[0, Math.floor(points.length / 2), points.length - 1].map((idx) => {
          if (!points[idx]) return null;
          const x = padding.left + (idx / (points.length - 1)) * chartW;
          const date = new Date(points[idx].date);
          return (
            <text
              key={idx}
              x={x}
              y={height - 5}
              textAnchor={idx === 0 ? 'start' : idx === points.length - 1 ? 'end' : 'middle'}
              className="fill-terminal-text-muted"
              fontSize="9"
            >
              {date.toLocaleDateString('en-NG', { day: '2-digit', month: 'short' })}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

/* ============================================================ Coverage Section ===== */

export function HomepageCoverage({
  rows,
}: {
  rows: { label: string; count: number; detail: string; href?: string }[];
}) {
  const maxCount = Math.max(...rows.map(r => r.count), 1);

  return (
    <div className="rounded-panel border border-terminal-border bg-terminal-surface p-5">
      <h2 className="mb-4 text-[0.8125rem] font-bold uppercase tracking-wider text-terminal-text-secondary">
        Platform Coverage
      </h2>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-4">
            <div className="w-48 shrink-0">
              <div className="text-[0.8125rem] font-medium text-terminal-text">{row.label}</div>
              <div className="text-[0.625rem] text-terminal-text-muted">{row.detail}</div>
            </div>
            <div className="flex-1">
              <div className="h-2.5 overflow-hidden rounded-full bg-terminal-interactive">
                <div
                  className="h-full rounded-full bg-brand-600 transition-all"
                  style={{ width: `${Math.max((row.count / maxCount) * 100, 2)}%` }}
                />
              </div>
            </div>
            <div className="figure-num w-16 text-right text-[0.875rem] font-bold text-terminal-text">
              {row.count.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================ How It Works ===== */

export function HomepageHowItWorks() {
  const steps = [
    {
      icon: '◉',
      title: 'Field Collection',
      description: 'Market agents record prices at assigned markets with grade, unit, price type and evidence.',
    },
    {
      icon: '✓',
      title: 'Verification',
      description: 'Automated checks and human review ensure every published price is accurate and traceable.',
    },
    {
      icon: '◈',
      title: 'Market Intelligence',
      description: 'Verified prices become sourcing signals, procurement benchmarks and trade opportunities.',
    },
    {
      icon: '▤',
      title: 'Decision Support',
      description: 'Exports, alerts, API access and analyst reports turn data into actionable intelligence.',
    },
  ];

  return (
    <div className="rounded-panel border border-terminal-border bg-terminal-surface p-5">
      <h2 className="mb-5 text-[0.8125rem] font-bold uppercase tracking-wider text-terminal-text-secondary">
        How Hatsi360 Works
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <div key={step.title} className="relative rounded-control border border-terminal-border bg-terminal-bg p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-brand-700 text-[0.75rem] font-bold text-brand-300">
                {i + 1}
              </span>
              <span className="text-[0.8125rem] font-bold text-terminal-text">{step.title}</span>
            </div>
            <p className="text-[0.75rem] leading-relaxed text-terminal-text-secondary">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================ CTA Section ===== */

export function HomepageCTA() {
  return (
    <div className="rounded-panel border border-brand-700/30 bg-gradient-to-br from-terminal-surface to-terminal-bg p-6">
      <div className="flex flex-col items-start gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-bold text-terminal-text">
            Ready for market intelligence you can trust?
          </h2>
          <p className="mt-1 text-[0.8125rem] text-terminal-text-secondary">
            Free price discovery. Professional intelligence with exports, alerts and API access.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-control bg-brand-600 px-5 py-2.5 text-[0.8125rem] font-semibold text-white transition-colors hover:bg-brand-500"
          >
            View Plans
          </Link>
          <Link
            href="/api-docs"
            className="inline-flex items-center gap-2 rounded-control border border-terminal-border px-5 py-2.5 text-[0.8125rem] font-semibold text-terminal-text-secondary transition-colors hover:bg-terminal-interactive hover:text-terminal-text"
          >
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
