import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/guards';
import { JOB_DEFINITIONS, recentJobRuns } from '@/lib/jobs';
import { DataTable, type Column } from '@/components/ops/DataTable';
import { PageHeader, Panel, Pill } from '@/components/ops/Primitives';
import { RunJobButton } from '@/components/admin/JobControls';
import { formatDateTime } from '@/lib/money';

export const metadata: Metadata = {
  title: 'Jobs and health — Control Centre',
  robots: { index: false, follow: false },
};

interface JobRunRow {
  id: number;
  job_name: string;
  scheduled_for: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  records_processed: number;
  error: string | null;
  triggered_by: string | null;
}

export default async function SystemPage() {
  await requireAdmin('/admin/system');

  const runs = (await recentJobRuns(40)) as JobRunRow[];

  const columns: Column<JobRunRow>[] = [
    {
      key: 'job',
      header: 'Job',
      cell: (row) => (
        <span className="font-medium text-ink-900">{row.job_name.replace(/_/g, ' ')}</span>
      ),
    },
    {
      key: 'slot',
      header: 'Scheduled for',
      cell: (row) => <span className="text-xs text-ink-600">{formatDateTime(row.scheduled_for)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => (
        <Pill
          tone={
            row.status === 'succeeded'
              ? 'success'
              : row.status === 'failed'
                ? 'danger'
                : row.status === 'skipped'
                  ? 'neutral'
                  : 'info'
          }
        >
          {row.status}
        </Pill>
      ),
    },
    {
      key: 'records',
      header: 'Records',
      numeric: true,
      cell: (row) => row.records_processed,
      hideOnMobile: true,
    },
    {
      key: 'triggered',
      header: 'Triggered by',
      cell: (row) => <span className="text-xs text-ink-500">{row.triggered_by ?? 'scheduler'}</span>,
      hideOnMobile: true,
    },
    {
      key: 'error',
      header: 'Error',
      cell: (row) => <span className="text-xs text-ink-600">{row.error ?? '—'}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Jobs and health"
        description="The scheduled work that keeps the operation running. Every run is recorded with its slot, its outcome and the number of records it processed. A job is idempotent: the same slot cannot run twice."
        breadcrumbs={[
          { label: 'Control Centre', href: '/admin/overview' },
          { label: 'Jobs' },
        ]}
      />

      <Panel
        className="mb-6"
        title="Scheduled jobs"
        description="These run from an authenticated scheduler, never from a public endpoint and never from a browser."
      >
        <ul className="space-y-3">
          {JOB_DEFINITIONS.map((job) => (
            <li
              key={job.name}
              className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-100 pb-3 last:border-0 last:pb-0"
            >
              <div>
                <p className="text-sm font-semibold text-ink-900">{job.name.replace(/_/g, ' ')}</p>
                <p className="mt-0.5 text-xs text-ink-600">{job.description}</p>
                <p className="mt-0.5 text-[11px] text-ink-400">{job.cadence}</p>
              </div>
              <RunJobButton jobName={job.name} />
            </li>
          ))}
        </ul>
      </Panel>

      <h2 className="mb-3 text-sm font-bold text-ink-900">Recent runs</h2>
      <DataTable
        caption="Scheduled job runs"
        columns={columns}
        rows={runs}
        rowKey={(row) => String(row.id)}
        empty="No job has run yet."
      />
    </>
  );
}
