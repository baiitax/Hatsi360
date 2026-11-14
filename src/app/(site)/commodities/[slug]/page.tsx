import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getDataSource } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getMarketMovements, getCommoditySeriesOptions } from '@/lib/trade/queries';
import { PRICE_RANGES } from '@/components/data/CommodityPriceView';
import { PageContainer, PageHeader, SectionHeader } from '@/components/terminal/TerminalShell';
import { MarketOverviewCard } from '@/components/market/MarketOverview';
import { PriceMovementIndicator } from '@/components/market/PriceDisplay';
import { VerificationBadge } from '@/components/ui/data-display';
import { EmptyStatePanel, PanelSkeleton } from '@/components/feedback/TerminalFeedback';
import { IconArrowRight, IconCharts, IconTable } from '@/components/ui/icons';
import { formatMoney } from '@/lib/money';
import type { Commodity, PriceObservation } from '@/types/domain';

export const dynamic = 'force-dynamic';

/**
 * The commodity profile.
 *
 * The register view of one commodity: what it is, which series it is quoted in,
 * which markets report it, and how current the record is. It is deliberately
 * *not* the deep price view — that is `/prices/<slug>`, which carries the
 * history, the chart and the full observation list. Splitting the two keeps the
 * profile answerable in one screen and leaves the analysis where it belongs.
 *
 * Everything on this page is derived from published observations. There is no
 * hand-written summary, no forecast and no estimated figure.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const source = await getDataSource();
  const commodity = await source.getCommodityBySlug(slug);
  if (!commodity) return { title: 'Commodity not found' };

  return {
    title: `${commodity.name} profile`,
    description:
      commodity.description ??
      `The reporting markets, comparable series and freshness of the published record for ${commodity.name} on Hatsi360 Markets.`,
    alternates: { canonical: `/commodities/${commodity.slug}` },
    openGraph: {
      title: `${commodity.name} profile — Hatsi360 Markets`,
      description: commodity.description ?? `The commodity profile for ${commodity.name}.`,
      url: `/commodities/${commodity.slug}`,
    },
  };
}

export default async function CommodityProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const source = await getDataSource();

  const commodity = await source.getCommodityBySlug(slug);
  if (!commodity) notFound();

  // The range is preserved from the previous shared URL so an existing link
  // still lands on the window it asked for. It scopes the per-market summary.
  const rangeKey = query.range ?? 'all';
  const range = PRICE_RANGES.find((r) => r.key === rangeKey) ?? PRICE_RANGES[PRICE_RANGES.length - 1]!;

  const observations = await source.listObservationsForAnalysis({
    commodityId: commodity.id,
  });

  const windowed = applyRange(observations, range.days);

  const [seriesOptions, movements] = isSupabaseConfigured()
    ? await Promise.all([
        getCommoditySeriesOptions(commodity.id),
        getMarketMovements(200),
      ])
    : [[], []];

  const movement = movements.find((m) => m.commodityId === commodity.id) ?? null;

  const byMarket = groupByMarket(windowed);
  const units = uniqueStrings(windowed.map((o) => o.unitCode ?? o.unitName));
  const grades = uniqueStrings(windowed.map((o) => o.gradeName));
  const priceTypes = uniqueStrings(windowed.map((o) => o.priceType.replace(/_/g, ' ')));

  // The range is anchored to the newest observation, so the caption can say so.
  const windowAnchor = range.days === null ? null : newestCollectedAt(observations);

  const latest = [...observations].sort((a, b) => b.collectedAt.localeCompare(a.collectedAt))[0];

  return (
    <PageContainer>
      <PageHeader
        title={commodity.name}
        description={
          commodity.description ??
          `A tracked commodity in the Hatsi360 Markets catalogue. ${commodity.marketCount ?? 0} market${
            (commodity.marketCount ?? 0) === 1 ? '' : 's'
          } have published a price for it.`
        }
        actions={
          <>
            <Link href={`/prices/${commodity.slug}`} className="terminal-action">
              <IconTable className="size-3.5" />
              Price history
            </Link>
            <Link href={`/charts?commodity=${commodity.slug}`} className="terminal-action">
              <IconCharts className="size-3.5" />
              Chart it
            </Link>
          </>
        }
      />

      {/* ------------------------------------------------------- the record -- */}
      {observations.length === 0 ? (
        <EmptyStatePanel
          kind="no-observations"
          action={{ label: 'See collection coverage', href: '/coverage' }}
        />
      ) : (
        <>
          <section aria-label="The published record">
            <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <MarketOverviewCard
                label="Observations"
                value={String(observations.length)}
                detail={`published, across ${byMarket.length} market${byMarket.length === 1 ? '' : 's'}`}
              />
              <MarketOverviewCard
                label="Reporting markets"
                value={String(byMarket.length)}
                detail="markets with at least one published price"
              />
              <MarketOverviewCard
                label="Units quoted"
                value={units.length === 0 ? null : String(units.length)}
                detail={units.length === 0 ? 'No unit recorded' : units.slice(0, 3).join(', ')}
                unavailableReason={units.length === 0 ? 'No unit is recorded on any published observation.' : undefined}
              />
              <MarketOverviewCard
                label="Grades recorded"
                value={grades.length === 0 ? null : String(grades.length)}
                detail={grades.length === 0 ? 'No grade recorded' : grades.slice(0, 3).join(', ')}
                unavailableReason={grades.length === 0 ? 'No grade is recorded on any published observation.' : undefined}
              />
            </dl>
          </section>

          {/* ------------------------------------------------------ movement -- */}
          {movement ? (
            <section aria-label="Movement">
              <SectionHeader title="Movement between comparable observations" />
              <div className="terminal-panel p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="figure-label">Latest against previous, same series</p>
                    <p className="mt-1 text-[0.8125rem] leading-relaxed text-terminal-text-secondary">
                      A change is only calculated where both observations share a series
                      key — the same price type, grade, unit and currency. Otherwise the
                      difference would be between two different things.
                    </p>
                  </div>
                  <PriceMovementIndicator
                    change={movement.change}
                    changePercent={movement.changePercent}
                    currencyCode={movement.currencyCode}
                    size="md"
                  />
                </div>
                <p className="mt-3 border-t border-terminal-border pt-3 text-[0.6875rem] leading-relaxed text-terminal-text-muted">
                  A movement is a direction between two observations, not a recommendation,
                  and not a trend. {movement.observationCount} observation
                  {movement.observationCount === 1 ? '' : 's'} in the comparable series;
                  latest from {movement.marketName ?? 'an unnamed market'}.
                </p>
              </div>
            </section>
          ) : null}

          {/* ------------------------------------------------ series options -- */}
          {seriesOptions.length > 0 ? (
            <section aria-label="Comparable series">
              <SectionHeader
                title="Comparable series"
                count={seriesOptions.length}
                action={{ href: '/methodology', label: 'How comparability is decided' }}
              />
              <div className="terminal-panel overflow-x-auto">
                <table className="terminal-table">
                  <caption className="sr-only">
                    The comparable series published for {commodity.name}. A series is a
                    combination of price type, grade, unit and currency; only observations
                    inside one series can be compared with each other.
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Series</th>
                      <th scope="col" className="text-right">Observations</th>
                      <th scope="col" className="text-right">Markets</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seriesOptions.map((option) => (
                      <tr key={option.key}>
                        <td>
                          <span className="text-terminal-text">{option.label}</span>
                        </td>
                        <td className="num text-right">{option.observationCount}</td>
                        <td className="num text-right">{option.marketCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[0.6875rem] leading-relaxed text-terminal-text-muted">
                A price in one series is not comparable with a price in another. Choosing a
                series — rather than a market and a grade separately — is how incompatible
                comparisons are avoided.
              </p>
            </section>
          ) : null}

          {/* -------------------------------------------------- per-market -- */}
          <section aria-label="Reporting markets">
            <SectionHeader
              title="Reporting markets"
              count={byMarket.length}
              action={{ href: `/markets`, label: 'The market register' }}
            />
            {byMarket.length === 0 ? (
              <EmptyStatePanel kind="no-commodity-results" />
            ) : (
              <>
                <div className="terminal-panel overflow-x-auto">
                  <table className="terminal-table">
                    <caption className="sr-only">
                      The most recent published price for {commodity.name} in each reporting
                      market, over the selected range ({range.label}).
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Market</th>
                        <th scope="col">Price</th>
                        <th scope="col">Unit</th>
                        <th scope="col">Grade</th>
                        <th scope="col">Status</th>
                        <th scope="col">Observed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byMarket.map((row) => (
                        <tr key={row.marketId}>
                          <th scope="row" className="font-medium text-terminal-text">
                            {row.marketName ?? `Market ${row.marketId}`}
                            {row.stateName ? (
                              <span className="ml-1 font-normal text-terminal-text-muted">
                                {row.stateName}
                              </span>
                            ) : null}
                          </th>
                          <td className="num">
                            {row.amount === null ? (
                              <span className="text-terminal-text-muted">Not observed</span>
                            ) : (
                              formatMoney(row.amount, { currency: row.currencyCode })
                            )}
                          </td>
                          <td>{row.unitCode ?? '—'}</td>
                          <td>{row.gradeName ?? '—'}</td>
                          <td>
                            <VerificationBadge
                              status={row.verificationStatus}
                              surface="terminal"
                            />
                          </td>
                          <td className="num text-terminal-text-secondary">
                            {new Date(row.collectedAt).toLocaleDateString('en-NG')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[0.6875rem] leading-relaxed text-terminal-text-muted">
                  Every price is shown with its unit, because a price without a unit is not
                  a price. {windowed.length} observation
                  {windowed.length === 1 ? '' : 's'} fall inside the selected range
                  {priceTypes.length > 0 ? ` · price types recorded: ${priceTypes.join(', ')}` : ''}
                  {windowAnchor
                    ? ` · the window ends at the newest observation, ${new Date(windowAnchor).toLocaleDateString('en-NG')}`
                    : '.'}
                </p>
              </>
            )}
          </section>

          {/* ---------------------------------------------------- the range -- */}
          <nav aria-label="Time range" className="flex flex-wrap gap-1.5">
            {PRICE_RANGES.map((entry) => (
              <Link
                key={entry.key}
                href={`/commodities/${commodity.slug}?range=${entry.key}`}
                aria-current={entry.key === rangeKey ? 'page' : undefined}
                className="terminal-control"
              >
                {entry.label}
              </Link>
            ))}
          </nav>
        </>
      )}

      {/* ------------------------------------------------------- synonyms -- */}
      {commodity.synonyms && commodity.synonyms.length > 0 ? (
        <section aria-label="Also known as">
          <SectionHeader title="Also known as" />
          <p className="text-[0.8125rem] leading-relaxed text-terminal-text-secondary">
            {commodity.synonyms.join(' · ')}
          </p>
        </section>
      ) : null}

      {latest ? (
        <p className="text-[0.6875rem] leading-relaxed text-terminal-text-muted">
          The most recent published observation for {commodity.name} was collected on{' '}
          {new Date(latest.collectedAt).toLocaleString('en-NG')}. Freshness describes the
          collection time, not the time this page loaded.{' '}
          <Link
            href={`/prices/${commodity.slug}`}
            className="inline-flex items-center gap-1 font-semibold text-harvest-300 underline decoration-terminal-border underline-offset-2"
          >
            Open the full price history
            <IconArrowRight className="size-3" aria-hidden="true" />
          </Link>
        </p>
      ) : null}
    </PageContainer>
  );
}

/* ------------------------------------------------------------- helpers ---- */

interface MarketRollup {
  marketId: number;
  marketName: string | null;
  stateName: string | null;
  amount: number | null;
  currencyCode: string;
  unitCode: string | null;
  gradeName: string | null;
  verificationStatus: PriceObservation['verificationStatus'];
  collectedAt: string;
}

/** The newest collection timestamp in the record, or `null` when empty. */
function newestCollectedAt(observations: PriceObservation[]): string | null {
  return observations.reduce<string | null>(
    (newest, observation) =>
      newest === null || observation.collectedAt > newest ? observation.collectedAt : newest,
    null,
  );
}

/**
 * The observations inside a day range.
 *
 * The range is anchored to the newest observation in the record rather than to
 * the wall clock. A record whose latest observation is a week old should show
 * its own last ninety days, not a window that ends a week before today and
 * silently drops the most recent data.
 */
function applyRange(observations: PriceObservation[], days: number | null): PriceObservation[] {
  if (days === null) return observations;
  const newest = newestCollectedAt(observations);
  if (newest === null) return observations;
  const cutoff = new Date(new Date(newest).getTime() - days * 86_400_000).toISOString();
  return observations.filter((observation) => observation.collectedAt >= cutoff);
}

/** The most recent published observation per market. */
function groupByMarket(observations: PriceObservation[]): MarketRollup[] {
  const byMarket = new Map<number, PriceObservation>();
  for (const observation of observations) {
    const existing = byMarket.get(observation.marketId);
    if (!existing || observation.collectedAt > existing.collectedAt) {
      byMarket.set(observation.marketId, observation);
    }
  }
  return [...byMarket.values()]
    .map((observation) => ({
      marketId: observation.marketId,
      marketName: observation.marketName ?? null,
      stateName: observation.stateName ?? null,
      amount: observation.normalizedAmount ?? observation.reportedAmount ?? null,
      currencyCode: observation.currencyCode,
      unitCode: observation.unitCode ?? null,
      gradeName: observation.gradeName ?? null,
      verificationStatus: observation.verificationStatus,
      collectedAt: observation.collectedAt,
    }))
    .sort((a, b) => b.collectedAt.localeCompare(a.collectedAt));
}

/** Unique, non-empty values in the order they first appear. */
function uniqueStrings(values: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!value) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

/* ------------------------------------------------------------- fallbacks -- */

/** The profile while its data loads. */
export function ProfileLoading() {
  return (
    <PageContainer>
      <PageHeader
        title="Commodity profile"
        description="Loading the commodity's record, its series and its reporting markets."
      />
      <PanelSkeleton lines={6} />
    </PageContainer>
  );
}
