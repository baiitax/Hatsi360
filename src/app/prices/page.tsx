import Link from 'next/link';
import type { Metadata } from 'next';
import { PriceTable } from '@/components/data/PriceTable';
import { DataCoverageNotice } from '@/components/data/DataCoverageNotice';
import { Breadcrumbs, EmptyState, Pagination } from '@/components/ui';
import { getDataSource } from '@/lib/data';
import { PRICE_TYPE_META, type ObservationQuery, type PriceType } from '@/types/domain';

export const metadata: Metadata = {
  title: 'Price Directory',
  description:
    'Search every published agricultural commodity price observation by commodity, category, state, market, price type and collection date.',
  alternates: { canonical: '/prices' },
};

interface PriceSearchParams {
  q?: string;
  commodity?: string;
  category?: string;
  state?: string;
  market?: string;
  price_type?: string;
  from?: string;
  to?: string;
  sort?: string;
  page?: string;
}

export default async function PricesPage({
  searchParams,
}: {
  searchParams: Promise<PriceSearchParams>;
}) {
  const params = await searchParams;
  const source = await getDataSource();

  const [commodities, categories, states, markets] = await Promise.all([
    source.listCommodities(),
    source.listCategories(),
    source.listStates(),
    source.listMarkets(),
  ]);

  const commodity = params.commodity
    ? commodities.find((c) => c.slug === params.commodity)
    : undefined;
  const category = params.category
    ? categories.find((c) => c.slug === params.category)
    : undefined;
  const state = params.state ? states.find((s) => s.slug === params.state) : undefined;
  const market = params.market ? markets.find((m) => m.slug === params.market) : undefined;

  const page = Math.max(1, Number(params.page ?? '1') || 1);
  const pageSize = 20;

  const query: ObservationQuery = {
    search: params.q?.trim() || undefined,
    commodityId: commodity?.id,
    categoryId: category?.id,
    stateId: state?.id,
    marketId: market?.id,
    priceType: (params.price_type as PriceType | undefined) ?? undefined,
    collectedFrom: params.from ? `${params.from}T00:00:00.000Z` : undefined,
    collectedTo: params.to ? `${params.to}T23:59:59.999Z` : undefined,
    sort: (params.sort as ObservationQuery['sort']) ?? 'recent',
    page,
    pageSize,
  };

  const result = await source.listObservations(query);
  const all = await source.listObservationsForAnalysis({
    search: query.search,
    commodityId: query.commodityId,
    categoryId: query.categoryId,
    stateId: query.stateId,
    marketId: query.marketId,
    priceType: query.priceType,
    collectedFrom: query.collectedFrom,
    collectedTo: query.collectedTo,
  });

  const latestCollectedAt = all.length
    ? all.reduce<string | null>((acc, o) => (acc == null || o.collectedAt > acc ? o.collectedAt : acc), null)
    : null;

  const buildHref = (nextPage: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value && key !== 'page') search.set(key, String(value));
    }
    search.set('page', String(nextPage));
    return `/prices?${search.toString()}`;
  };

  const hasFilters = Boolean(
    params.q || params.commodity || params.category || params.state || params.market || params.price_type || params.from || params.to,
  );

  const fieldClass =
    'w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none';

  return (
    <div className="section">
      <div className="container-page">
        <Breadcrumbs items={[{ label: 'Prices' }]} />

        <header className="max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Price directory</h1>
          <p className="mt-3 text-base leading-relaxed text-ink-600">
            Every published price observation in the system. Filter by commodity, category, state,
            market, price type or collection date — each result shows the market it came from, when
            it was collected and how it was verified.
          </p>
        </header>

        <div className="mt-6">
          <DataCoverageNotice
            latestCollectedAt={latestCollectedAt}
            observationCount={all.length}
          />
        </div>

        {/* ------------------------------------------------------ filters -- */}
        <form
          method="GET"
          action="/prices"
          className="card mt-8 grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4"
          role="search"
        >
          <div className="sm:col-span-2 lg:col-span-1">
            <label htmlFor="q" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-600">
              Search
            </label>
            <input
              id="q"
              type="search"
              name="q"
              defaultValue={params.q ?? ''}
              placeholder="Commodity, market or state"
              className={fieldClass}
            />
          </div>

          <div>
            <label htmlFor="commodity" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-600">
              Commodity
            </label>
            <select id="commodity" name="commodity" defaultValue={params.commodity ?? ''} className={fieldClass}>
              <option value="">All commodities</option>
              {commodities.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="category" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-600">
              Category
            </label>
            <select id="category" name="category" defaultValue={params.category ?? ''} className={fieldClass}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="state" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-600">
              State
            </label>
            <select id="state" name="state" defaultValue={params.state ?? ''} className={fieldClass}>
              <option value="">All states</option>
              {states.map((s) => (
                <option key={s.id} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="market" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-600">
              Market
            </label>
            <select id="market" name="market" defaultValue={params.market ?? ''} className={fieldClass}>
              <option value="">All markets</option>
              {markets.map((m) => (
                <option key={m.id} value={m.slug}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="price_type" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-600">
              Price type
            </label>
            <select id="price_type" name="price_type" defaultValue={params.price_type ?? ''} className={fieldClass}>
              <option value="">All price types</option>
              {Object.values(PRICE_TYPE_META).map((type) => (
                <option key={type.code} value={type.code}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="from" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-600">
              Collected from
            </label>
            <input id="from" type="date" name="from" defaultValue={params.from ?? ''} className={fieldClass} />
          </div>

          <div>
            <label htmlFor="to" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-600">
              Collected to
            </label>
            <input id="to" type="date" name="to" defaultValue={params.to ?? ''} className={fieldClass} />
          </div>

          <div>
            <label htmlFor="sort" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-600">
              Sort by
            </label>
            <select id="sort" name="sort" defaultValue={params.sort ?? 'recent'} className={fieldClass}>
              <option value="recent">Most recently collected</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="commodity">Commodity A–Z</option>
              <option value="market">Market A–Z</option>
            </select>
          </div>

          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              className="rounded-xl bg-brand-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
            >
              Apply filters
            </button>
            {hasFilters ? (
              <Link
                href="/prices"
                className="rounded-xl border border-ink-300 px-5 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-400 hover:text-brand-800"
              >
                Clear
              </Link>
            ) : null}
            <span className="ml-auto text-sm text-ink-500">
              {result.total} observation{result.total === 1 ? '' : 's'}
            </span>
          </div>
        </form>

        {/* ------------------------------------------------------ results -- */}
        <div className="mt-8">
          {result.items.length > 0 ? (
            <>
              <PriceTable
                observations={result.items}
                caption="Published price observations"
              />
              <Pagination page={result.page} totalPages={result.totalPages} buildHref={buildHref} />
            </>
          ) : (
            <EmptyState
              title="No price observations match these filters"
              description="Nothing published matches the filters you have chosen. This is usually because the commodity or market has no published observations yet — migrated records only cover three commodities across three markets."
              action={
                <div className="mt-2 flex flex-wrap justify-center gap-3">
                  <Link
                    href="/prices"
                    className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
                  >
                    Clear filters
                  </Link>
                  <Link
                    href="/markets"
                    className="rounded-full border border-ink-300 px-5 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-400 hover:text-brand-800"
                  >
                    Browse markets
                  </Link>
                </div>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
