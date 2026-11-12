import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PageHero } from '@/components/ui/PageHero';
import { getReport, REPORTS, computeReport } from '@/lib/content/reports';
import { getDataSource } from '@/lib/data';
import { formatDate, formatMoney } from '@/lib/money';
import { PRICE_TYPE_META } from '@/types/domain';
import { BRAND } from '@/lib/brand';
import { getSiteUrl } from '@/lib/supabase/config';

/**
 * The report's figures are computed from the published observations at request
 * time, so the page must not be frozen at build time. It is revalidated every
 * five minutes: fresh enough for a market reader, and cheap enough that the
 * database is not hammered on every request.
 */
export const revalidate = 300;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return REPORTS.map((report) => ({ slug: report.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const report = getReport(slug);
  if (!report) return { title: 'Report not found' };

  return {
    title: report.title,
    description: report.summary,
    alternates: { canonical: `/reports/${report.slug}` },
    openGraph: {
      type: 'article',
      title: `${report.title} | ${BRAND.name}`,
      description: report.summary,
    },
  };
}

export default async function ReportPage({ params }: PageProps) {
  const { slug } = await params;
  const report = getReport(slug);
  if (!report) notFound();

  const source = await getDataSource();
  const [observations, units, markets, commodities] = await Promise.all([
    source.listObservationsForAnalysis({}),
    source.listUnits(),
    source.listMarkets(),
    source.listCommodities(),
  ]);

  const unitLabels = new Map(units.map((unit) => [unit.id, unit.code]));

  const computed = computeReport(report, observations, {
    unitLabels,
    totalMarkets: markets.length,
    totalCommodities: commodities.length,
  });

  const siteUrl = getSiteUrl();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: report.title,
    description: report.summary,
    about: { '@type': 'Thing', name: 'Agricultural commodity prices' },
    publisher: {
      '@type': 'Organization',
      name: BRAND.name,
      logo: { '@type': 'ImageObject', url: `${siteUrl}/brand/gonapulse-logo-horizontal.svg` },
    },
    isPartOf: {
      '@type': 'WebSite',
      name: BRAND.name,
      url: siteUrl,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <PageHero
        eyebrow={report.category}
        title={report.title}
        lede={report.summary}
        breadcrumbs={[{ href: '/reports', label: 'Reports' }, { label: report.title }]}
      />

      <div className="section bg-ink-50">
        <div className="container-page grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <article className="card p-6 sm:p-8">
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
              <h2 className="text-xs font-bold uppercase tracking-wide text-brand-800">
                Method — how these figures were produced
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-brand-900">{report.method}</p>
            </div>

            {computed.empty ? (
              <div className="mt-8 rounded-xl border border-dashed border-ink-300 p-8 text-center">
                <p className="font-display text-lg font-semibold text-ink-800">
                  Not enough published data yet
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">
                  {computed.emptyReason} This report is published in full as soon as observations
                  are published inside its window. Nothing has been estimated to fill the gap.
                </p>
                <Link
                  href="/prices"
                  className="mt-4 inline-flex rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
                >
                  See what has been published
                </Link>
              </div>
            ) : (
              <>
                <p className="mt-6 rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 text-sm text-ink-600">
                  This report is measured over {computed.windowLabel}.{' '}
                  {computed.windowAnchoredToRecord && computed.anchorCollectedAt ? (
                    <>
                      The most recent published observation in the record is dated{' '}
                      <span className="font-semibold text-ink-900">
                        {formatDate(computed.anchorCollectedAt)}
                      </span>
                      , so the window is anchored there rather than to today. Nothing has been
                      estimated for the gap between that observation and now.
                    </>
                  ) : null}
                </p>

                <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {computed.figures.map((figure) => (
                    <div key={figure.label} className="rounded-xl border border-ink-200 bg-ink-50 p-4">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                        {figure.label}
                      </dt>
                      <dd className="mt-1.5 font-display text-2xl font-bold text-ink-950">
                        {figure.value}
                      </dd>
                      <p className="mt-1 text-xs text-ink-500">{figure.detail}</p>
                    </div>
                  ))}
                </dl>

                <div className="prose-gona mt-8">
                  {report.body.map((paragraph) => (
                    <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                  ))}
                </div>

                {computed.movements.length > 0 ? (
                  <section className="mt-10">
                    <h2 className="font-display text-xl font-bold tracking-tight text-ink-950">
                      Recorded movement
                    </h2>
                    <p className="mt-2 text-sm text-ink-600">
                      Between the first and last published observation in {computed.windowLabel}.
                    </p>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[34rem] text-left text-sm">
                        <thead>
                          <tr className="border-b border-ink-200 text-xs uppercase tracking-wide text-ink-500">
                            <th scope="col" className="py-2 pr-3">Commodity</th>
                            <th scope="col" className="py-2 pr-3">Price type</th>
                            <th scope="col" className="py-2 pr-3">First</th>
                            <th scope="col" className="py-2 pr-3">Last</th>
                            <th scope="col" className="py-2 pr-3">Change</th>
                            <th scope="col" className="py-2">Observations</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                          {computed.movements.map((movement) => (
                            <tr key={`${movement.commodityName}-${movement.priceType}-${movement.unitLabel}`}>
                              <th scope="row" className="py-2.5 pr-3 font-semibold text-ink-900">
                                {movement.commoditySlug ? (
                                  <Link
                                    href={`/commodities/${movement.commoditySlug}`}
                                    className="hover:text-brand-700"
                                  >
                                    {movement.commodityName}
                                  </Link>
                                ) : (
                                  movement.commodityName
                                )}
                              </th>
                              <td className="py-2.5 pr-3 text-ink-600">
                                {PRICE_TYPE_META[movement.priceType as keyof typeof PRICE_TYPE_META]
                                  ?.shortLabel ?? movement.priceType}
                              </td>
                              <td className="figure py-2.5 pr-3 text-ink-800">
                                {formatMoney(movement.firstAmount, { currency: movement.currencyCode })}
                              </td>
                              <td className="figure py-2.5 pr-3 text-ink-800">
                                {formatMoney(movement.lastAmount, { currency: movement.currencyCode })}
                              </td>
                              <td
                                className={`figure py-2.5 pr-3 ${
                                  (movement.changePercent ?? 0) > 0
                                    ? 'text-leaf-700'
                                    : (movement.changePercent ?? 0) < 0
                                      ? 'text-harvest-700'
                                      : 'text-ink-600'
                                }`}
                              >
                                {movement.changePercent === null
                                  ? '—'
                                  : `${movement.changePercent > 0 ? '+' : ''}${movement.changePercent.toFixed(1)}%`}
                              </td>
                              <td className="py-2.5 text-ink-500">
                                {movement.observations} &middot; {movement.firstDay} → {movement.lastDay}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ) : null}

                {computed.markets.length > 0 ? (
                  <section className="mt-10">
                    <h2 className="font-display text-xl font-bold tracking-tight text-ink-950">
                      By market and commodity
                    </h2>
                    <p className="mt-2 text-sm text-ink-600">
                      The median published figure for each market and commodity, with the number of
                      observations behind it.
                    </p>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[38rem] text-left text-sm">
                        <thead>
                          <tr className="border-b border-ink-200 text-xs uppercase tracking-wide text-ink-500">
                            <th scope="col" className="py-2 pr-3">Market</th>
                            <th scope="col" className="py-2 pr-3">Commodity</th>
                            <th scope="col" className="py-2 pr-3">Median</th>
                            <th scope="col" className="py-2 pr-3">Obs.</th>
                            <th scope="col" className="py-2">Latest</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                          {computed.markets.map((row, index) => (
                            <tr key={`${row.marketName}-${row.commodityName}-${index}`}>
                              <th scope="row" className="py-2.5 pr-3 font-semibold text-ink-900">
                                {row.marketSlug ? (
                                  <Link
                                    href={`/markets/${row.marketSlug}`}
                                    className="hover:text-brand-700"
                                  >
                                    {row.marketName}
                                  </Link>
                                ) : (
                                  row.marketName
                                )}
                                {row.stateName ? (
                                  <span className="ml-1.5 font-normal text-ink-500">
                                    {row.stateName}
                                  </span>
                                ) : null}
                              </th>
                              <td className="py-2.5 pr-3 text-ink-700">{row.commodityName}</td>
                              <td className="figure py-2.5 pr-3 text-ink-900">
                                {formatMoney(row.median, { currency: row.currencyCode })}
                                <span className="ml-1 text-xs font-normal text-ink-500">
                                  / {row.unitLabel}
                                </span>
                              </td>
                              <td className="py-2.5 text-ink-600">{row.observations}</td>
                              <td className="py-2.5 text-ink-500">{row.latestDay.slice(0, 10)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ) : null}

                {computed.thin.length > 0 ? (
                  <section className="mt-10">
                    <h2 className="font-display text-xl font-bold tracking-tight text-ink-950">
                      Thin coverage
                    </h2>
                    <p className="mt-2 text-sm text-ink-600">
                      Commodities with one or two published observations in this window. They do not
                      support a movement claim, and they are not given one.
                    </p>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {computed.thin.map((entry) => (
                        <li
                          key={entry.commodityName}
                          className="rounded-full border border-ink-200 bg-ink-50 px-3 py-1.5 text-xs text-ink-600"
                        >
                          {entry.commodityName} &middot; {entry.observations} obs.
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </>
            )}
          </article>

          <aside className="space-y-5">
            <div className="card p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-ink-700">
                About this report
              </h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-ink-500">Category</dt>
                  <dd className="font-semibold text-ink-900">{report.category}</dd>
                </div>
                <div>
                  <dt className="text-ink-500">Window</dt>
                  <dd className="font-semibold text-ink-900">{computed.windowLabel}</dd>
                </div>
                <div>
                  <dt className="text-ink-500">Observations used</dt>
                  <dd className="font-semibold text-ink-900">{computed.observationCount}</dd>
                </div>
                <div>
                  <dt className="text-ink-500">Refresh</dt>
                  <dd className="text-ink-700">{report.cadence}</dd>
                </div>
              </dl>
            </div>

            <div className="card p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-ink-700">
                Read next
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link
                    href="/methodology"
                    className="font-medium text-brand-700 hover:text-brand-800"
                  >
                    Price methodology
                  </Link>
                </li>
                <li>
                  <Link href="/coverage" className="font-medium text-brand-700 hover:text-brand-800">
                    Collection coverage
                  </Link>
                </li>
                <li>
                  <Link href="/disclaimer" className="font-medium text-brand-700 hover:text-brand-800">
                    Price data disclaimer
                  </Link>
                </li>
                <li>
                  <Link href="/reports" className="font-medium text-brand-700 hover:text-brand-800">
                    All reports
                  </Link>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
