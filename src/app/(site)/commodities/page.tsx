import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getDataSource } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import {
  getCommodityFreshness,
  type CommodityFreshness,
} from '@/lib/trade/queries';
import {
  PageContainer,
  PageHeader,
  SectionHeader,
} from '@/components/terminal/TerminalShell';
import {
  CommodityCardSkeleton,
  EmptyStatePanel,
  PanelSkeleton,
} from '@/components/feedback/TerminalFeedback';
import {
  DataFreshnessIndicator,
  type FreshnessState,
} from '@/components/market/MarketOverview';
import { IconArrowRight } from '@/components/ui/icons';
import type { Commodity, CommodityCategory } from '@/types/domain';

export const metadata: Metadata = {
  title: 'Commodity Directory',
  description:
    'Every agricultural commodity Hatsi360 Markets tracks, with the markets reporting each one and how current the latest published observation is.',
  alternates: { canonical: '/commodities' },
};

export const dynamic = 'force-dynamic';

/**
 * The commodity directory.
 *
 * A working register, not a gallery. Each commodity is shown with the thing a
 * trader needs before opening it — how many observations exist, when the last
 * one was collected, and how fresh that is — so the directory answers "is there
 * anything here for me?" without a single click.
 *
 * The catalogue is complete on purpose. A commodity with no published
 * observation is still listed, because its absence from the price record is
 * itself information, and it is marked as such rather than hidden.
 *
 * The legacy `?id=` link is preserved: the old site's `commodity-detail.php`
 * resolved to a price view, so it redirects to the price route rather than 404ing.
 */
export default async function CommodityDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; category?: string; page?: string }>;
}) {
  const params = await searchParams;
  const configured = isSupabaseConfigured();
  const source = configured ? await getDataSource() : null;

  const [commodities, categories, freshness]: [
    Commodity[],
    CommodityCategory[],
    CommodityFreshness[],
  ] = source
    ? await Promise.all([
        source.listCommodities(),
        source.listCategories(),
        getCommodityFreshness(),
      ])
    : [[], [], []];

  // A legacy link such as commodity-detail.php?id=1 lands here with ?id=. The
  // legacy detail page was the price view, so it resolves to /prices/<slug>.
  if (params.id) {
    const legacyId = Number(params.id);
    const match = commodities.find((c) => c.legacyId === legacyId);
    if (match) redirect(`/prices/${match.slug}`);
  }

  const activeCategory = params.category
    ? categories.find((c) => c.slug === params.category)
    : undefined;

  const filtered = activeCategory
    ? commodities.filter((c) => c.categoryId === activeCategory.id)
    : commodities;

  const page = Math.max(1, Number(params.page ?? '1') || 1);
  const pageSize = 24;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const items = filtered.slice((page - 1) * pageSize, page * pageSize);

  const freshnessById = new Map(
    freshness.map((entry) => [entry.commodityId, entry]),
  );
  const withPrices = commodities.filter((c) => (c.observationCount ?? 0) > 0).length;

  const buildHref = (nextPage: number) => {
    const search = new URLSearchParams();
    if (activeCategory) search.set('category', activeCategory.slug);
    search.set('page', String(nextPage));
    return `/commodities?${search.toString()}`;
  };

  return (
    <PageContainer>
      <PageHeader
        title="Commodity directory"
        description={`The catalogue of ${commodities.length} agricultural commodities Hatsi360 Markets tracks, across ${categories.length} categories. ${withPrices} of them currently carry a published price observation; the rest are listed so the register is complete, and they appear in price results only once a price is published for them.`}
        actions={
          <Link href="/coverage" className="terminal-action">
            Collection coverage
          </Link>
        }
      />

      {/* ------------------------------------------------- category filter -- */}
      <nav aria-label="Filter by category" className="flex flex-wrap gap-1.5">
        <Link
          href="/commodities"
          aria-current={!activeCategory ? 'page' : undefined}
          className="terminal-control"
        >
          All categories
        </Link>
        {categories.map((category) => {
          const selected = activeCategory?.id === category.id;
          const count = commodities.filter((c) => c.categoryId === category.id).length;
          return (
            <Link
              key={category.id}
              href={`/commodities?category=${category.slug}`}
              aria-current={selected ? 'page' : undefined}
              className="terminal-control"
            >
              {category.name}
              <span className="figure-num text-terminal-text-muted">{count}</span>
            </Link>
          );
        })}
      </nav>

      {!configured ? (
        <EmptyStatePanel
          kind="no-market-data"
          action={{ label: 'See collection coverage', href: '/coverage' }}
        />
      ) : items.length === 0 ? (
        <EmptyStatePanel
          kind="no-commodity-results"
          action={
            activeCategory
              ? { label: 'Show all categories', href: '/commodities' }
              : undefined
          }
        />
      ) : (
        <>
          <section aria-label="The commodity register">
            <SectionHeader
              title={activeCategory ? activeCategory.name : 'All commodities'}
              count={filtered.length}
              href="/commodities"
            />
            <ol className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((commodity) => {
                const entry = freshnessById.get(commodity.id);
                const observed = (commodity.observationCount ?? 0) > 0;
                // The platform's own freshness classification, read rather than
                // re-derived, so this page and the price cards agree.
                const state: FreshnessState = entry
                  ? entry.state === 'recently_updated' || entry.state === 'latest_verified'
                    ? 'fresh'
                    : entry.state === 'stale'
                      ? 'stale'
                      : entry.state === 'delayed'
                        ? 'delayed'
                        : 'today'
                  : 'unavailable';
                return (
                  <li key={commodity.id}>
                    <Link
                      href={`/commodities/${commodity.slug}`}
                      className="terminal-panel group flex h-full flex-col gap-2 p-3 transition-colors duration-150 ease-out hover:border-harvest-500/40 hover:bg-terminal-elevated"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="text-[0.9375rem] font-semibold leading-tight text-terminal-text group-hover:text-harvest-300">
                          {commodity.name}
                        </h3>
                        <IconArrowRight
                          className="size-3.5 shrink-0 text-terminal-text-muted"
                          aria-hidden="true"
                        />
                      </div>

                      <p className="text-[0.6875rem] leading-relaxed text-terminal-text-secondary">
                        {commodity.categoryName ?? 'Uncategorised'}
                        {commodity.marketCount
                          ? ` · ${commodity.marketCount} reporting market${commodity.marketCount === 1 ? '' : 's'}`
                          : ''}
                      </p>

                      <div className="mt-auto flex items-center justify-between gap-2 border-t border-terminal-border pt-2">
                        <span className="figure-num text-terminal-text-secondary">
                          {observed ? (
                            <>
                              <span className="text-terminal-text">
                                {commodity.observationCount}
                              </span>{' '}
                              observation{commodity.observationCount === 1 ? '' : 's'}
                            </>
                          ) : (
                            <span className="text-terminal-text-muted">
                              No published price
                            </span>
                          )}
                        </span>
                        <DataFreshnessIndicator
                          state={state}
                          observedAt={
                            commodity.latestObservationAt ?? entry?.collectedAt ?? null
                          }
                        />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>

          {totalPages > 1 ? (
            <nav aria-label="Directory pages" className="flex items-center gap-1.5">
              {page > 1 ? (
                <Link href={buildHref(page - 1)} rel="prev" className="terminal-control">
                  Previous
                </Link>
              ) : null}
              <span className="figure-num px-2 text-terminal-text-secondary">
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <Link href={buildHref(page + 1)} rel="next" className="terminal-control">
                  Next
                </Link>
              ) : null}
            </nav>
          ) : null}
        </>
      )}

      {!configured ? null : (
        <section aria-label="How to read this register">
          <SectionHeader title="How to read this register" />
          <div className="terminal-panel p-4">
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="figure-label">A commodity with no price</dt>
                <dd className="mt-1 text-[0.75rem] leading-relaxed text-terminal-text-secondary">
                  It is tracked but has no published observation. That is a statement
                  about coverage, not about the market, and no figure is estimated to
                  fill the gap.
                </dd>
              </div>
              <div>
                <dt className="figure-label">The observation count</dt>
                <dd className="mt-1 text-[0.75rem] leading-relaxed text-terminal-text-secondary">
                  How many published observations exist for the commodity across all
                  series and markets. It is not a volume and it is not a trade count.
                </dd>
              </div>
              <div>
                <dt className="figure-label">The freshness state</dt>
                <dd className="mt-1 text-[0.75rem] leading-relaxed text-terminal-text-secondary">
                  Calculated from when the latest observation was collected and how
                  often that commodity is collected. It never reflects how recently
                  this page loaded.
                </dd>
              </div>
            </dl>
          </div>
        </section>
      )}
    </PageContainer>
  );
}

/** The directory while its data loads. Mirrors the register it replaces. */
export function DirectoryLoading() {
  return (
    <PageContainer>
      <PageHeader
        title="Commodity directory"
        description="Loading the catalogue and the freshness of each commodity."
      />
      <PanelSkeleton lines={1} />
      <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 12 }).map((_, index) => (
          <li key={index}>
            <CommodityCardSkeleton />
          </li>
        ))}
      </ol>
    </PageContainer>
  );
}
