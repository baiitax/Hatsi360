import type { Metadata } from 'next';
import { requireStaff } from '@/lib/auth/guards';
import { listSchedules } from '@/lib/operations/admin';
import { DataTable, type Column } from '@/components/ops/DataTable';
import { PageHeader, Panel, Pill } from '@/components/ops/Primitives';
import { GenerateTasksForm } from '@/components/admin/ScheduleControls';
import { operationalToday } from '@/lib/analytics/format';
import type { ScheduleRow } from '@/lib/operations/admin';

export const metadata: Metadata = {
  title: 'Collection plan — Control Centre',
  robots: { index: false, follow: false },
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default async function SchedulePage() {
  await requireStaff('/admin/schedule');

  const schedules = await listSchedules();

  const columns: Column<ScheduleRow>[] = [
    {
      key: 'market',
      header: 'Market',
      cell: (row) => (
        <div>
          <p className="font-medium text-ink-900">{row.marketName}</p>
          <p className="text-xs text-ink-500">{row.commodityName ?? 'Whole market'}</p>
        </div>
      ),
    },
    {
      key: 'frequency',
      header: 'Frequency',
      cell: (row) => (
        <div>
          <p className="text-sm text-ink-700">{row.frequency}</p>
          <p className="text-xs text-ink-500">
            {(row.daysOfWeek.length ? row.daysOfWeek : [])
              .map((day) => DAY_NAMES[day] ?? `Day ${day}`)
              .join(', ') || 'No days set'}
          </p>
        </div>
      ),
    },
    {
      key: 'deadline',
      header: 'Deadline',
      cell: (row) => row.deadlineTime ?? '—',
      hideOnMobile: true,
    },
    {
      key: 'expected',
      header: 'Expected',
      numeric: true,
      cell: (row) => row.expectedObservations ?? '—',
      hideOnMobile: true,
    },
    {
      key: 'agent',
      header: 'Agent',
      cell: (row) => row.assignedAgentName ?? 'Unassigned',
    },
    {
      key: 'evidence',
      header: 'Evidence',
      cell: (row) =>
        row.evidenceRequired ? <Pill tone="warning">Required</Pill> : <span className="text-xs text-ink-500">Optional</span>,
      hideOnMobile: true,
    },
    {
      key: 'active',
      header: 'Status',
      cell: (row) => (
        <Pill tone={row.isActive ? 'success' : 'neutral'}>
          {row.isActive ? 'Active' : 'Paused'}
        </Pill>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Collection plan"
        description="Which commodities are expected, where, on which days and by when. The plan is what coverage is measured against — without it there is nothing to compare a missing price to."
        breadcrumbs={[
          { label: 'Control Centre', href: '/admin/overview' },
          { label: 'Collection plan' },
        ]}
      />

      <Panel
        className="mb-5"
        title="Generate the day's tasks"
        description="The scheduler creates a task for every schedule due on the chosen date. Running it twice for the same date changes nothing."
      >
        <GenerateTasksForm defaultDate={operationalToday()} />
      </Panel>

      <DataTable
        caption="Collection schedules"
        columns={columns}
        rows={schedules}
        rowKey={(row) => String(row.id)}
        empty="No collection schedules have been defined yet. Until a schedule exists, coverage cannot be measured."
      />
    </>
  );
}
