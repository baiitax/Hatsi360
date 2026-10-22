import Link from 'next/link';
import { formatDate, formatDateTime, formatMoney } from '@/lib/money';
import { PRICE_TYPE_META } from '@/types/domain';
import type { PriceObservation } from '@/types/domain';
import { PriceFigure, ProvenanceLine, UnitUnknownBadge } from '@/components/ui';

/**
 * The price observation table.
 *
 * Every row shows the commodity, the market, the price *with its unit and
 * price type*, when it was collected and how it was verified. A row is never
 * reduced to a bare number.
 */
export function PriceTable({
  observations,
  showCommodity = true,
  caption,
}: {
  observations: PriceObservation[];
  showCommodity?: boolean;
  caption?: string;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] border-collapse text-sm">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr className="border-b border-ink-200 bg-ink-50 text-left">
              {showCommodity ? (
                <th scope="col" className="px-5 py-3 font-semibold text-ink-700">
                  Commodity
                </th>
              ) : null}
              <th scope="col" className="px-5 py-3 font-semibold text-ink-700">
                Market
              </th>
              <th scope="col" className="px-5 py-3 font-semibold text-ink-700">
                Price
              </th>
              <th scope="col" className="px-5 py-3 font-semibold text-ink-700">
                Price type
              </th>
              <th scope="col" className="px-5 py-3 font-semibold text-ink-700">
                Collected
              </th>
              <th scope="col" className="px-5 py-3 font-semibold text-ink-700">
                Verification
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {observations.map((observation) => {
              const type = PRICE_TYPE_META[observation.priceType];
              return (
                <tr key={observation.id} className="align-top transition-colors hover:bg-brand-50/40">
                  {showCommodity ? (
                    <td className="px-5 py-4">
                      <Link
                        href={`/prices/${observation.commoditySlug}`}
                        className="font-semibold text-ink-900 hover:text-brand-700"
                      >
                        {observation.commodityName}
                      </Link>
                      {observation.gradeName ? (
                        <p className="mt-0.5 text-xs text-ink-500">Grade: {observation.gradeName}</p>
                      ) : null}
                    </td>
                  ) : null}
                  <td className="px-5 py-4">
                    <Link
                      href={`/markets/${observation.marketSlug}`}
                      className="font-medium text-ink-800 hover:text-brand-700"
                    >
                      {observation.marketName}
                    </Link>
                    <p className="mt-0.5 text-xs text-ink-500">{observation.stateName}</p>
                  </td>
                  <td className="px-5 py-4">
                    <PriceFigure
                      amount={observation.normalizedAmount ?? observation.reportedAmount}
                      currency={observation.currencyCode}
                    />
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {observation.unitIsSpecific === false ? (
                        <UnitUnknownBadge />
                      ) : observation.unitName ? (
                        <span className="text-xs text-ink-500">per {observation.unitName}</span>
                      ) : null}
                      {observation.packageWeightKg ? (
                        <span className="text-xs text-ink-500">
                          {observation.packageWeightKg} kg pack
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-ink-700" title={type.description}>
                      {type.label}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className="text-ink-700">{formatDate(observation.collectedAt)}</span>
                    {observation.collectedAtPrecision === 'date' ? (
                      <p className="mt-0.5 text-xs text-ink-500">Time of day not recorded</p>
                    ) : (
                      <p className="mt-0.5 text-xs text-ink-500">
                        {formatDateTime(observation.collectedAt).split(', ')[1]} WAT
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <ProvenanceLine
                      collectedAt={observation.collectedAt}
                      verifiedAt={observation.verifiedAt}
                      status={observation.verificationStatus}
                      precision={observation.collectedAtPrecision}
                      className="flex-col items-start gap-1.5"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * The market comparison table.
 *
 * A summary row always carries the observation count and the window it covers,
 * so a single report is never presented as the definitive market price.
 */
export function MarketComparisonTable({
  rows,
  caption,
}: {
  rows: {
    marketId: number;
    marketSlug: string;
    marketName: string;
    stateName: string;
    medianAmount: number;
    minAmount: number;
    maxAmount: number;
    latestAmount: number;
    observationCount: number;
    currencyCode: string;
    priceType: string;
    unitName: string | null;
    unitIsSpecific: boolean;
    unitAmbiguous: boolean;
    isStale: boolean;
    latestCollectedAt: string;
    windowStart: string;
    windowEnd: string;
    changePercent: number | null;
  }[];
  caption?: string;
}) {
  if (rows.length === 0) return null;

  const maxAmount = Math.max(...rows.map((r) => r.maxAmount));

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] border-collapse text-sm">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr className="border-b border-ink-200 bg-ink-50 text-left">
              <th scope="col" className="px-5 py-3 font-semibold text-ink-700">
                Market
              </th>
              <th scope="col" className="px-5 py-3 font-semibold text-ink-700">
                State
              </th>
              <th scope="col" className="px-5 py-3 font-semibold text-ink-700">
                Latest price
              </th>
              <th scope="col" className="px-5 py-3 font-semibold text-ink-700">
                Range
              </th>
              <th scope="col" className="px-5 py-3 font-semibold text-ink-700">
                Observations
              </th>
              <th scope="col" className="px-5 py-3 font-semibold text-ink-700">
                Collected
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {rows.map((row) => (
              <tr key={row.marketId} className="align-top transition-colors hover:bg-brand-50/40">
                <td className="px-5 py-4">
                  <Link
                    href={`/markets/${row.marketSlug}`}
                    className="font-semibold text-ink-900 hover:text-brand-700"
                  >
                    {row.marketName}
                  </Link>
                </td>
                <td className="px-5 py-4 text-ink-600">{row.stateName}</td>
                <td className="px-5 py-4">
                  <PriceFigure amount={row.latestAmount} currency={row.currencyCode} />
                  <div className="mt-1.5 h-1 w-28 overflow-hidden rounded-full bg-ink-100">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${Math.max(6, (row.latestAmount / maxAmount) * 100)}%` }}
                    />
                  </div>
                </td>
                <td className="px-5 py-4 whitespace-nowrap text-ink-600">
                  {formatMoney(row.minAmount, { currency: row.currencyCode })} –{' '}
                  {formatMoney(row.maxAmount, { currency: row.currencyCode })}
                </td>
                <td className="px-5 py-4">
                  <span className="font-medium text-ink-800">{row.observationCount}</span>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {formatDate(row.windowStart)} – {formatDate(row.windowEnd)}
                  </p>
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                  <span className="text-ink-700">{formatDate(row.latestCollectedAt)}</span>
                  {row.unitAmbiguous ? (
                    <div className="mt-1.5">
                      <UnitUnknownBadge />
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
