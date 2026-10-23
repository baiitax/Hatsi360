import type { Metadata } from 'next';
import Link from 'next/link';
import { requireStaff } from '@/lib/analytics/../auth/guards';
import { getAnalytics } from '@/lib/analytics/queries';
import { periodLabel } from '@/lib/analytics/format';
import { METRIC_DEFINITIONS } from '@/lib/analytics/definitions';
import { DataTable, type Column } from '@/components/ops/DataTable';
import { PageHeader, Panel, Pill } from '@/components/ops/Primitives';
import { CollectionTrendChart, OutcomeBarChart } from '@/components/ops/Charts';
import { formatDateTime } from '@/lib/money';
import type { AgentPerformanceRow } from '@/lib/analytics/metrics';

export const metadata: Metadata = {
  title: 'Analytics — Control Centre',
  robots: { index: false, follow: false },
};

const PERIODS = [7, 30, 90];

function percent(value: number | null): string {
  return value === null || value === undefined ? '—' : `${value}%`;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const params = await searchParams;
  const days = PERIODS.includes(Number(params.days)) ? Number(params.days) : 30;

  await requireStaff('/admin/analytics');

  const { snapshot, agents, markets, commodities, trends } = await getAnalytics(days);

  const agentColumns: Column<AgentPerformanceRow>[] = [
    {
      key: 'name',
      header: 'Agent',
      cell: (row) => (
        <div>
          <p className="font-medium text-ink-900">{row.name}</p>
          {row.accountStatus !== 'active' ? (
            <Pill tone="warning">{row.accountStatus}</Pill>
          ) : null}
        </div>
      ),
    },
    { key: 'markets', header: 'Markets', numeric: true, cell: (row) => row.assignedMarkets, hideOnMobile: true },
    {
      key: 'tasks',
      header: 'Tasks',
      numeric: true,
      cell: (row) => (
        <span className="text-xs">
          {row.tasksCompleted}/{row.tasksEligible}
          <span className="ml-1 text-ink-500">({percent(row.taskCompletionRate)})</span>
        </span>
      ),
    },
    {
      key: 'submitted',
      header: 'Submitted',
      numeric: true,
      cell: (row) => row.observationsSubmitted,
    },
    {
      key: 'acceptance',
      header: 'Acceptance',
      numeric: true,
      cell: (row) => percent(row.verificationAcceptanceRate),
      hideOnMobile: true,
    },
    {
      key: 'consistency',
      header: 'Consistency',
      numeric: true,
      cell: (row) => percent(row.reportingConsistency),
      hideOnMobile: true,
    },
    {
      key: 'streak',
      header: 'Day streak',
      numeric: true,
      cell: (row) => row.consecutiveReportingDays,
      hideOnMobile: true,
    },
    {
      key: 'flags',
      header: 'Flagged',
      numeric: true,
      cell: (row) => percent(row.qualityWarningRate),
      hideOnMobile: true,
    },
    {
      key: 'missed',
      header: 'Missed deadlines',
      numeric: true,
      cell: (row) => row.missedDeadlines,
    },
  ];

  const outcomeData = [
    { label: 'Submitted', value: snapshot.submissions.filter((s) => s.verification_status === 'submitted' || s.verification_status === 'pending_verification').length },
    { label: 'Approved', value: snapshot.submissions.filter((s) => s.verification_status === 'verified').length },
    { label: 'Rejected', value: snapshot.submissions.filter((s) => s.verification_status === 'rejected').length },
    { label: 'Correction needed', value: snapshot.submissions.filter((s) => s.verification_status === 'correction_requested').length },
    { label: 'Published', value: snapshot.submissions.filter((s) => s.published_at).length },
  ];

  const trendData = trends.map((point) => ({
    label: point.date.slice(5),
    submitted: point.submitted,
    approved: point.approved,
    published: point.approved,
    expected: point.collected,
  }));

  return (
    <>
      <PageHeader
        title="Analytics centre"
        description="Agent productivity, market coverage, commodity coverage and data quality, all computed from the operational records in the selected window."
        breadcrumbs={[
          { label: 'Control Centre', href: '/admin/overview' },
          { label: 'Analytics' },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-ink-200 bg-white p-1">
            {PERIODS.map((option) => (
              <Link
                key={option}
                href={`/admin/analytics?days=${option}`}
                aria-current={option === days ? 'page' : undefined}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  option === days ? 'bg-brand-700 text-white' : 'text-ink-600 hover:bg-ink-100'
                }`}
              >
                {option}d
              </Link>
            ))}
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Collection and verification over time"
          description={periodLabel(days)}
        >
          <CollectionTrendChart data={trendData} height={280} />
        </Panel>

        <Panel title="Submission outcomes" description="Where the submissions in this window ended up.">
          <OutcomeBarChart data={outcomeData} height={280} />
        </Panel>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-bold text-ink-900">Agent productivity</h2>
        <DataTable
          caption="Agent productivity"
          columns={agentColumns}
          rows={agents}
          rowKey={(row) => row.agentId}
          empty="No agents have activity in this window."
        />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Market coverage" description="Lowest coverage first. Coverage is measured against the collection plan.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[30rem] text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                  <th scope="col" className="py-2 pr-3">Market</th>
                  <th scope="col" className="py-2 pr-3 text-right">Expected</th>
                  <th scope="col" className="py-2 pr-3 text-right">Collected</th>
                  <th scope="col" className="py-2 pr-3 text-right">Coverage</th>
                  <th scope="col" className="py-2">Last collection</th>
                </tr>
              </thead>
              <tbody>
                {markets.slice(0, 12).map((row) => (
                  <tr key={row.marketId} className="border-b border-ink-100 last:border-0">
                    <th scope="row" className="py-2 pr-3 text-left font-medium text-ink-800">
                      {row.name}
                    </th>
                    <td className="py-2 pr-3 text-right tabular-nums">{row.expected || '—'}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{row.collected}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{percent(row.coverageRate)}</td>
                    <td className="py-2 text-xs text-ink-500">
                      {row.latestCollectionAt ? formatDateTime(row.latestCollectionAt) : '—'}
                    </td>
                  </tr>
                ))}
                {markets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-sm text-ink-500">
                      No markets are configured.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Commodity coverage" description="How much has been collected for each commodity, and how much of it is flagged.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[30rem] text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                  <th scope="col" className="py-2 pr-3">Commodity</th>
                  <th scope="col" className="py-2 pr-3 text-right">Observations</th>
                  <th scope="col" className="py-2 pr-3 text-right">Markets</th>
                  <th scope="col" className="py-2 pr-3 text-right">Flagged</th>
                  <th scope="col" className="py-2">Latest</th>
                </tr>
              </thead>
              <tbody>
                {commodities.slice(0, 12).map((row) => (
                  <tr key={row.commodityId} className="border-b border-ink-100 last:border-0">
                    <th scope="row" className="py-2 pr-3 text-left font-medium text-ink-800">
                      Commodity #{row.commodityId}
                    </th>
                    <td className="py-2 pr-3 text-right tabular-nums">{row.observations}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{row.markets}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{row.flagged}</td>
                    <td className="py-2 text-xs text-ink-500">
                      {row.latestCollectedAt ? formatDateTime(row.latestCollectedAt) : '—'}
                    </td>
                  </tr>
                ))}
                {commodities.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-sm text-ink-500">
                      Nothing has been collected in this window.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>

      <Panel
        className="mt-6"
        title="Metric definitions"
        description="Every metric the console shows, with the formula it uses, where the data comes from and what it does not say."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
            <thead>
              <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                <th scope="col" className="py-2 pr-3">Metric</th>
                <th scope="col" className="py-2 pr-3">Formula</th>
                <th scope="col" className="py-2 pr-3">Source</th>
                <th scope="col" className="py-2">Caveats</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(METRIC_DEFINITIONS).map((definition) => (
                <tr key={definition.id} className="border-b border-ink-100 align-top last:border-0">
                  <th scope="row" className="py-2 pr-3 text-left font-medium text-ink-800">
                    {definition.label}
                  </th>
                  <td className="py-2 pr-3 text-xs text-ink-600">{definition.formula}</td>
                  <td className="py-2 pr-3 text-xs text-ink-500">{definition.source}</td>
                  <td className="py-2 text-xs text-ink-500">{definition.caveats ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
