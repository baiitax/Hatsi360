import Link from 'next/link';
import { formatDate } from '@/lib/money';
import type { Commodity, Market } from '@/types/domain';

export function CommodityCard({ commodity }: { commodity: Commodity }) {
  const hasData = (commodity.observationCount ?? 0) > 0;

  return (
    <article className="card card-hover flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
            {commodity.categoryName}
          </p>
          <h3 className="mt-1 text-lg font-bold leading-tight">
            <Link href={`/commodities/${commodity.slug}`} className="hover:text-brand-700">
              {commodity.name}
            </Link>
          </h3>
        </div>
        {hasData ? (
          <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800">
            {commodity.marketCount} market{commodity.marketCount === 1 ? '' : 's'}
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-500">
            No prices yet
          </span>
        )}
      </div>

      {commodity.description ? (
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-600">
          {commodity.description}
        </p>
      ) : (
        <p className="mt-3 text-sm italic leading-relaxed text-ink-400">
          No description recorded yet.
        </p>
      )}

      <div className="mt-auto pt-4 text-xs text-ink-500">
        {hasData ? (
          <>
            {commodity.observationCount} observation
            {commodity.observationCount === 1 ? '' : 's'} · latest{' '}
            {formatDate(commodity.latestObservationAt)}
          </>
        ) : (
          'This commodity is in the catalogue but has no published price observations yet.'
        )}
      </div>

      <Link
        href={`/commodities/${commodity.slug}`}
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
      >
        View price history
        <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}

export function MarketCard({ market }: { market: Market }) {
  const hasData = (market.observationCount ?? 0) > 0;

  return (
    <article className="card card-hover flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
            {market.stateName}
          </p>
          <h3 className="mt-1 text-lg font-bold leading-tight">
            <Link href={`/markets/${market.slug}`} className="hover:text-brand-700">
              {market.name}
            </Link>
          </h3>
        </div>
        {hasData ? (
          <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800">
            {market.observationCount} observation{market.observationCount === 1 ? '' : 's'}
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-500">
            No prices yet
          </span>
        )}
      </div>

      {market.description ? (
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-600">{market.description}</p>
      ) : (
        <p className="mt-3 text-sm italic leading-relaxed text-ink-400">
          No description recorded yet.
        </p>
      )}

      <div className="mt-auto pt-4 text-xs text-ink-500">
        {hasData ? (
          <>Latest collection {formatDate(market.latestObservationAt)}</>
        ) : (
          'This market is in the catalogue but has no published price observations yet.'
        )}
      </div>

      <Link
        href={`/markets/${market.slug}`}
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
      >
        View market prices
        <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}
