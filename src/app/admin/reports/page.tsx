import type { Metadata } from 'next';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth/guards';
import { reportsForRole } from '@/lib/reports';
import { listExportJobs } from '@/lib/operations/admin';
import { PageHeader, Panel, Pill } from '@/components/ops/Primitives';
import { ReportRunner } from '@/components/admin/ReportRunner';
import { formatDateTime } from '@/lib/money';

export const metadata: Metadata = {
  title: 'Reports and exports — Control Centre',
  robots: { index: false, follow: false },
};

const PERIODS = [7, 30, 90];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const params = await searchParams;
  const days = PERIODS.includes(Number(params.days)) ? Number(params.days) : 30;

  const profile = await requireStaff('/admin/reports');
  const reports = reportsForRole(profile.role);
  const exportJobs = await listExportJobs(25);

  return (
    <>
      <PageHeader
        title="Reports and exports"
        description="Twelve operational reports. Each one is built from the same snapshot the console shows, so an export can never disagree with the screen it was taken from. Every export is recorded, with who asked for it, over what scope and when it expires."
        breadcrumbs={[
          { label: 'Control Centre', href: '/admin/overview' },
          { label: 'Reports' },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-ink-200 bg-white p-1">
            {PERIODS.map((option) => (
              <Link
                key={option}
                href={`/admin/reports?days=${option}`}
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

      <div className="grid gap-4 lg:grid-cols-2">
        {reports.map((report) => (
          <Panel
            key={report.id}
            title={report.label}
            description={report.description}
            actions={<ReportRunner reportId={report.id} label={report.label} days={days} />}
          >
            <p className="text-xs text-ink-600">
              <span className="font-semibold text-ink-700">Answers:</span> {report.purpose}
            </p>
            <p className="mt-2 text-[11px] text-ink-400">Columns: {report.columns.join(' · ')}</p>
          </Panel>
        ))}
      </div>

      <Panel
        className="mt-6"
        title="Export history"
        description="Every export that was requested, with its scope and outcome."
      >
        {exportJobs.length === 0 ? (
          <p className="rounded-lg border border-dashed border-ink-200 bg-ink-50/60 px-4 py-8 text-center text-sm text-ink-500">
            No exports have been requested yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                  <th scope="col" className="py-2 pr-3">Scope</th>
                  <th scope="col" className="py-2 pr-3">Format</th>
                  <th scope="col" className="py-2 pr-3 text-right">Rows</th>
                  <th scope="col" className="py-2 pr-3">Status</th>
                  <th scope="col" className="py-2 pr-3">Requested</th>
                  <th scope="col" className="py-2">Expires</th>
                </tr>
              </thead>
              <tbody>
                {exportJobs.map((job) => {
                  const row = job as {
                    id: string;
                    scope: string;
                    format: string;
                    status: string;
                    row_count: number | null;
                    created_at: string;
                    expires_at: string | null;
                  };
                  return (
                    <tr key={row.id} className="border-b border-ink-100 last:border-0">
                      <th scope="row" className="py-2 pr-3 text-left font-medium text-ink-800">
                        {row.scope.replace(/_/g, ' ')}
                      </th>
                      <td className="py-2 pr-3 text-xs text-ink-600">{row.format}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{row.row_count ?? '—'}</td>
                      <td className="py-2 pr-3">
                        <Pill
                          tone={
                            row.status === 'completed'
                              ? 'success'
                              : row.status === 'failed'
                                ? 'danger'
                                : row.status === 'expired'
                                  ? 'neutral'
                                  : 'info'
                          }
                        >
                          {row.status}
                        </Pill>
                      </td>
                      <td className="py-2 pr-3 text-xs text-ink-500">{formatDateTime(row.created_at)}</td>
                      <td className="py-2 text-xs text-ink-500">
                        {row.expires_at ? formatDateTime(row.expires_at) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
