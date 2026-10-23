import type { Metadata } from 'next';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth/guards';
import { getOverview } from '@/lib/analytics/queries';
import { periodLabel } from '@/lib/analytics/format';
import { METRIC_DEFINITIONS } from '@/lib/analytics/definitions';
import { KpiCard } from '@/components/ops/KpiCard';
import { PageHeader, Panel, Pill } from '@/components/ops/Primitives';
import { CollectionTrendChart, CoverageBarChart } from '@/components/ops/Charts';
import { formatDateTime } from '@/lib/money';

export const metadata: Metadata = {
  title: 'Overview — Control Centre',
  robots: { index: false, follow: false },
};

const PERIODS = [7, 30, 90];

const PRIMARY_METRICS = [
  'markets_total',
  'agents_total',
  'markets_observed_today',
  'observations_today',
  'observations_pending_verification',
  'observations_published',
];

const SECONDARY_METRICS = [
  'markets_overdue',
  'markets_without_agent',
  'observations_rejected',
  'records_flagged',
  'agents_submitted_today',
  'agents_with_tasks_today',
];

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const params = await searchParams;
  const days = PERIODS.includes(Number(params.days)) ? Number(params.days) : 7;

  await requireStaff('/admin/overview');

  const { snapshot, metrics, feed, trends, coverage } = await getOverview(days);

  const metricById = new Map(metrics.map((metric) => [metric.id, metric]));
  const definitionFor = (id: string) => METRIC_DEFINITIONS[id as keyof typeof METRIC_DEFINITIONS];

  const formatValue = (value: number | null) =>
    value === null || value === undefined ? '—' : new Intl.NumberFormat('en-NG').format(value);

  const trendData = trends.map((point) => ({
    label: point.date.slice(5),
    submitted: point.submitted,
    approved: point.approved,
    published: point.approved,
    expected: point.collected,
  }));

  const coverageData = coverage
    .filter((row) => row.scheduled)
    .slice(0, 12)
    .map((row) => ({
      label: row.name.length > 14 ? `${row.name.slice(0, 13)}…` : row.name,
      value: row.collected,
      expected: row.expected,
    }));

  const priorityActions = feed.slice(0, 8);

  return (
    <>
      <PageHeader
        title="Overview"
        description={
          <>
            Every figure below is read from the operational database at the moment this page was
            rendered. Nothing here is estimated, and a metric with no underlying records is shown
            as a dash rather than as zero.
          </>
        }
        breadcrumbs={[{ label: 'Control Centre', href: '/admin/overview' }, { label: 'Overview' }]}
        actions={
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-ink-200 bg-white p-1">
            {PERIODS.map((option) => (
              <Link
                key={option}
                href={`/admin/overview?days=${option}`}
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

      {!snapshot.configured ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>No database is configured.</strong> Connect a Supabase project as described in{' '}
          <code className="rounded bg-amber-100 px-1">.env.example</code> to see live operational
          figures. This deployment is showing an empty state on purpose rather than sample numbers.
        </div>
      ) : null}

      {snapshot.truncated.observations || snapshot.truncated.tasks ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This snapshot hit its read limit
          {snapshot.truncated.observations ? ` (${'observations'})` : ''}
          {snapshot.truncated.tasks ? ` (${'tasks'})` : ''}
          . The figures below are computed from the records that were read and may understate the
          total.
        </div>
      ) : null}

      <section aria-label="Key indicators" className="mb-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {PRIMARY_METRICS.map((id) => {
            const metric = metricById.get(id);
            const definition = definitionFor(id);
            return (
              <KpiCard
                key={id}
                label={metric?.label ?? id}
                value={formatValue(metric?.value ?? null)}
                changePercent={metric?.comparison.changePercent ?? null}
                definition={definition?.formula}
                source={definition?.source}
              />
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel
            title="Collection and verification trend"
            description={`Prices collected, submitted and approved over the ${periodLabel(days).toLowerCase()}.`}
            actions={
              <Link href="/admin/analytics" className="text-xs font-semibold text-brand-700 hover:underline">
                Open the analytics centre
              </Link>
            }
          >
            <CollectionTrendChart data={trendData} />
          </Panel>

          <Panel
            title="Market coverage"
            description="Collected observations against the collection plan, for the scheduled markets with the lowest coverage first."
          >
            <CoverageBarChart data={coverageData} />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm">
                <thead>
                  <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                    <th scope="col" className="px-2 py-2">Market</th>
                    <th scope="col" className="px-2 py-2 text-right">Collected</th>
                    <th scope="col" className="px-2 py-2 text-right">Expected</th>
                    <th scope="col" className="px-2 py-2 text-right">Coverage</th>
                    <th scope="col" className="px-2 py-2">Agents</th>
                    <th scope="col" className="px-2 py-2">Last collection</th>
                  </tr>
                </thead>
                <tbody>
                  {coverage.slice(0, 10).map((row) => (
                    <tr key={row.marketId} className="border-b border-ink-100 last:border-0">
                      <th scope="row" className="px-2 py-2 text-left font-medium text-ink-800">
                        {row.name}
                      </th>
                      <td className="px-2 py-2 text-right tabular-nums">{row.collected}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{row.expected || '—'}</td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {row.coverageRate === null ? '—' : `${row.coverageRate}%`}
                      </td>
                      <td className="px-2 py-2">{row.assignedAgents}</td>
                      <td className="px-2 py-2 text-ink-500">
                        {row.latestCollectionAt ? formatDateTime(row.latestCollectionAt) : '—'}
                      </td>
                    </tr>
                  ))}
                  {coverage.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-2 py-6 text-center text-sm text-ink-500">
                        No markets are configured yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel
            title="Priority action queue"
            description="The things that are waiting for somebody to act, most serious first."
          >
            {priorityActions.length === 0 ? (
              <p className="rounded-lg border border-dashed border-ink-200 bg-ink-50/60 px-4 py-8 text-center text-sm text-ink-500">
                Nothing is waiting for attention right now.
              </p>
            ) : (
              <ul className="space-y-2">
                {priorityActions.map((event) => (
                  <li key={event.id} className="rounded-lg border border-ink-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-ink-900">{event.title}</p>
                      <Pill
                        tone={
                          event.severity === 'critical'
                            ? 'danger'
                            : event.severity === 'warning'
                              ? 'warning'
                              : 'info'
                        }
                      >
                        {event.kind}
                      </Pill>
                    </div>
                    <p className="mt-1 text-xs text-ink-600">{event.detail}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-ink-400">{formatDateTime(event.at)}</span>
                      {event.actionUrl ? (
                        <Link
                          href={event.actionUrl}
                          className="text-xs font-semibold text-brand-700 hover:underline"
                        >
                          Open
                        </Link>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Secondary indicators" description="Counters that describe the estate rather than the day's work.">
            <dl className="space-y-3">
              {SECONDARY_METRICS.map((id) => {
                const metric = metricById.get(id);
                const definition = definitionFor(id);
                return (
                  <div key={id} className="border-b border-ink-100 pb-3 last:border-0 last:pb-0">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                      {metric?.label ?? id}
                    </dt>
                    <dd className="mt-0.5 flex items-baseline justify-between gap-3">
                      <span className="text-xl font-bold tabular-nums text-ink-900">
                        {formatValue(metric?.value ?? null)}
                      </span>
                      <span className="text-xs text-ink-500">
                        {metric?.comparison.changePercent === null ||
                        metric?.comparison.changePercent === undefined
                          ? 'no prior period'
                          : `${metric.comparison.changePercent > 0 ? '+' : ''}${metric.comparison.changePercent}% vs previous`}
                      </span>
                    </dd>
                    {definition?.caveats ? (
                      <p className="mt-1 text-[11px] leading-relaxed text-ink-400">
                        {definition.caveats}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </dl>
          </Panel>

          <Panel title="Snapshot" description="How this page was assembled.">
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Timezone</dt>
                <dd className="font-medium text-ink-800">{snapshot.timezone}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Current period</dt>
                <dd className="font-medium text-ink-800">
                  {snapshot.windows.currentFrom} → {snapshot.windows.currentTo}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Compared with</dt>
                <dd className="font-medium text-ink-800">
                  {snapshot.windows.previousFrom} → {snapshot.windows.previousTo}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Rendered at</dt>
                <dd className="font-medium text-ink-800">{formatDateTime(snapshot.generatedAt)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Records read</dt>
                <dd className="font-medium text-ink-800">
                  {snapshot.observations.length} observations · {snapshot.tasks.length} tasks
                </dd>
              </div>
            </dl>
          </Panel>
        </div>
      </div>
    </>
  );
}
