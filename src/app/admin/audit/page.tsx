import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/guards';
import { listAuditLogs } from '@/lib/operations/admin';
import { DataTable, type Column } from '@/components/ops/DataTable';
import { PageHeader, Panel, Pill } from '@/components/ops/Primitives';
import { formatDateTime } from '@/lib/money';

export const metadata: Metadata = {
  title: 'Audit trail — Control Centre',
  robots: { index: false, follow: false },
};

interface AuditRow {
  id: number;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  before_data: unknown;
  after_data: unknown;
  reason: string | null;
  created_at: string;
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; entityType?: string; page?: string }>;
}) {
  const params = await searchParams;
  await requireAdmin('/admin/audit');

  const page = await listAuditLogs({
    action: params.action || undefined,
    entityType: params.entityType || undefined,
    page: params.page ? Number(params.page) : 1,
    pageSize: 50,
  });

  const rows = page.rows as unknown as AuditRow[];

  const columns: Column<AuditRow>[] = [
    {
      key: 'when',
      header: 'When',
      cell: (row) => <span className="text-xs text-ink-600">{formatDateTime(row.created_at)}</span>,
    },
    {
      key: 'action',
      header: 'Action',
      cell: (row) => (
        <span className="font-medium text-ink-900">{row.action.replace(/\./g, ' · ')}</span>
      ),
    },
    {
      key: 'entity',
      header: 'Entity',
      cell: (row) => (
        <span className="text-xs text-ink-600">
          {row.entity_type ?? '—'}
          {row.entity_id ? <span className="ml-1 font-mono text-ink-400">{row.entity_id.slice(0, 8)}</span> : null}
        </span>
      ),
    },
    {
      key: 'actor',
      header: 'Actor',
      cell: (row) => (
        <span className="text-xs text-ink-600">
          {row.actor_id ? row.actor_id.slice(0, 8) : 'system'}
          {row.actor_role ? <span className="ml-1 text-ink-400">({row.actor_role})</span> : null}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'change',
      header: 'Change',
      cell: (row) => (
        <span className="text-xs text-ink-600">
          {row.before_data ? 'before → ' : ''}
          {row.after_data ? 'after' : '—'}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'reason',
      header: 'Reason',
      cell: (row) => <span className="text-xs text-ink-500">{row.reason ?? '—'}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Audit trail"
        description="An append-only record of consequential actions: account and role changes, assignments, submissions, approvals, rejections, corrections, publications, quality flags, exports and settings. Nothing in this trail can be edited or deleted from the interface."
        breadcrumbs={[
          { label: 'Control Centre', href: '/admin/overview' },
          { label: 'Audit' },
        ]}
      />

      <Panel className="mb-5">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="action" className="mb-1 block text-xs font-semibold text-ink-700">
              Action
            </label>
            <input
              id="action"
              name="action"
              defaultValue={params.action ?? ''}
              placeholder="observation.approved"
              className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label htmlFor="entityType" className="mb-1 block text-xs font-semibold text-ink-700">
              Entity type
            </label>
            <input
              id="entityType"
              name="entityType"
              defaultValue={params.entityType ?? ''}
              placeholder="price_observation"
              className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-brand-700 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-800"
          >
            Filter
          </button>
        </form>
      </Panel>

      <DataTable
        caption="Audit trail"
        columns={columns}
        rows={rows}
        rowKey={(row) => String(row.id)}
        queryBase={[
          params.action ? `action=${encodeURIComponent(params.action)}` : '',
          params.entityType ? `entityType=${encodeURIComponent(params.entityType)}` : '',
        ]
          .filter(Boolean)
          .join('&')}
        page={page.page}
        pageCount={page.pageCount}
        total={page.total}
        pageSize={page.pageSize}
        empty="No audit records match this filter."
      />

      <p className="mt-4 text-xs text-ink-500">
        <Pill tone="neutral">Note</Pill> The trail records who, what, when and — where it makes
        sense — the state before and after. It never stores credentials, session material or
        secret values.
      </p>
    </>
  );
}
