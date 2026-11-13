import type { Metadata } from 'next';
import { requireStaff } from '@/lib/auth/guards';
import { listAssignments } from '@/lib/operations/admin';
import { DataTable, type Column } from '@/components/ops/DataTable';
import { PageHeader } from '@/components/ops/Primitives';

export const metadata: Metadata = {
  title: 'Agent assignments — Control Centre',
  robots: { index: false, follow: false },
};

/**
 * Which agent is responsible for which market.
 *
 * This is the record behind the agent's "assigned markets" list in the Field
 * App, so a supervisor can see the coverage of a market at a glance.
 */
export default async function AdminAssignmentsPage() {
  await requireStaff('/admin/assignments');
  const assignments = await listAssignments();

  const rows = assignments.map((assignment) => ({
    id: String(assignment.id),
    agent: assignment.agentName || 'Agent',
    market: assignment.marketName || `Market ${assignment.marketId}`,
    status: assignment.status,
    active: assignment.status === 'active',
    since: assignment.startsOn,
  }));

  const columns: Column<(typeof rows)[number]>[] = [
    { key: 'agent', header: 'Agent', cell: (row) => <span className="font-medium text-ink-900">{row.agent}</span> },
    { key: 'market', header: 'Market', cell: (row) => row.market },
    { key: 'status', header: 'Assignment status', cell: (row) => row.status, hideOnMobile: true },
    {
      key: 'active',
      header: 'State',
      cell: (row) => (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            row.active ? 'bg-leaf-100 text-leaf-700' : 'bg-ink-100 text-ink-500'
          }`}
        >
          {row.active ? 'Active' : 'Ended'}
        </span>
      ),
    },
    {
      key: 'since',
      header: 'Since',
      cell: (row) =>
        row.since ? (
          <span className="text-xs text-ink-600">{new Date(row.since).toISOString().slice(0, 10)}</span>
        ) : (
          <span className="text-xs text-ink-400">—</span>
        ),
      hideOnMobile: true,
    },
  ];

  return (
    <>
      <PageHeader
        title="Agent assignments"
        description="The markets each field agent is responsible for. The agent's Field App only ever shows the markets listed here."
        breadcrumbs={[
          { label: 'Control Centre', href: '/admin/overview' },
          { label: 'Agent assignments' },
        ]}
      />
      <DataTable
        caption="Agent assignments"
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        empty="No agent has been assigned to a market yet."
      />
    </>
  );
}
