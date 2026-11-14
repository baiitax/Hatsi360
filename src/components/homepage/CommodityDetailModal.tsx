/**
 * Hatsi360 — Commodity Detail Modal.
 *
 * Client-side modal that shows detailed commodity information with an
 * interactive candlestick chart. Features:
 *  - Backdrop blur overlay
 *  - Commodity header with name, market, grade
 *  - Key stats (price, change, high, low, observations)
 *  - Time range selector (Daily, Weekly, Monthly, Quarterly)
 *  - Interactive candlestick chart
 *  - Action buttons
 *  - Keyboard support (Escape to close)
 *  - Body scroll lock
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  IconClose,
  IconArrowUp,
  IconArrowDown,
  IconMinus,
  IconExternal,
  IconActivity,
  IconDatabase,
  IconUsers,
  IconClock,
} from '@/components/ui/icons';
import { CandlestickChart, type CandleData } from '@/components/charts/CandlestickChart';

export interface CommodityDetail {
  id: string;
  commodityName: string;
  commoditySlug: string;
  commodityId: number;
  marketName: string | null;
  marketSlug: string | null;
  marketId: number | null;
  amount: number | null;
  currencyCode: string;
  unitLabel: string | null;
  priceTypeLabel: string | null;
  gradeName: string | null;
  changePercent: number | null;
  observedAt: string | null;
  verificationStatus: string;
  href?: string;
}

type Timeframe = 'daily' | 'weekly' | 'monthly' | 'quarterly';

const TIMEFRAME_OPTIONS: { value: Timeframe; label: string; short: string }[] = [
  { value: 'daily', label: 'Daily', short: '1D' },
  { value: 'weekly', label: 'Weekly', short: '1W' },
  { value: 'monthly', label: 'Monthly', short: '1M' },
  { value: 'quarterly', label: 'Quarterly', short: '1Q' },
];

export function CommodityDetailModal({
  commodity,
  onClose,
}: {
  commodity: CommodityDetail;
  onClose: () => void;
}) {
  const [timeframe, setTimeframe] = useState<Timeframe>('daily');
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch candle data when timeframe changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      commodityId: String(commodity.commodityId),
      timeframe,
    });
    if (commodity.marketId) {
      params.set('marketId', String(commodity.marketId));
    }

    fetch(`/api/v1/charts/commodity?${params.toString()}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(data => {
        if (cancelled) return;
        if (data.candles && Array.isArray(data.candles)) {
          setCandles(data.candles);
        } else {
          setCandles([]);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError('Could not load chart data');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [commodity.commodityId, commodity.marketId, timeframe]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: commodity.currencyCode,
      maximumFractionDigits: 0,
    }).format(amount);

  // Calculate stats from candles
  const stats = (() => {
    if (candles.length === 0) return null;
    let high = -Infinity;
    let low = Infinity;
    let totalObs = 0;
    for (const c of candles) {
      if (c.high > high) high = c.high;
      if (c.low < low) low = c.low;
      totalObs += c.observationCount;
    }
    const first = candles[0];
    const last = candles[candles.length - 1];
    const periodChange = first && last && first.open !== 0
      ? ((last.close - first.open) / first.open) * 100
      : null;
    return { high, low, totalObs, periodChange, firstDate: first.periodStart, lastDate: last.periodStart };
  })();

  const movementConfig = getMovementConfig(commodity.changePercent);

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm sm:p-6 lg:p-10" onClick={onClose}>
      {/* Modal content */}
      <div
        className="relative w-full max-w-3xl rounded-2xl border border-gray-200 bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-[1.25rem] font-bold text-[#0B3D2C]">
              {commodity.commodityName}
            </h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[0.75rem] text-gray-500">
              {commodity.marketName && (
                <span className="flex items-center gap-1">
                  <IconUsers className="size-3" />
                  {commodity.marketName}
                </span>
              )}
              {commodity.gradeName && (
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[0.625rem] font-medium">
                  {commodity.gradeName}
                </span>
              )}
              {commodity.priceTypeLabel && (
                <span className="text-gray-400">{commodity.priceTypeLabel}</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex size-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <IconClose className="size-5" />
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-px bg-gray-100 sm:grid-cols-4">
          <StatCell
            label="Latest Price"
            value={commodity.amount !== null ? formatPrice(commodity.amount) : '—'}
            sub={commodity.unitLabel ? `per ${commodity.unitLabel}` : undefined}
            icon={<IconActivity className="size-4 text-[#E5A020]" />}
          />
          <StatCell
            label="Movement"
            value={movementConfig.label}
            sub={commodity.observedAt ? `Updated ${formatRelative(commodity.observedAt)}` : undefined}
            icon={movementConfig.icon}
            tone={movementConfig.tone}
          />
          <StatCell
            label={timeframe === 'daily' ? 'Day High / Low' : 'Period High / Low'}
            value={stats && stats.high !== -Infinity ? `${formatPrice(stats.high)}` : '—'}
            sub={stats && stats.low !== Infinity ? `Low: ${formatPrice(stats.low)}` : 'Loading...'}
            icon={<IconArrowUp className="size-4 text-[#1A6B40]" />}
          />
          <StatCell
            label="Observations"
            value={stats ? stats.totalObs.toLocaleString() : '—'}
            sub={stats !== null && stats.periodChange !== null ? `${stats.periodChange >= 0 ? '+' : ''}${stats.periodChange.toFixed(1)}% period` : 'Loading...'}
            icon={<IconDatabase className="size-4 text-[#0B3D2C]" />}
          />
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3">
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            {TIMEFRAME_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTimeframe(opt.value)}
                className={`rounded-md px-3 py-1.5 text-[0.6875rem] font-semibold transition-all ${
                  timeframe === opt.value
                    ? 'bg-[#0B3D2C] text-white shadow-sm'
                    : 'text-gray-500 hover:text-[#0B3D2C]'
                }`}
              >
                {opt.short}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-[0.625rem] text-gray-400">
            <IconClock className="size-3" />
            {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} candles
          </div>
        </div>

        {/* Chart */}
        <div className="px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 py-20">
              <div className="flex items-center gap-2">
                <div className="size-4 animate-spin rounded-full border-2 border-[#0B3D2C] border-t-transparent" />
                <span className="text-[0.75rem] text-gray-500">Loading chart data...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 py-16">
              <p className="text-[0.8125rem] font-medium text-red-700">{error}</p>
              <button
                type="button"
                onClick={() => setTimeframe(timeframe)}
                className="mt-2 rounded-lg bg-red-100 px-3 py-1.5 text-[0.6875rem] font-medium text-red-700 hover:bg-red-200"
              >
                Retry
              </button>
            </div>
          ) : candles.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 py-16">
              <IconActivity className="mb-3 size-10 text-gray-300" />
              <p className="text-[0.8125rem] font-medium text-gray-600">No candle data available</p>
              <p className="mt-1 max-w-sm text-center text-[0.6875rem] text-gray-400">
                {timeframe === 'daily'
                  ? 'Not enough daily observations yet. Try a longer timeframe.'
                  : 'This timeframe requires more historical data than currently available.'}
              </p>
            </div>
          ) : (
            <CandlestickChart
              candles={candles}
              currency={commodity.currencyCode}
              unit={commodity.unitLabel ?? 'unit'}
              height={280}
            />
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/50 px-6 py-3.5">
          <div className="flex items-center gap-2 text-[0.625rem] text-gray-400">
            <span className={`size-2 rounded-full ${
              commodity.verificationStatus === 'verified' ? 'bg-[#4CAF50]' : 'bg-[#E5A020]'
            }`} />
            <span className="font-medium capitalize">{commodity.verificationStatus}</span>
            <span>·</span>
            <span>{commodity.currencyCode} {commodity.unitLabel && `/ ${commodity.unitLabel}`}</span>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/commodities/${commodity.commoditySlug}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[0.75rem] font-medium text-[#0B3D2C] transition-all hover:border-[#E5A020]/40 hover:shadow-sm"
              onClick={onClose}
            >
              Full Profile
              <IconExternal className="size-3" />
            </Link>
            <Link
              href={`/charts?commodity=${commodity.commoditySlug}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B3D2C] px-3 py-1.5 text-[0.75rem] font-medium text-white transition-all hover:bg-[#1A6B40]"
              onClick={onClose}
            >
              Open Chart
              <IconExternal className="size-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================ Helpers ===== */

function StatCell({
  label,
  value,
  sub,
  icon,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  tone?: 'neutral' | 'positive' | 'negative';
}) {
  const valueColor =
    tone === 'positive' ? 'text-[#1A6B40]' : tone === 'negative' ? 'text-red-600' : 'text-[#0B3D2C]';

  return (
    <div className="bg-white px-5 py-4">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[0.625rem] font-medium text-gray-500">{label}</span>
      </div>
      <div className={`mt-1.5 figure-num text-lg font-extrabold tracking-tight ${valueColor}`}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[0.625rem] text-gray-400">{sub}</div>}
    </div>
  );
}

function getMovementConfig(changePercent: number | null) {
  if (changePercent === null) {
    return {
      label: '—',
      icon: <IconMinus className="size-4 text-gray-400" />,
      tone: 'neutral' as const,
    };
  }
  if (changePercent > 0) {
    return {
      label: `+${changePercent.toFixed(1)}%`,
      icon: <IconArrowUp className="size-4 text-[#1A6B40]" />,
      tone: 'positive' as const,
    };
  }
  if (changePercent < 0) {
    return {
      label: `${changePercent.toFixed(1)}%`,
      icon: <IconArrowDown className="size-4 text-red-500" />,
      tone: 'negative' as const,
    };
  }
  return {
    label: '0.0%',
    icon: <IconMinus className="size-4 text-gray-400" />,
    tone: 'neutral' as const,
  };
}

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
