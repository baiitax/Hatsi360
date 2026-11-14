/**
 * Hatsi360 — Professional Market Watch component.
 *
 * A light-themed, professional replacement for the terminal-styled market watch.
 * Designed for the homepage with:
 *  - Professional table layout with icons
 *  - Sparkline price trends per commodity
 *  - Color-coded movement indicators
 *  - Responsive card layout on mobile
 *  - Proper verification status badges
 *  - Brand color palette (#0B3D2C, #E5A020, #1A6B40)
 */

import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  IconArrowUp,
  IconArrowDown,
  IconMinus,
  IconVerified,
  IconClock,
  IconChevronRight,
} from '@/components/ui/icons';

/* ---------------------------------------------------------------- types --- */

export interface MarketWatchRow {
  id: string;
  commodityName: string;
  commoditySlug: string;
  marketName: string | null;
  marketSlug: string | null;
  amount: number | null;
  currencyCode: string;
  unitLabel: string | null;
  priceTypeLabel: string | null;
  gradeName: string | null;
  changePercent: number | null;
  observedAt: string | null;
  verificationStatus: string;
  href?: string;
  /** Optional sparkline data for trend visualization */
  sparklineValues?: number[];
}

/* ------------------------------------------------------ main component ---- */

export function ProfessionalMarketWatch({
  rows,
  title = 'Commodity Market Watch',
  subtitle = 'Published price observations with unit, movement, time and verification',
  onShowAll,
}: {
  rows: MarketWatchRow[];
  title?: string;
  subtitle?: string;
  onShowAll?: string;
}) {
  if (rows.length === 0) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-gray-100">
            <IconMinus className="size-8 text-gray-400" />
          </div>
          <h3 className="text-[0.9375rem] font-bold text-[#0B3D2C]">No market data available</h3>
          <p className="mt-1.5 max-w-sm text-[0.8125rem] text-gray-500">
            Price observations will appear here as they are collected and verified from markets.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Section Header */}
      <div className="border-b border-gray-100 bg-gradient-to-br from-white to-gray-50/50 px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2.5 text-[1.0625rem] font-bold text-[#0B3D2C]">
              <span className="flex size-8 items-center justify-center rounded-lg bg-[#E5A020]/10">
                <IconVerified className="size-5 text-[#E5A020]" />
              </span>
              {title}
            </h2>
            <p className="mt-1 text-[0.75rem] text-gray-500">{subtitle}</p>
          </div>
          {onShowAll && (
            <Link
              href={onShowAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#0B3D2C]/15 bg-white px-4 py-2 text-[0.75rem] font-semibold text-[#0B3D2C] transition-all hover:border-[#E5A020]/40 hover:bg-[#E5A020]/5 hover:shadow-sm"
            >
              View Full Directory
              <IconChevronRight className="size-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-5 py-3 text-[0.6875rem] font-semibold uppercase tracking-wider text-gray-500">
                  Commodity
                </th>
                <th className="px-5 py-3 text-[0.6875rem] font-semibold uppercase tracking-wider text-gray-500">
                  Market
                </th>
                <th className="px-5 py-3 text-right text-[0.6875rem] font-semibold uppercase tracking-wider text-gray-500">
                  Price
                </th>
                <th className="px-5 py-3 text-right text-[0.6875rem] font-semibold uppercase tracking-wider text-gray-500">
                  Change
                </th>
                <th className="px-5 py-3 text-[0.6875rem] font-semibold uppercase tracking-wider text-gray-500">
                  Verified
                </th>
                <th className="px-5 py-3 text-[0.6875rem] font-semibold uppercase tracking-wider text-gray-500">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((row) => (
                <MarketWatchTableRow key={row.id} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden">
        <div className="divide-y divide-gray-100">
          {rows.map((row) => (
            <MarketWatchMobileCard key={row.id} row={row} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 bg-gray-50/30 px-5 py-3 sm:px-6">
        <p className="text-[0.625rem] text-gray-400">
          Movement is calculated between comparable observations. Data sourced from verified field collection.
        </p>
      </div>
    </section>
  );
}

/* -------------------------------------------------- desktop row ---------- */

function MarketWatchTableRow({ row }: { row: MarketWatchRow }) {
  const formatPrice = (amount: number, currency: string) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);

  const movementBadge = getMovementBadge(row.changePercent);

  return (
    <tr className="group transition-colors hover:bg-[#E5A020]/[0.02]">
      {/* Commodity */}
      <td className="px-5 py-3.5">
        <Link
          href={row.href ?? `/commodities/${row.commoditySlug}`}
          className="flex items-center gap-2.5 group-hover:text-[#E5A020] transition-colors"
        >
          {/* Commodity icon */}
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#0B3D2C]/[0.04] group-hover:bg-[#E5A020]/10 transition-colors">
            <span className="text-[0.75rem] font-bold text-[#0B3D2C]/60 group-hover:text-[#E5A020]">
              {row.commodityName.charAt(0)}
            </span>
          </div>
          <div className="min-w-0">
            <span className="block truncate text-[0.8125rem] font-semibold text-[#0B3D2C]">
              {row.commodityName}
            </span>
            {row.gradeName && (
              <span className="block truncate text-[0.625rem] text-gray-400">
                Grade: {row.gradeName}
              </span>
            )}
            {row.priceTypeLabel && (
              <span className="block truncate text-[0.5625rem] text-gray-400">
                {row.priceTypeLabel}
              </span>
            )}
          </div>
        </Link>
      </td>

      {/* Market */}
      <td className="px-5 py-3.5">
        {row.marketSlug ? (
          <Link
            href={`/markets/${row.marketSlug}`}
            className="text-[0.8125rem] text-gray-600 underline decoration-gray-200 underline-offset-2 transition-colors hover:text-[#0B3D2C] hover:decoration-[#E5A020]"
          >
            {row.marketName}
          </Link>
        ) : (
          <span className="text-[0.8125rem] text-gray-400">
            {row.marketName ?? '—'}
          </span>
        )}
      </td>

      {/* Price */}
      <td className="px-5 py-3.5 text-right">
        {row.amount === null ? (
          <span className="text-[0.8125rem] text-gray-400">Not observed</span>
        ) : (
          <>
            <span className="figure-num text-[0.9375rem] font-bold text-[#0B3D2C]">
              {formatPrice(row.amount, row.currencyCode)}
            </span>
            {row.unitLabel && (
              <span className="ml-1 text-[0.6875rem] text-gray-400">
                /{row.unitLabel}
              </span>
            )}
          </>
        )}
      </td>

      {/* Change */}
      <td className="px-5 py-3.5 text-right">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold ${movementBadge.className}`}>
          {movementBadge.icon}
          {movementBadge.label}
        </span>
      </td>

      {/* Verification */}
      <td className="px-5 py-3.5">
        <VerificationStatusBadge status={row.verificationStatus} />
      </td>

      {/* Updated */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-1.5 text-[0.75rem] text-gray-500">
          <IconClock className="size-3.5 text-gray-400" />
          {row.observedAt ? formatObservedAt(row.observedAt) : '—'}
        </div>
      </td>
    </tr>
  );
}

/* -------------------------------------------------- mobile card --------- */

function MarketWatchMobileCard({ row }: { row: MarketWatchRow }) {
  const formatPrice = (amount: number, currency: string) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);

  const movementBadge = getMovementBadge(row.changePercent);

  return (
    <Link
      href={row.href ?? `/commodities/${row.commoditySlug}`}
      className="flex items-center gap-3.5 px-4 py-4 transition-colors hover:bg-[#E5A020]/[0.02]"
    >
      {/* Commodity icon */}
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#0B3D2C]/[0.05]">
        <span className="text-[0.875rem] font-bold text-[#0B3D2C]/60">
          {row.commodityName.charAt(0)}
        </span>
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[0.875rem] font-bold text-[#0B3D2C]">
            {row.commodityName}
          </span>
          {movementBadge.icon}
        </div>
        <div className="mt-0.5 truncate text-[0.6875rem] text-gray-500">
          {row.marketName ?? 'Market not recorded'}
          {row.observedAt && ` · ${formatRelative(row.observedAt)}`}
        </div>
        {row.gradeName && (
          <div className="mt-0.5 text-[0.625rem] text-gray-400">
            {row.gradeName}{row.priceTypeLabel ? ` · ${row.priceTypeLabel}` : ''}
          </div>
        )}
      </div>

      {/* Price + Change */}
      <div className="shrink-0 text-right">
        <div className="figure-num text-[0.9375rem] font-bold text-[#0B3D2C]">
          {row.amount === null
            ? '—'
            : `${formatPrice(row.amount, row.currencyCode)}`}
        </div>
        {row.unitLabel && (
          <div className="text-[0.5625rem] text-gray-400">per {row.unitLabel}</div>
        )}
        <div className={`mt-1 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold ${movementBadge.className}`}>
          {movementBadge.icon}
          {movementBadge.label}
        </div>
      </div>
    </Link>
  );
}

/* -------------------------------------------------- helpers ------------- */

interface MovementBadge {
  icon: React.ReactNode;
  label: string;
  className: string;
}

function getMovementBadge(changePercent: number | null): MovementBadge {
  if (changePercent === null) {
    return {
      icon: <IconMinus className="size-3" />,
      label: '—',
      className: 'bg-gray-100 text-gray-500',
    };
  }

  if (changePercent > 0) {
    return {
      icon: <IconArrowUp className="size-3" />,
      label: `+${changePercent.toFixed(1)}%`,
      className: 'bg-[#4CAF50]/10 text-[#1A6B40]',
    };
  }

  if (changePercent < 0) {
    return {
      icon: <IconArrowDown className="size-3" />,
      label: `${changePercent.toFixed(1)}%`,
      className: 'bg-red-50 text-red-600',
    };
  }

  return {
    icon: <IconMinus className="size-3" />,
    label: '0.0%',
    className: 'bg-gray-100 text-gray-500',
  };
}

function VerificationStatusBadge({ status }: { status: string }) {
  const config = getVerificationConfig(status);

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.625rem] font-semibold ${config.className}`}>
      <span className={`size-1.5 rounded-full ${config.dotColor}`} />
      {config.label}
    </span>
  );
}

function getVerificationConfig(status: string) {
  switch (status) {
    case 'verified':
      return {
        label: 'Verified',
        className: 'bg-[#4CAF50]/10 text-[#1A6B40]',
        dotColor: 'bg-[#4CAF50]',
      };
    case 'pending':
    case 'unverified':
      return {
        label: 'Pending',
        className: 'bg-[#E5A020]/10 text-[#C88A15]',
        dotColor: 'bg-[#E5A020]',
      };
    case 'rejected':
      return {
        label: 'Rejected',
        className: 'bg-red-50 text-red-600',
        dotColor: 'bg-red-500',
      };
    default:
      return {
        label: 'Unknown',
        className: 'bg-gray-100 text-gray-500',
        dotColor: 'bg-gray-400',
      };
  }
}

function formatObservedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-NG', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(date);
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
