/**
 * Price Heatmap — visual distribution of prices across commodities and markets.
 *
 * Shows relative price intensity using a colour gradient, making it easy to
 * spot expensive vs. cheap commodities at a glance.
 */

'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { PriceObservation } from '@/types/domain';
import { formatMoney } from '@/lib/money';

interface Props {
  observations: PriceObservation[];
}

interface HeatmapCell {
  commodityId: number;
  commodityName: string;
  commoditySlug: string;
  marketId: number;
  marketName: string;
  marketSlug: string;
  price: number;
  currencyCode: string;
  unitName: string | null;
  intensity: number; // 0-1
  observedAt: string;
}

export function PriceHeatmap({ observations }: Props) {
  const cells = useMemo(() => {
    // Group by commodity + market, take latest price
    const grouped = new Map<string, PriceObservation>();
    for (const obs of observations) {
      const key = `${obs.commodityId}-${obs.marketId}`;
      const existing = grouped.get(key);
      if (!existing || obs.collectedAt > existing.collectedAt) {
        grouped.set(key, obs);
      }
    }

    const prices = [...grouped.values()]
      .map((o) => o.normalizedAmount ?? o.reportedAmount ?? 0)
      .filter((p) => p > 0);

    if (prices.length === 0) return [];

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const range = maxPrice - minPrice || 1;

    return [...grouped.values()]
      .map((obs) => {
        const price = obs.normalizedAmount ?? obs.reportedAmount ?? 0;
        const intensity = range > 0 ? (price - minPrice) / range : 0;
        return {
          commodityId: obs.commodityId,
          commodityName: obs.commodityName ?? 'Unknown',
          commoditySlug: obs.commoditySlug ?? '',
          marketId: obs.marketId,
          marketName: obs.marketName ?? 'Unknown',
          marketSlug: obs.marketSlug ?? '',
          price,
          currencyCode: obs.currencyCode,
          unitName: obs.unitName ?? null,
          intensity,
          observedAt: obs.collectedAt,
        } as HeatmapCell;
      })
      .sort((a, b) => a.commodityName.localeCompare(b.commodityName));
  }, [observations]);

  if (cells.length === 0) return null;

  // Group by commodity
  const byCommodity = new Map<string, HeatmapCell[]>();
  for (const cell of cells) {
    const list = byCommodity.get(cell.commodityName);
    if (list) list.push(cell);
    else byCommodity.set(cell.commodityName, [cell]);
  }

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-ink-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-ink-900">Price Heatmap</h3>
        <p className="mt-0.5 text-xs text-ink-500">
          Relative price intensity across commodities and markets — darker cells are higher prices
        </p>
      </div>

      <div className="overflow-x-auto p-4">
        <div className="min-w-[500px] space-y-1">
          {Array.from(byCommodity.entries()).map(([commodityName, commodityCells]) => (
            <div key={commodityName}>
              <Link
                href={`/prices/${commodityCells[0]?.commoditySlug}`}
                className="flex items-center gap-2 py-1 text-xs font-semibold text-ink-700 hover:text-brand-700"
              >
                {commodityName}
                <span className="text-[0.625rem] font-normal text-ink-400">
                  ({commodityCells.length} market{commodityCells.length === 1 ? '' : 's'})
                </span>
              </Link>
              <div className="flex gap-1">
                {commodityCells.map((cell) => {
                  const bg = intensityColor(cell.intensity);
                  const textColor = cell.intensity > 0.6 ? 'text-white' : 'text-ink-800';
                  return (
                    <Link
                      key={`${cell.commodityId}-${cell.marketId}`}
                      href={`/markets/${cell.marketSlug}`}
                      className="group relative rounded-lg px-3 py-2 transition-transform hover:scale-105"
                      style={{ backgroundColor: bg, flex: '1 1 0' }}
                    >
                      <div className={`text-center text-xs font-bold tabular-nums ${textColor}`}>
                        ₦{Math.round(cell.price).toLocaleString('en-NG')}
                      </div>
                      <div className={`text-center text-[0.625rem] ${textColor} opacity-80`}>
                        {cell.marketName}
                      </div>

                      {/* Tooltip */}
                      <div className="pointer-events-none absolute -top-16 left-1/2 z-10 hidden -translate-x-1/2 rounded-lg bg-ink-900 px-3 py-2 text-xs text-white shadow-lg group-hover:block">
                        <div className="font-semibold">{cell.commodityName}</div>
                        <div>{cell.marketName}</div>
                        <div>₦{cell.price.toLocaleString('en-NG')}{cell.unitName ? `/${cell.unitName}` : ''}</div>
                        <div className="text-ink-400">{new Date(cell.observedAt).toLocaleDateString('en-NG')}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-3 border-t border-ink-100 pt-3">
          <span className="text-[0.625rem] text-ink-500">Low</span>
          <div className="h-2 flex-1 rounded-full" style={{
            background: 'linear-gradient(to right, #E6F0EA, #A8D4B9, #1D805A, #0B3D2C)'
          }} />
          <span className="text-[0.625rem] text-ink-500">High</span>
        </div>
      </div>
    </div>
  );
}

/** Map intensity 0-1 to a green gradient */
function intensityColor(intensity: number): string {
  // Interpolate between light green (#E6F0EA) and dark green (#0B3D2C)
  const r = Math.round(230 - intensity * (230 - 11));
  const g = Math.round(240 - intensity * (240 - 61));
  const b = Math.round(234 - intensity * (234 - 44));
  return `rgb(${r}, ${g}, ${b})`;
}
