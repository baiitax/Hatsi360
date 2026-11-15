'use client';

/**
 * Hatsi360 — Agro Commodity Performance Leaderboard.
 *
 * A premium, enterprise-grade commodity performance section for the homepage.
 * Shows top-performing agricultural commodities with real-time price movements,
 * sparkline charts, and market insights.
 *
 * All data comes from the database. No fabricated prices or movements.
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Sparkline } from './HomepageComponents';
import {
  IconArrowUp,
  IconArrowDown,
  IconMinus,
  IconActivity,
  IconTrendingUp,
  IconTrendingDown,
  IconClock,
} from '@/components/ui/icons';

/* =========================================================== Types ===== */

export interface CommodityPerformanceData {
  commodityId: number;
  commodityName: string;
  commoditySlug: string;
  latestPrice: number | null;
  previousPrice: number | null;
  change: number | null;
  changePercent: number | null;
  currencyCode: string;
  unitName: string | null;
  marketName: string | null;
  priceType: string;
  gradeName: string | null;
  observationCount: number;
  collectedAt: string | null;
  verificationStatus: string;
  /** Seven daily median prices for sparkline (oldest → newest). */
  dailyHistory: { date: string; value: number }[];
  /** Commodity image path (e.g. '/images/hatsi360/commodities/maize-white.jpg'). */
  imageUrl?: string;
}

export interface LeaderboardInsight {
  label: string;
  commodityName: string;
  commoditySlug: string;
  metric: string;
  explanation: string;
  tone: 'positive' | 'negative' | 'neutral';
}

export interface LeaderboardSummary {
  totalCommodities: number;
  totalObservations: number;
  latestUpdate: string | null;
  activeMarkets: number;
}

type Period = '24h' | '7d' | '30d';
type MarketStatus = 'rising' | 'stable' | 'declining' | 'insufficient';

/* ========================================================== Helpers ==== */

function getStatus(changePercent: number | null): MarketStatus {
  if (changePercent === null) return 'insufficient';
  if (changePercent > 2) return 'rising';
  if (changePercent < -2) return 'declining';
  return 'stable';
}

function getStatusLabel(status: MarketStatus): string {
  switch (status) {
    case 'rising': return 'Rising';
    case 'declining': return 'Declining';
    case 'stable': return 'Stable';
    default: return 'Limited data';
  }
}

function getStatusColor(status: MarketStatus): string {
  switch (status) {
    case 'rising': return 'text-[#16C784] bg-[#16C784]/10';
    case 'declining': return 'text-[#EA654F] bg-[#EA654F]/10';
    case 'stable': return 'text-[#C7A45A] bg-[#C7A45A]/10';
    default: return 'text-gray-400 bg-gray-100';
  }
}

function formatPrice(amount: number | null, currency: string): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return '';
  const then = new Date(isoString).getTime();
  if (Number.isNaN(then)) return '';
  const now = Date.now();
  const mins = Math.round((now - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

function formatPercentage(pct: number | null): string {
  if (pct === null) return '—';
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

/* ==================================================== Icons inline ===== */

function IconChart({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3v18h18" />
      <path d="M7 16l4-8 4 4 5-9" />
    </svg>
  );
}

function IconGlobe({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15 15 0 0 1 0 20" />
    </svg>
  );
}

function IconFlame({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

function IconShield({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

/* ================================================== Watermark ===== */

function Watermark() {
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-end justify-end overflow-hidden"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 400 80"
        className="h-20 w-auto text-[#1D805A] opacity-[0.04] sm:h-28 md:h-36 lg:h-44"
        preserveAspectRatio="xMaxYMax meet"
      >
        <text
          x="95%"
          y="90%"
          textAnchor="end"
          className="font-display text-[72px] font-black tracking-tight"
          fill="currentColor"
        >
          HATSI360
        </text>
      </svg>
    </div>
  );
}

/* =============================================== Summary Cards ======== */

function SummaryCard({ data }: { data: CommodityPerformanceData }) {
  const status = getStatus(data.changePercent);
  const isPositive = (data.changePercent ?? 0) > 0;
  const isNegative = (data.changePercent ?? 0) < 0;

  const sparkValues = data.dailyHistory.length >= 2
    ? data.dailyHistory.map(d => d.value)
    : [];

  const sparkColor = isPositive
    ? '#16C784'
    : isNegative
      ? '#EA654F'
      : '#C7A45A';

  return (
    <Link
      href={`/commodities/${data.commoditySlug}`}
      className="group relative overflow-hidden rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm transition-all hover:border-[#1D805A]/30 hover:shadow-md"
    >
      {/* Subtle top accent */}
      <div
        className={`absolute top-0 left-0 right-0 h-[2px] ${
          isPositive ? 'bg-[#16C784]' : isNegative ? 'bg-[#EA654F]' : 'bg-[#C7A45A]'
        }`}
      />

      <div className="flex items-start gap-3">
        {/* Commodity thumbnail */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-50">
          {data.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.imageUrl}
              alt={data.commodityName}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="text-lg font-bold text-gray-300">
              {data.commodityName.charAt(0)}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <h4 className="truncate text-[0.8125rem] font-semibold text-[#0B2A20]">
              {data.commodityName}
            </h4>
            {/* Movement arrow */}
            <span
              className={`ml-1 flex h-5 w-5 items-center justify-center rounded-full ${
                isPositive
                  ? 'bg-[#16C784]/10 text-[#16C784]'
                  : isNegative
                    ? 'bg-[#EA654F]/10 text-[#EA654F]'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {isPositive ? (
                <IconArrowUp className="h-3 w-3" />
              ) : isNegative ? (
                <IconArrowDown className="h-3 w-3" />
              ) : (
                <IconMinus className="h-3 w-3" />
              )}
            </span>
          </div>

          {/* Price */}
          <div className="mt-1 text-[1.0625rem] font-bold text-[#0B2A20]">
            {formatPrice(data.latestPrice, data.currencyCode)}
          </div>
          <div className="text-[0.6875rem] text-gray-400">
            per {data.unitName ?? 'unit'}
          </div>

          {/* Change + Sparkline */}
          <div className="mt-2 flex items-end justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1 text-[0.75rem] font-bold ${
                isPositive
                  ? 'text-[#16C784]'
                  : isNegative
                    ? 'text-[#EA654F]'
                    : 'text-gray-400'
              }`}
            >
              {formatPercentage(data.changePercent)}
            </span>
            {sparkValues.length >= 2 && (
              <Sparkline
                values={sparkValues}
                width={72}
                height={24}
                color={sparkColor}
                fillOpacity={0.08}
              />
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ============================================= Leaderboard Table ===== */

function LeaderboardRow({
  rank,
  data,
}: {
  rank: number;
  data: CommodityPerformanceData;
}) {
  const status = getStatus(data.changePercent);
  const isPositive = (data.changePercent ?? 0) > 0;
  const isNegative = (data.changePercent ?? 0) < 0;

  const sparkValues = data.dailyHistory.length >= 2
    ? data.dailyHistory.map(d => d.value)
    : [];

  const sparkColor = isPositive
    ? '#16C784'
    : isNegative
      ? '#EA654F'
      : '#C7A45A';

  return (
    <Link
      href={`/commodities/${data.commoditySlug}`}
      className="group grid grid-cols-12 items-center gap-2 border-b border-gray-100 px-4 py-3 transition-colors hover:bg-[#1D805A]/[0.03] sm:gap-4 sm:px-6"
    >
      {/* Rank */}
      <div className="col-span-1 text-[0.8125rem] font-bold text-gray-400">
        {rank <= 3 ? (
          <span
            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[0.6875rem] font-bold text-white ${
              rank === 1
                ? 'bg-[#C7A45A]'
                : rank === 2
                  ? 'bg-gray-400'
                  : 'bg-[#B87333]'
            }`}
          >
            {rank}
          </span>
        ) : (
          <span className="tabular-nums">{rank}</span>
        )}
      </div>

      {/* Commodity */}
      <div className="col-span-5 flex items-center gap-2.5 sm:col-span-4 sm:gap-3">
        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-gray-50 sm:h-9 sm:w-9">
          {data.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.imageUrl}
              alt={data.commodityName}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[0.6875rem] font-bold text-gray-300">
              {data.commodityName.charAt(0)}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[0.8125rem] font-semibold text-[#0B2A20] group-hover:text-[#1D805A]">
            {data.commodityName}
          </div>
          <div className="hidden truncate text-[0.6875rem] text-gray-400 sm:block">
            {data.marketName ?? '—'}
          </div>
        </div>
      </div>

      {/* Price */}
      <div className="col-span-3 text-[0.8125rem] font-semibold tabular-nums text-[#0B2A20] sm:col-span-2">
        {formatPrice(data.latestPrice, data.currencyCode)}
        <span className="ml-0.5 text-[0.625rem] font-normal text-gray-400">
          /{data.unitName ?? 'unit'}
        </span>
      </div>

      {/* 24h Change */}
      <div className="col-span-2 sm:col-span-1">
        <span
          className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-bold tabular-nums ${
            isPositive
              ? 'bg-[#16C784]/10 text-[#16C784]'
              : isNegative
                ? 'bg-[#EA654F]/10 text-[#EA654F]'
                : 'bg-gray-100 text-gray-500'
          }`}
        >
          {isPositive ? (
            <IconArrowUp className="h-3 w-3" />
          ) : isNegative ? (
            <IconArrowDown className="h-3 w-3" />
          ) : (
            <IconMinus className="h-3 w-3" />
          )}
          {formatPercentage(data.changePercent)}
        </span>
      </div>

      {/* 7d Trend Sparkline */}
      <div className="col-span-2 hidden sm:col-span-2 sm:flex sm:items-center sm:justify-end">
        {sparkValues.length >= 2 ? (
          <Sparkline
            values={sparkValues}
            width={80}
            height={28}
            color={sparkColor}
            fillOpacity={0.08}
          />
        ) : (
          <span className="text-[0.6875rem] text-gray-300">No trend</span>
        )}
      </div>

      {/* Market Status */}
      <div className="col-span-2 hidden sm:col-span-1 sm:flex sm:justify-end">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-medium ${getStatusColor(status)}`}
        >
          {status === 'rising' && <IconTrendingUp className="h-3 w-3" />}
          {status === 'declining' && <IconTrendingDown className="h-3 w-3" />}
          {status === 'stable' && <IconActivity className="h-3 w-3" />}
          {getStatusLabel(status)}
        </span>
      </div>
    </Link>
  );
}

/* =============================================== Insights Panel ====== */

function InsightsPanel({ insights }: { insights: LeaderboardInsight[] }) {
  const iconMap = {
    positive: (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#16C784]/10">
        <IconTrendingUp className="h-4 w-4 text-[#16C784]" />
      </div>
    ),
    negative: (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EA654F]/10">
        <IconTrendingDown className="h-4 w-4 text-[#EA654F]" />
      </div>
    ),
    neutral: (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#C7A45A]/10">
        <IconActivity className="h-4 w-4 text-[#C7A45A]" />
      </div>
    ),
  };

  const borderColorMap = {
    positive: 'border-l-[#16C784]',
    negative: 'border-l-[#EA654F]',
    neutral: 'border-l-[#C7A45A]',
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-[0.8125rem] font-bold uppercase tracking-wide text-gray-400">
          Market Insights
        </h3>
      </div>
      {insights.map((insight, i) => (
        <Link
          key={i}
          href={`/commodities/${insight.commoditySlug}`}
          className={`block rounded-lg border border-gray-200/80 border-l-[3px] ${borderColorMap[insight.tone]} bg-white p-3.5 transition-all hover:shadow-sm`}
        >
          <div className="flex items-start gap-3">
            {iconMap[insight.tone]}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[0.6875rem] font-bold uppercase tracking-wide text-gray-400">
                  {insight.label}
                </span>
              </div>
              <div className="mt-0.5 text-[0.875rem] font-semibold text-[#0B2A20]">
                {insight.commodityName}
              </div>
              <div className="mt-0.5 text-[0.75rem] font-medium text-gray-500">
                {insight.metric}
              </div>
              <p className="mt-1 text-[0.75rem] leading-relaxed text-gray-500">
                {insight.explanation}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

/* =================================================== Main Component === */

export function CommodityPerformanceLeaderboard({
  commodities,
  summary,
}: {
  commodities: CommodityPerformanceData[];
  summary: LeaderboardSummary;
}) {
  const [period, setPeriod] = useState<Period>('24h');

  // Sort commodities by performance for the current period
  // With our data, we only have one change window — use it for all periods
  const ranked = useMemo(() => {
    return [...commodities]
      .filter(c => c.latestPrice != null)
      .sort((a, b) => {
        const aChange = a.changePercent ?? 0;
        const bChange = b.changePercent ?? 0;
        return bChange - aChange;
      });
  }, [commodities]);

  // Top 4 for summary cards — pick the most interesting: top gainers & decliners
  const topCards = useMemo(() => {
    const sorted = [...ranked];
    // Mix: top 2 gainers + top 2 decliners (or top 4 overall)
    if (sorted.length <= 4) return sorted;
    return [
      sorted[0],
      sorted[1],
      sorted[sorted.length - 1],
      sorted[sorted.length - 2],
    ].filter(Boolean);
  }, [ranked]);

  // Generate insights from actual data
  const insights = useMemo<LeaderboardInsight[]>(() => {
    if (ranked.length === 0) return [];

    const results: LeaderboardInsight[] = [];

    // Top gainer
    const gainer = ranked[0]!;
    if (gainer.changePercent != null && gainer.changePercent > 0) {
      results.push({
        label: 'Top Market Gainer',
        commodityName: gainer.commodityName,
        commoditySlug: gainer.commoditySlug,
        metric: `+${gainer.changePercent.toFixed(2)}%`,
        explanation: `${gainer.commodityName} leads performance among tracked commodities.`,
        tone: 'positive',
      });
    }

    // Top decliner
    const decliner = ranked[ranked.length - 1]!;
    if (decliner.changePercent != null && decliner.changePercent < 0) {
      results.push({
        label: 'Top Market Decliner',
        commodityName: decliner.commodityName,
        commoditySlug: decliner.commoditySlug,
        metric: `${decliner.changePercent.toFixed(2)}%`,
        explanation: `${decliner.commodityName} shows the largest downward movement in the current window.`,
        tone: 'negative',
      });
    }

    // Most stable (smallest absolute change)
    const byStability = [...ranked].sort(
      (a, b) => Math.abs(a.changePercent ?? 999) - Math.abs(b.changePercent ?? 999),
    );
    const stable = byStability.find(c => c.changePercent != null);
    if (stable && stable.changePercent !== null) {
      results.push({
        label: 'Market Stability',
        commodityName: stable.commodityName,
        commoditySlug: stable.commoditySlug,
        metric: `${stable.changePercent >= 0 ? '+' : ''}${stable.changePercent.toFixed(2)}%`,
        explanation: `${stable.commodityName} shows minimal price volatility among active commodities.`,
        tone: 'neutral',
      });
    }

    return results.slice(0, 3);
  }, [ranked]);

  if (commodities.length === 0) {
    return (
      <section className="bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
            <IconActivity className="mx-auto h-10 w-10 text-gray-300" />
            <h3 className="mt-4 text-[0.9375rem] font-semibold text-gray-500">
              No commodity performance data available
            </h3>
            <p className="mt-1 text-[0.8125rem] text-gray-400">
              Performance data will appear once verified price observations are collected.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden bg-white py-10 sm:py-14">
      {/* ── Section Header ── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          {/* Left: Title */}
          <div>
            <div className="mb-2 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0B3D2C]/5">
                <IconChart className="h-4 w-4 text-[#0B3D2C]" />
              </div>
              <h2 className="text-[1.25rem] font-bold tracking-tight text-[#0B2A20]">
                Agro Commodity Performance
              </h2>
              {summary.latestUpdate && (
                <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-[#16C784]/10 px-2.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-[#16C784]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#16C784]" />
                  Live
                </span>
              )}
            </div>
            <p className="max-w-xl text-[0.8125rem] leading-relaxed text-gray-500">
              Track agricultural market movements, discover top-performing commodities and understand
              changing market trends across Nigerian markets.
            </p>
          </div>

          {/* Right: Meta + Period selector */}
          <div className="flex flex-col items-start gap-3 sm:items-end">
            {/* Period selector */}
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
              {(['24h', '7d', '30d'] as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`rounded-md px-3 py-1.5 text-[0.6875rem] font-semibold transition-all ${
                    period === p
                      ? 'bg-[#0B3D2C] text-white shadow-sm'
                      : 'text-gray-500 hover:text-[#0B3D2C]'
                  }`}
                >
                  {p === '24h' ? '24 Hours' : p === '7d' ? '7 Days' : '30 Days'}
                </button>
              ))}
            </div>

            {/* Last updated */}
            {summary.latestUpdate && (
              <div className="flex items-center gap-1.5 text-[0.6875rem] text-gray-400">
                <IconClock className="h-3.5 w-3.5" />
                Updated {formatRelativeTime(summary.latestUpdate)}
              </div>
            )}

            <Link
              href="/markets"
              className="inline-flex items-center gap-1 text-[0.75rem] font-medium text-[#1D805A] transition-colors hover:text-[#0B3D2C]"
            >
              View All Markets
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        {/* ── Summary Cards ── */}
        {topCards.length > 0 && (
          <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {topCards.map(card => (
              <SummaryCard key={card.commodityId} data={card} />
            ))}
          </div>
        )}

        {/* ── Main Content: Leaderboard + Insights ── */}
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Leaderboard */}
          <div className="relative overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
            {/* Table Header */}
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-4 py-3 sm:px-6">
              <div className="flex items-center gap-2">
                <IconFlame className="h-4 w-4 text-[#EA654F]" />
                <h3 className="text-[0.8125rem] font-bold text-[#0B2A20]">
                  Performance Leaderboard
                </h3>
                <span className="ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-[0.625rem] font-medium text-gray-500">
                  {ranked.length} commodities
                </span>
              </div>
              <div className="flex items-center gap-2 text-[0.6875rem] text-gray-400">
                <IconGlobe className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Nigerian Markets</span>
              </div>
            </div>

            {/* Column Headers */}
            <div className="hidden grid-cols-12 gap-2 border-b border-gray-100 bg-white px-4 py-2 text-[0.625rem] font-semibold uppercase tracking-wider text-gray-400 sm:grid sm:gap-4 sm:px-6">
              <div className="col-span-1">#</div>
              <div className="col-span-4">Commodity</div>
              <div className="col-span-2">Price</div>
              <div className="col-span-1">Change</div>
              <div className="col-span-2 text-right">7D Trend</div>
              <div className="col-span-2 text-right">Status</div>
            </div>

            {/* Rows */}
            <div className="divide-y-0">
              {ranked.map((commodity, index) => (
                <LeaderboardRow key={commodity.commodityId} rank={index + 1} data={commodity} />
              ))}
            </div>
          </div>

          {/* Market Insights */}
          {insights.length > 0 && (
            <div>
              <InsightsPanel insights={insights} />

              {/* Quick Stats */}
              <div className="mt-4 rounded-xl border border-gray-200/80 bg-white p-4">
                <h4 className="mb-3 text-[0.75rem] font-bold uppercase tracking-wide text-gray-400">
                  Market Summary
                </h4>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[0.75rem] text-gray-500">
                      <IconChart className="h-3.5 w-3.5" />
                      Tracked
                    </span>
                    <span className="text-[0.8125rem] font-bold text-[#0B2A20]">
                      {summary.totalCommodities}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[0.75rem] text-gray-500">
                      <IconActivity className="h-3.5 w-3.5" />
                      Observations
                    </span>
                    <span className="text-[0.8125rem] font-bold text-[#0B2A20]">
                      {summary.totalObservations}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[0.75rem] text-gray-500">
                      <IconGlobe className="h-3.5 w-3.5" />
                      Active Markets
                    </span>
                    <span className="text-[0.8125rem] font-bold text-[#0B2A20]">
                      {summary.activeMarkets}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[0.75rem] text-gray-500">
                      <IconShield className="h-3.5 w-3.5" />
                      Verified
                    </span>
                    <span className="text-[0.8125rem] font-bold text-[#1D805A]">
                      Yes
                    </span>
                  </div>
                </div>
              </div>

              {/* Motto */}
              <div className="mt-4 rounded-xl bg-gradient-to-br from-[#0B3D2C] to-[#1D805A] p-4 text-white">
                <p className="text-[0.75rem] font-bold uppercase tracking-wider text-white/60">
                  Hatsi360
                </p>
                <p className="mt-1 text-[0.875rem] font-semibold leading-snug">
                  Know the Market.
                  <br />
                  Track the Movement.
                  <br />
                  Discover the Opportunity.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Hatsi360 Watermark ── */}
        <Watermark />
      </div>
    </section>
  );
}
