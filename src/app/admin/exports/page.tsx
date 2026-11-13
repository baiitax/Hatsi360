import type { Metadata } from 'next';
import { requireStaff } from '@/lib/auth/guards';
import { listExportJobs } from '@/lib/operations/admin';
import { DataTable, type Column } from '@/components/ops/DataTable';
import { PageHeader } from '@/components/ops/Primitives';
import { formatDateTime } from '@/lib/money';

export const metadata: Metadata = {
  title: 'Exports — Control Centre',
  robots: { index: false, follow: false },
};

/**
 * The export queue.
 *
 * Only an administrator can read another user's export job — the Row Level
 * Security policy allows the requester or an admin, and this screen is
 * administrator-only for that reason.
 */
export default async function AdminExportsPage() {
  await requireStaff('/admin/exports');
  const jobs = await listExportJobs(50);

  const rows = jobs.map((job) => {
    const record = job as Record<string, unknown>;
    return {
      id: String(record.id),
      kind: String(record.export_type ?? record.kind ?? 'export'),
      status: String(record.status ?? 'unknown'),
      format: String(record.format ?? 'csv'),
      requestedBy: String(record.requested_by ?? 'unknown'),
      createdAt: (record.created_at as string) ?? '',
      completedAt: (record.completed_at as string) ?? null,
      rows: (record.row_count as number) ?? null,
    };
  });

  const columns: Column<(typeof rows)[number]>[] = [
    { key: 'kind', header: 'Export', cell: (row) => <span className="font-medium text-ink-900">{row.kind}</span> },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            row.status === 'completed'
              ? 'bg-leaf-100 text-leaf-700'
              : row.status === 'failed'
                ? 'bg-red-50 text-error-700'
                : 'bg-harvest-100 text-harvest-700'
          }`}
        >
          {row.status}
        </span>
      ),
    },
    { key: 'format', header: 'Format', cell: (row) => row.format.toUpperCase(), hideOnMobile: true },
    {
      key: 'rows',
      header: 'Rows',
      numeric: true,
      cell: (row) => row.rows ?? '—',
      hideOnMobile: true,
    },
    { key: 'created', header: 'Requested', cell: (row) => formatDateTime(row.createdAt) },
  ];

  return (
    <>
      <PageHeader
        title="Exports"
        description="Export jobs requested against the market record. Each export is generated from the same published observations the public site reads."
        breadcrumbs={[
          { label: 'Control Centre', href: '/admin/overview' },
          { label: 'Exports' },
        ]}
      />
      <DataTable
        caption="Export jobs"
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        empty="No export has been requested yet."
      />
    </>
  );
}
