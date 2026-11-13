import Link from 'next/link';
import { BRAND } from '@/lib/brand';
import { formatMoney, formatDateTime } from '@/lib/money';
import { PRICE_TYPE_META, type PriceObservation } from '@/types/domain';
import { getPageImage } from '@/lib/images/registry';
import { HatsiImage } from '@/components/media/HatsiImage';

/**
 * The Hatsi360 hero.
 *
 * A market-intelligence proposition, not a generic SaaS promise: the
 * instrument (a price with provenance), the mechanism (field collection and
 * verification), and the outcome (confidence to move).
 *
 * The hero is photograph-led. The photograph is a real trading environment
 * rather than an abstract graphic, and it is placed behind a deep-green
 * scrim so the headline keeps its contrast over it. The photograph is the one
 * image on the page that loads eagerly; everything below it is lazy.
 *
 * The panel on the right carries the newest eligible observations from the
 * database. It is labelled "latest available" rather than "live", because the
 * platform publishes a verified record, not a tick-by-tick feed.
 */
export function HeroPanel({
  observations = [],
  units = new Map<number, string>(),
}: {
  observations?: PriceObservation[];
  units?: Map<number, string>;
}) {
  const latest = observations[0] ?? null;
  const panel = observations.slice(0, 4);
  const hero = getPageImage('home.hero');

  return (
    <section className="relative isolate overflow-hidden bg-brand-900">
      {/* The photographic ground. It carries the negative space for the headline. */}
      <div className="absolute inset-0 -z-10">
        <HatsiImage
          asset={hero}
          sizes="100vw"
          priority
          fill
          imageClassName="object-cover object-center"
        />
      </div>
      {/* The scrim that keeps the headline legible over the photograph. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-900 via-brand-900/94 to-brand-900/55"
      />

      <div className="container-page relative grid gap-12 py-16 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-24">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-400/40 bg-brand-800/60 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-brand-100">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-leaf-400" />
            {BRAND.category} &middot; {BRAND.endorsement}
          </p>

          <h1 className="mt-6 max-w-2xl font-display text-4xl font-bold leading-[1.06] tracking-tight text-white sm:text-5xl lg:text-[3.75rem]">
            See beyond commodity prices. Understand the agricultural market.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-brand-100">
            {BRAND.name} publishes agricultural commodity prices collected in the field, with
            the market, the unit, the price type and the collection time behind every
            figure — so a trading decision rests on a record rather than a rumour.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/prices"
              className="rounded-full bg-white px-6 py-3 text-sm font-bold text-brand-900 transition-colors hover:bg-brand-50"
            >
              Explore market prices
            </Link>
            <Link
              href="/trade"
              className="rounded-full border border-brand-300/60 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-800"
            >
              Discover trade intelligence
            </Link>
          </div>

          <dl className="mt-12 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-5 border-t border-brand-700/70 pt-8 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-brand-300">
                Collection
              </dt>
              <dd className="mt-1 text-sm leading-relaxed text-brand-100">
                Assigned field agents record prices with the unit and the time of collection.
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-brand-300">
                Verification
              </dt>
              <dd className="mt-1 text-sm leading-relaxed text-brand-100">
                A separate review act before any observation becomes a published market price.
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-brand-300">
                Publication
              </dt>
              <dd className="mt-1 text-sm leading-relaxed text-brand-100">
                Corrections append to the record. A published price is never quietly overwritten.
              </dd>
            </div>
          </dl>
        </div>

        {/* The market-data panel: real records, never a mock-up. */}
        <aside className="rounded-2xl border border-brand-700/60 bg-brand-950/90 p-5 shadow-lift backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3 border-b border-brand-700/70 pb-3">
            <p className="font-display text-xs font-bold uppercase tracking-[0.16em] text-brand-100">
              Latest available observations
            </p>
            <span className="rounded-full border border-brand-400/40 px-2 py-0.5 text-[0.65rem] font-semibold text-brand-200">
              Verified record
            </span>
          </div>

          {panel.length === 0 ? (
            <p className="py-8 text-center text-sm text-brand-200">
              No eligible price observations have been published yet. The coverage statement
              explains what is being collected and what is not.
            </p>
          ) : (
            <ul className="divide-y divide-brand-700/60">
              {panel.map((observation) => (
                <li key={observation.id} className="py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-semibold text-white">
                      {observation.commodityName ?? 'Commodity'}
                    </p>
                    <p className="figure shrink-0 text-sm text-harvest-300">
                      {formatMoney(observation.reportedAmount, {
                        currency: observation.currencyCode,
                      })}
                      <span className="ml-1 text-[0.65rem] font-normal text-brand-200">
                        {observation.reportedUnitId
                          ? units.get(observation.reportedUnitId) ?? ''
                          : ''}
                      </span>
                    </p>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-brand-200">
                    {observation.marketName ?? 'Market'}
                    {observation.stateName ? ` · ${observation.stateName}` : ''} &middot;{' '}
                    {PRICE_TYPE_META[observation.priceType]?.shortLabel ?? observation.priceType}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 border-t border-brand-700/70 pt-3">
            <p className="text-xs leading-relaxed text-brand-200">
              {latest ? (
                <>
                  Latest available record collected{' '}
                  <span className="font-semibold text-white">
                    {formatDateTime(latest.collectedAt)}
                  </span>
                  . This is a verified published observation, not a live tick feed.
                </>
              ) : (
                <>
                  Nothing has been published yet. {BRAND.name} does not publish a figure it cannot
                  attribute.
                </>
              )}
            </p>
            <Link
              href="/prices"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-white underline decoration-brand-400 underline-offset-4 hover:decoration-white"
            >
              Open the price directory
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
