import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { MarketCard } from '@/components/data/Cards';
import { Breadcrumbs, EmptyState, Pagination } from '@/components/ui';
import { getDataSource } from '@/lib/data';
import { BreadcrumbJsonLd, DatasetJsonLd } from '@/components/marketing/StructuredData';

export const metadata: Metadata = {
  title: 'Market Directory',
  description:
    'Markets across Nigeria where GonaPulse collects agricultural commodity prices — Dawanau, Mile 12, Gujungu and more.',
  alternates: { canonical: '/markets' },
};

export default async function MarketsPage({
  searchParams,
}: {
  searchParams: Promise<{ market_id?: string; state?: string; q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const source = await getDataSource();
  const [markets, states] = await Promise.all([source.listMarkets(), source.listStates()]);

  // A legacy link such as market-detail.php?market_id=7 lands here with
  // ?market_id=. Resolve it to the canonical slug with a real redirect.
  if (params.market_id) {
    const legacyId = Number(params.market_id);
    const match = markets.find((m) => m.legacyId === legacyId);
    if (match) redirect(`/markets/${match.slug}`);
  }

  const activeState = params.state ? states.find((s) => s.slug === params.state) : undefined;
  const term = params.q?.trim().toLowerCase();

  let filtered = markets;
  if (activeState) filtered = filtered.filter((m) => m.stateId === activeState.id);
  if (term) {
    filtered = filtered.filter((m) =>
      [m.name, m.stateName, m.description].filter(Boolean).join(' ').toLowerCase().includes(term),
    );
  }

  const page = Math.max(1, Number(params.page ?? '1') || 1);
  const pageSize = 12;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const items = filtered.slice((page - 1) * pageSize, page * pageSize);

  const buildHref = (nextPage: number) => {
    const search = new URLSearchParams();
    if (activeState) search.set('state', activeState.slug);
    if (term) search.set('q', term);
    search.set('page', String(nextPage));
    return `/markets?${search.toString()}`;
  };

  const withPrices = markets.filter((m) => (m.observationCount ?? 0) > 0).length;

  return (
    <div className="section">
      <div className="container-page">
        <BreadcrumbJsonLd items={[{ name: 'Markets' }]} />
        <DatasetJsonLd
          name="GonaPulse market coverage directory"
          description={`The ${markets.length} markets across ${states.length} states where GonaPulse collects agricultural commodity prices, with the commodities reported at each one.`}
          url="/markets"
          keywords={[
            'Nigerian commodity markets',
            'Dawanau market',
            'market coverage Nigeria',
            'agricultural market directory',
          ]}
        />
        <Breadcrumbs items={[{ label: 'Markets' }]} />

        <header className="max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Markets we cover</h1>
          <p className="mt-3 text-base leading-relaxed text-ink-600">
            We list {markets.length} markets across {states.length} states. {withPrices} currently
            carry published price observations. A market appears in price results only once an
            observation from it has been collected and published.
          </p>
        </header>

        <form method="GET" action="/markets" className="card mt-6 grid gap-4 p-5 sm:grid-cols-3" role="search">
          <div>
            <label htmlFor="q" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-600">
              Search markets
            </label>
            <input
              id="q"
              type="search"
              name="q"
              defaultValue={params.q ?? ''}
              placeholder="Market name"
              className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="state" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-600">
              State
            </label>
            <select
              id="state"
              name="state"
              defaultValue={params.state ?? ''}
              className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="">All states</option>
              {states.map((s) => (
                <option key={s.id} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="rounded-xl bg-brand-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
            >
              Search
            </button>
            {activeState || term ? (
              <Link
                href="/markets"
                className="rounded-xl border border-ink-300 px-5 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-400 hover:text-brand-800"
              >
                Clear
              </Link>
            ) : null}
          </div>
        </form>

        {items.length > 0 ? (
          <>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((market) => (
                <MarketCard key={market.id} market={market} />
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
          </>
        ) : (
          <div className="mt-8">
            <EmptyState
              title="No markets match your search"
              description="We could not find a market matching those filters. Try a different state or clear the search."
              action={
                <Link
                  href="/markets"
                  className="mt-2 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
                >
                  All markets
                </Link>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
