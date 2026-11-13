import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PriceChart } from '@/components/data/PriceChart';
import { CHART_COLOURS } from '@/lib/chart-colours';
import { PriceTable } from '@/components/data/PriceTable';
import { DataCoverageNotice } from '@/components/data/DataCoverageNotice';
import { Breadcrumbs, EmptyState } from '@/components/ui';
import { getDataSource } from '@/lib/data';
import { buildSeries } from '@/lib/pricing';
import { formatDate, formatMoney } from '@/lib/money';
import { BreadcrumbJsonLd, DatasetJsonLd } from '@/components/marketing/StructuredData';
import { getMarketImage } from '@/lib/images/registry';
import { HatsiFigure } from '@/components/media/HatsiImage';

interface Params {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const source = await getDataSource();
  const market = await source.getMarketBySlug(slug);
  if (!market) return { title: 'Market not found' };

  return {
    title: `${market.name} prices`,
    description:
      market.description ??
      `Agricultural commodity prices collected at ${market.name}, ${market.stateName}.`,
    alternates: { canonical: `/markets/${market.slug}` },
  };
}

export default async function MarketDetailPage({ params }: Params) {
  const { slug } = await params;
  const source = await getDataSource();

  const market = await source.getMarketBySlug(slug);
  if (!market) notFound();

  const observations = await source.listObservationsForAnalysis({ marketId: market.id });
  const commodities = await source.listCommodities();

  const byCommodity = new Map<number, typeof observations>();
  for (const observation of observations) {
    const list = byCommodity.get(observation.commodityId) ?? [];
    list.push(observation);
    byCommodity.set(observation.commodityId, list);
  }

  const products = commodities
    .filter((c) => byCommodity.has(c.id))
    .map((c) => ({
      commodity: c,
      count: byCommodity.get(c.id)!.length,
      series: buildSeries(byCommodity.get(c.id)!),
    }));

  const latestCollectedAt = observations.length
    ? observations.reduce<string | null>(
        (acc, o) => (acc == null || o.collectedAt > acc ? o.collectedAt : acc),
        null,
      )
    : null;

  const sorted = [...observations].sort((a, b) => b.collectedAt.localeCompare(a.collectedAt));

  const oldest = observations.reduce<string | null>(
    (earliest, observation) =>
      !earliest || observation.collectedAt < earliest ? observation.collectedAt : earliest,
    null,
  );

  return (
    <div className="section">
      <div className="container-page">
        <BreadcrumbJsonLd
          items={[{ name: 'Markets', url: '/markets' }, { name: market.name }]}
        />
        <DatasetJsonLd
          name={`${market.name} price observations`}
          description={`Agricultural commodity prices collected at ${market.name}${
            market.stateName ? `, ${market.stateName}` : ''
          }, with unit, price type and collection time for each published observation.`}
          url={`/markets/${market.slug}`}
          keywords={[
            market.name,
            market.stateName ?? undefined,
            'market prices',
            'agricultural prices Nigeria',
          ].filter((value): value is string => Boolean(value))}
          temporalCoverage={
            oldest && latestCollectedAt
              ? `${oldest.slice(0, 10)}/${latestCollectedAt.slice(0, 10)}`
              : undefined
          }
        />
        <Breadcrumbs items={[{ href: '/markets', label: 'Markets' }, { label: market.name }]} />

        {/*
          The market header band. The image is a representative view of this
          kind of trading environment, labelled as one. The market's own
          statistics, comparisons, freshness and history stay dominant below
          it, exactly as the brief requires.
        */}
        <HatsiFigure
          asset={getMarketImage(market.slug)}
          sizes="(min-width: 1280px) 80rem, 100vw"
          ratio="wide"
          priority
          className="overflow-hidden rounded-2xl"
        />

        <header className="mt-8 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-700">
            {market.stateName} · Nigeria
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{market.name}</h1>
          {market.description ? (
            <p className="mt-3 text-base leading-relaxed text-ink-600">{market.description}</p>
          ) : (
            <p className="mt-3 text-base italic leading-relaxed text-ink-400">
              No description has been recorded for this market yet.
            </p>
          )}
          {market.address ? (
            <p className="mt-2 text-sm text-ink-500">{market.address}</p>
          ) : null}
        </header>

        <div className="mt-6">
          <DataCoverageNotice
            latestCollectedAt={latestCollectedAt}
            observationCount={observations.length}
          />
        </div>

        {observations.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="No published prices for this market yet"
              description="This market is listed in our directory, but no price observation has been collected and published for it. We do not publish placeholder or estimated prices for markets we are not yet reporting."
              action={
                <div className="mt-2 flex flex-wrap justify-center gap-3">
                  <Link
                    href="/markets"
                    className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
                  >
                    All markets
                  </Link>
                  <Link
                    href="/prices"
                    className="rounded-full border border-ink-300 px-5 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-400 hover:text-brand-800"
                  >
                    Browse prices
                  </Link>
                </div>
              }
            />
          </div>
        ) : (
          <>
            <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="card p-5">
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Commodities reported
                </dt>
                <dd className="mt-1 text-2xl font-black text-brand-800">{products.length}</dd>
              </div>
              <div className="card p-5">
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Price observations
                </dt>
                <dd className="mt-1 text-2xl font-black text-brand-800">{observations.length}</dd>
              </div>
              <div className="card p-5">
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  First observation
                </dt>
                <dd className="mt-1 text-base font-bold text-ink-900">
                  {formatDate(
                    observations.reduce<string>(
                      (acc, o) => (o.collectedAt < acc ? o.collectedAt : acc),
                      observations[0]!.collectedAt,
                    ),
                  )}
                </dd>
              </div>
              <div className="card p-5">
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Latest observation
                </dt>
                <dd className="mt-1 text-base font-bold text-ink-900">
                  {formatDate(latestCollectedAt)}
                </dd>
              </div>
            </dl>

            {/* ---------------------------------------------- products -- */}
            <section className="mt-12">
              <h2 className="text-2xl font-bold tracking-tight">Products reported here</h2>
              <div className="mt-5 space-y-6">
                {products.map(({ commodity, count, series }) => (
                  <article key={commodity.id} className="card p-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <h3 className="text-lg font-bold">
                        <Link href={`/commodities/${commodity.slug}`} className="hover:text-brand-700">
                          {commodity.name}
                        </Link>
                      </h3>
                      <span className="text-sm text-ink-500">
                        {count} observation{count === 1 ? '' : 's'} · {series.length} day
                        {series.length === 1 ? '' : 's'} of data
                      </span>
                    </div>
                    <div className="mt-4">
                      <PriceChart
                        series={[{ key: commodity.slug, label: commodity.name, points: series, color: CHART_COLOURS.primary }]}
                        height={240}
                      />
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* ------------------------------------------------- table -- */}
            <section className="mt-12">
              <h2 className="text-2xl font-bold tracking-tight">All observations</h2>
              <p className="mt-1 text-sm text-ink-600">
                Newest first. {sorted.length} published observation
                {sorted.length === 1 ? '' : 's'}.
              </p>
              <div className="mt-5">
                <PriceTable
                  observations={sorted}
                  showCommodity
                  caption={`All published price observations at ${market.name}`}
                />
              </div>
            </section>
          </>
        )}

        <div className="mt-12 flex flex-wrap gap-3">
          <Link
            href="/compare"
            className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
          >
            Compare markets
          </Link>
          <Link
            href="/markets"
            className="rounded-full border border-ink-300 px-5 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-400 hover:text-brand-800"
          >
            All markets
          </Link>
        </div>
      </div>
    </div>
  );
}
