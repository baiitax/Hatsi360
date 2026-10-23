import type { Metadata } from 'next';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth/guards';
import { listTasks } from '@/lib/operations/admin';
import { DataTable, type Column } from '@/components/ops/DataTable';
import {
  PageHeader,
  Panel,
  Pill,
  TASK_STATUS_LABELS,
  taskStatusTone,
} from '@/components/ops/Primitives';
import { formatDateTime } from '@/lib/money';
import type { TaskDirectoryRow } from '@/lib/operations/admin';

export const metadata: Metadata = {
  title: 'Collection tasks — Control Centre',
  robots: { index: false, follow: false },
};

const STATUSES = [
  { value: '', label: 'Any status' },
  { value: 'open', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'awaiting_review', label: 'Awaiting review' },
  { value: 'correction_required', label: 'Correction required' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; overdue?: string; page?: string }>;
}) {
  const params = await searchParams;
  await requireStaff('/admin/tasks');

  const page = await listTasks({
    status: params.status || undefined,
    overdueOnly: params.overdue === '1',
    page: params.page ? Number(params.page) : 1,
    pageSize: 25,
  });

  const columns: Column<TaskDirectoryRow>[] = [
    { key: 'id', header: 'Task', numeric: true, cell: (row) => `#${row.id}` },
    {
      key: 'market',
      header: 'Market',
      cell: (row) => (
        <div>
          <p className="font-medium text-ink-900">{row.marketName}</p>
          <p className="text-xs text-ink-500">{row.commodityNames}</p>
        </div>
      ),
    },
    { key: 'agent', header: 'Agent', cell: (row) => row.agentName, hideOnMobile: true },
    {
      key: 'due',
      header: 'Due',
      cell: (row) => (
        <div>
          <p className="text-sm text-ink-700">{row.dueOn}</p>
          {row.deadlineAt ? (
            <p className="text-xs text-ink-500">Deadline {formatDateTime(row.deadlineAt)}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => (
        <span className="flex flex-wrap items-center gap-1">
          <Pill tone={taskStatusTone(row.status)}>
            {TASK_STATUS_LABELS[row.status] ?? row.status}
          </Pill>
          {row.isOverdue ? <Pill tone="danger">Overdue</Pill> : null}
        </span>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      cell: (row) => row.priority ?? 'normal',
      hideOnMobile: true,
    },
  ];

  return (
    <>
      <PageHeader
        title="Collection tasks"
        description="The work the scheduler generated. A task that passes its deadline is marked overdue by the scheduled job and recorded as an event; the status itself is never silently rewritten."
        breadcrumbs={[
          { label: 'Control Centre', href: '/admin/overview' },
          { label: 'Tasks' },
        ]}
      />

      <Panel className="mb-5">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="status" className="mb-1 block text-xs font-semibold text-ink-700">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={params.status ?? ''}
              className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              {STATUSES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 pb-2 text-xs font-semibold text-ink-700">
            <input
              type="checkbox"
              name="overdue"
              value="1"
              defaultChecked={params.overdue === '1'}
              className="size-4 rounded border-ink-300"
            />
            Only overdue tasks
          </label>
          <button
            type="submit"
            className="rounded-lg bg-brand-700 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-800"
          >
            Apply
          </button>
          <Link
            href="/admin/tasks"
            className="rounded-lg border border-ink-200 bg-white px-4 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-100"
          >
            Clear
          </Link>
        </form>
      </Panel>

      <DataTable
        caption="Collection tasks"
        columns={columns}
        rows={page.rows}
        rowKey={(row) => String(row.id)}
        queryBase={params.status ? `status=${params.status}` : ''}
        page={page.page}
        pageCount={page.pageCount}
        total={page.total}
        pageSize={page.pageSize}
        empty="No tasks match these filters."
      />
    </>
  );
}
