import Link from 'next/link';
import { formatDate } from '@/lib/money';
import type { Commodity, Market } from '@/types/domain';
import { getCommodityImage, getMarketImage } from '@/lib/images/registry';
import { HatsiImage } from '@/components/media/HatsiImage';

/**
 * A commodity card.
 *
 * The photograph is matched to the commodity through the registry, by the
 * commodity's canonical slug — never by its display name. A commodity with no
 * registered photograph falls back to the neutral placeholder panel rather
 * than to an unrelated picture.
 */
export function CommodityCard({ commodity }: { commodity: Commodity }) {
  const hasData = (commodity.observationCount ?? 0) > 0;
  const image = getCommodityImage(commodity.slug);

  return (
    <article className="card card-hover group flex flex-col overflow-hidden">
      <div className="relative">
        <HatsiImage
          asset={image}
          sizes="(min-width: 1024px) 22rem, (min-width: 640px) 45vw, 92vw"
          ratio="landscape"
          className="rounded-t-[0.875rem]"
          imageClassName="transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
              {commodity.categoryName}
            </p>
            <h3 className="mt-1 text-lg font-bold leading-tight">
              <Link
                href={`/commodities/${commodity.slug}`}
                className="transition-colors hover:text-brand-700"
              >
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
      </div>
    </article>
  );
}

/**
 * A market card.
 *
 * The photograph is a representative image of that kind of trading
 * environment, matched by the market's canonical slug. The badge on the
 * image says so, so a reader is never led to believe it is a verified
 * photograph of the named market.
 */
export function MarketCard({ market }: { market: Market }) {
  const hasData = (market.observationCount ?? 0) > 0;
  const image = getMarketImage(market.slug);

  return (
    <article className="card card-hover group flex flex-col overflow-hidden">
      <div className="relative">
        <HatsiImage
          asset={image}
          sizes="(min-width: 1024px) 22rem, (min-width: 640px) 45vw, 92vw"
          ratio="landscape"
          className="rounded-t-[0.875rem]"
          imageClassName="transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
        {image.representation === 'representative' ? (
          <span className="absolute left-3 top-3 rounded-full bg-ink-950/75 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
            Representative image
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
              {market.stateName}
            </p>
            <h3 className="mt-1 text-lg font-bold leading-tight">
              <Link
                href={`/markets/${market.slug}`}
                className="transition-colors hover:text-brand-700"
              >
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
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-600">
            {market.description}
          </p>
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
      </div>
    </article>
  );
}
