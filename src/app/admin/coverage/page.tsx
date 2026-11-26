import type { Metadata } from 'next';
import { requireStaff } from '@/lib/auth/guards';
import { getAnalytics } from '@/lib/analytics/queries';
import { DataTable, type Column } from '@/components/ops/DataTable';
import { KpiCard } from '@/components/ops/KpiCard';
import { PageHeader, Panel, Pill } from '@/components/ops/Primitives';
import { formatDateTime } from '@/lib/money';
import type { MarketCoverageRow } from '@/lib/analytics/metrics';

/**
 * Coverage — which markets are actually being collected, and which are not.
 *
 * The admin navigation has linked to `/admin/coverage` since the console was
 * built, but the page did not exist: the sidebar entry 404'd. The module is
 * declared in `src/lib/operations/navigation.ts`, so the honest fix is to build
 * the page rather than to remove the link, and the data already exists —
 * `marketCoverage` and `commodityCoverage` derive every figure here from the
 * operational snapshot, which is loaded from the database.
 *
 * Everything on this page is a count from records: scheduled markets, expected
 * against collected observations, open tasks, and the last collection time per
 * commodity. Nothing is estimated, and a market with no published observation
 * says so instead of showing a zero that looks like a figure.
 */

export const metadata: Metadata = {
  title: 'Coverage — Control Centre',
  robots: { index: false, follow: false },
};

const PERIODS = [7, 30, 90];

function rate(value: number | null): string {
  return value === null || value === undefined ? '—' : `${value}%`;
}

export default async function CoveragePage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const params = await searchParams;
  const days = PERIODS.includes(Number(params.days)) ? Number(params.days) : 30;

  await requireStaff('/admin/coverage');

  const { markets, commodities, snapshot } = await getAnalytics(days);

  const scheduled = markets.filter((market) => market.scheduled);
  const unscheduled = markets.filter((market) => !market.scheduled);
  const collectedMarkets = markets.filter((market) => market.collected > 0);
  const rates = markets
    .map((market) => market.coverageRate)
    .filter((value): value is number => typeof value === 'number');
  const averageRate = rates.length
    ? Math.round(rates.reduce((sum, value) => sum + value, 0) / rates.length)
    : null;
  const openTasks = markets.reduce((sum, market) => sum + market.openTasks, 0);

  const marketColumns: Column<MarketCoverageRow>[] = [
    {
      key: 'market',
      header: 'Market',
      cell: (row) => (
        <div>
          <p className="font-medium text-ink-900">{row.name}</p>
          <p className="text-xs text-ink-500">
            {row.scheduled ? 'Scheduled' : 'No schedule'} · {row.assignedAgents} agent
            {row.assignedAgents === 1 ? '' : 's'}
          </p>
        </div>
      ),
    },
    {
      key: 'expected',
      header: 'Expected',
      cell: (row) => <span className="figure-num">{row.expected}</span>,
    },
    {
      key: 'collected',
      header: 'Collected',
      cell: (row) => <span className="figure-num">{row.collected}</span>,
    },
    {
      key: 'rate',
      header: 'Coverage',
      cell: (row) =>
        row.coverageRate === null ? (
          <span className="text-ink-400">no expectation</span>
        ) : (
          <Pill tone={row.coverageRate >= 80 ? 'success' : row.coverageRate >= 50 ? 'warning' : 'danger'}>
            {rate(row.coverageRate)}
          </Pill>
        ),
    },
    {
      key: 'tasks',
      header: 'Open tasks',
      cell: (row) => <span className="figure-num">{row.openTasks}</span>,
    },
    {
      key: 'status',
      header: 'State',
      cell: (row) =>
        row.collected === 0 ? (
          <Pill tone="danger">no collection</Pill>
        ) : row.active ? (
          <Pill tone="success">active</Pill>
        ) : (
          <Pill>Trading paused</Pill>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coverage"
        description="Markets that are scheduled, markets that were actually collected, and the gap between the two."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Markets scheduled"
          value={`${scheduled.length} of ${markets.length}`}
          detail={`${unscheduled.length} without a schedule`}
        />
        <KpiCard
          label="Markets collected"
          value={String(collectedMarkets.length)}
          detail={`in the last ${days} days`}
        />
        <KpiCard
          label="Average coverage"
          value={rate(averageRate)}
          detail="expected against collected"
        />
        <KpiCard label="Open tasks" value={String(openTasks)} detail="unfinished assignments" />
      </div>

      <Panel
        title="Market coverage"
        description="Expected observations come from each market's collection schedule in the selected period."
      >
        <DataTable<MarketCoverageRow>
          columns={marketColumns}
          rows={markets}
          rowKey={(row) => String(row.marketId)}
          empty="No markets are configured yet."
        />
      </Panel>

      <Panel
        title="Commodity coverage"
        description="Every figure is a count of observations recorded in the period, with the most recent collection time."
      >
        {commodities.length === 0 ? (
          <p className="text-sm text-ink-500">
            No observations were recorded in the last {days} days, so there is nothing to report.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {commodities.map((row) => (
              <li key={row.commodityId} className="flex items-center justify-between py-2">
                <span className="text-sm text-ink-800">
                  Commodity #{row.commodityId}
                  <span className="ml-2 text-xs text-ink-500">
                    {row.markets} market{row.markets === 1 ? '' : 's'}
                  </span>
                </span>
                <span className="flex items-center gap-3 text-xs text-ink-500">
                  {row.flagged > 0 ? <Pill tone="warning">{row.flagged} flagged</Pill> : null}
                  <span className="figure-num">{row.observations} obs</span>
                  <span>{row.latestCollectedAt ? formatDateTime(row.latestCollectedAt) : '—'}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <p className="text-xs text-ink-500">
        Period: last {days} days. Snapshot loaded {formatDateTime(snapshot.generatedAt)}.
      </p>
    </div>
  );
}
