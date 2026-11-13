import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/auth/guards';
import { getAgentRecord } from '@/lib/operations/admin';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { DataTable, type Column } from '@/components/ops/DataTable';
import {
  PageHeader,
  Panel,
  Pill,
  InlineEmpty,
  ACCOUNT_STATUS_LABELS,
  VERIFICATION_LABELS,
  verificationTone,
} from '@/components/ops/Primitives';

export const metadata: Metadata = {
  title: 'Agent — Control Centre',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const TASK_TONE: Record<string, 'success' | 'warning' | 'danger' | 'neutral' | 'info'> = {
  open: 'neutral',
  in_progress: 'info',
  completed: 'success',
  cancelled: 'neutral',
  overdue: 'danger',
};

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString('en-NG') : '—';
}

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * One agent, in full.
 *
 * The screen is deliberately not a scorecard. It answers four questions an
 * operations administrator actually asks: who is this, what are they
 * responsible for, what have they submitted, and what happened to it.
 *
 * The counts are shown as counts. No composite performance score is computed,
 * because a single number would reward submitting more rather than submitting
 * accurately, and accurate prices are the purpose of the platform.
 */
export default async function AdminAgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff('/admin/agents');
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader
          title="Agent"
          description="One field agent's record."
          breadcrumbs={[
            { label: 'Control Centre', href: '/admin/overview' },
            { label: 'Operations', href: '/admin/operations' },
            { label: 'Agents', href: '/admin/agents' },
            { label: 'Agent' },
          ]}
        />
        <InlineEmpty
          title="No database is configured"
          description="Agent records are read from PostgreSQL. Without a configured database there is no record to show."
        />
      </>
    );
  }

  const agent = await getAgentRecord(id);
  if (!agent) notFound();

  const name = agent.fullName ?? agent.email ?? 'Unnamed agent';
  const decided = agent.verified + agent.rejected + agent.published;
  const approvalRate = decided > 0 ? Math.round((agent.verified / decided) * 100) : null;

  const observationColumns: Column<(typeof agent.observations)[number]>[] = [
    {
      key: 'commodity',
      header: 'Commodity',
      cell: (row) => (
        <div className="min-w-0">
          <p className="font-medium text-ink-900">{row.commodityName}</p>
          <p className="text-xs text-ink-500">{row.marketName}</p>
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      cell: (row) => (
        <span className="tabular-nums text-sm text-ink-900">
          {row.amount == null
            ? '—'
            : `${row.currencyCode} ${row.amount.toLocaleString('en-NG')}${
                row.unitName ? ` / ${row.unitName}` : ''
              }`}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      cell: (row) => <span className="text-xs text-ink-700">{row.priceType.replace(/_/g, ' ')}</span>,
    },
    {
      key: 'grade',
      header: 'Grade',
      cell: (row) => (
        <span className="text-xs text-ink-600">{row.gradeName ?? 'No grade recorded'}</span>
      ),
    },
    {
      key: 'collected',
      header: 'Collected',
      cell: (row) => (
        <span className="tabular-nums text-xs text-ink-600">{formatDateTime(row.collectedAt)}</span>
      ),
    },
    {
      key: 'evidence',
      header: 'Evidence',
      cell: (row) => (
        <span className="tabular-nums text-xs text-ink-600">
          {row.evidenceCount === 0 ? 'None' : `${row.evidenceCount} file(s)`}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => (
        <Pill tone={verificationTone(row.verificationStatus)}>
          {VERIFICATION_LABELS[row.verificationStatus] ?? row.verificationStatus}
        </Pill>
      ),
    },
    {
      key: 'action',
      header: '',
      cell: (row) => (
        <Link
          href={`/admin/observations?focus=${row.id}`}
          className="text-xs font-semibold text-brand-700 hover:underline"
        >
          Review
        </Link>
      ),
    },
  ];

  const taskColumns: Column<(typeof agent.tasks)[number]>[] = [
    {
      key: 'market',
      header: 'Market',
      cell: (row) => <span className="text-sm text-ink-900">{row.marketName}</span>,
    },
    {
      key: 'due',
      header: 'Due',
      cell: (row) => <span className="tabular-nums text-xs text-ink-600">{formatDate(row.dueOn)}</span>,
    },
    {
      key: 'commodities',
      header: 'Expected',
      cell: (row) => (
        <span className="text-xs text-ink-700">
          {row.commodityNames.length === 0
            ? 'Market round'
            : row.commodityNames.join(', ')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <Pill tone={TASK_TONE[row.status] ?? 'neutral'}>{row.status.replace(/_/g, ' ')}</Pill>,
    },
  ];

  const sessionColumns: Column<(typeof agent.sessions)[number]>[] = [
    {
      key: 'reference',
      header: 'Session',
      cell: (row) => <span className="font-mono text-xs text-ink-800">{row.reference}</span>,
    },
    {
      key: 'market',
      header: 'Market',
      cell: (row) => <span className="text-sm text-ink-900">{row.marketName}</span>,
    },
    {
      key: 'started',
      header: 'Started',
      cell: (row) => (
        <span className="tabular-nums text-xs text-ink-600">{formatDateTime(row.startedAt)}</span>
      ),
    },
    {
      key: 'observations',
      header: 'Prices',
      cell: (row) => (
        <span className="tabular-nums text-xs text-ink-700">{row.observationCount}</span>
      ),
    },
    {
      key: 'state',
      header: 'State',
      cell: (row) => (
        <Pill tone={row.completedAt ? 'success' : 'warning'}>
          {row.completedAt ? 'closed' : 'open'}
        </Pill>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={name}
        description={
          agent.employeeCode
            ? `Field agent · employee code ${agent.employeeCode}`
            : 'Field agent'
        }
        breadcrumbs={[
          { label: 'Control Centre', href: '/admin/overview' },
          { label: 'Operations', href: '/admin/operations' },
          { label: 'Agents', href: '/admin/agents' },
          { label: name },
        ]}
        actions={
          <Link
            href="/admin/assignments"
            className="inline-flex min-h-[44px] items-center rounded-lg border border-ink-200 bg-white px-4 text-sm font-semibold text-ink-800 hover:bg-ink-50"
          >
            Manage assignments
          </Link>
        }
      />

      {/* ------------------------------------------------------- who this is */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Account">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-600">Email</dt>
              <dd className="min-w-0 truncate text-right font-medium text-ink-900">
                {agent.email ?? '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-600">Role</dt>
              <dd className="font-medium text-ink-900">{agent.role.replace(/_/g, ' ')}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-600">Account</dt>
              <dd>
                <Pill tone={agent.accountStatus === 'active' ? 'success' : 'warning'}>
                  {ACCOUNT_STATUS_LABELS[agent.accountStatus] ?? agent.accountStatus}
                </Pill>
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-600">Employment</dt>
              <dd className="font-medium text-ink-900">{agent.employmentStatus}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-600">Region</dt>
              <dd className="font-medium text-ink-900">{agent.region ?? 'Not recorded'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-600">Alternative phone</dt>
              <dd className="font-medium tabular-nums text-ink-900">
                {agent.alternatePhone ?? 'Not recorded'}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-600">Joined</dt>
              <dd className="font-medium tabular-nums text-ink-900">{formatDate(agent.joinedOn)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-600">Account created</dt>
              <dd className="font-medium tabular-nums text-ink-900">
                {formatDate(agent.createdAt)}
              </dd>
            </div>
          </dl>
          {agent.supervisorNotes ? (
            <p className="mt-3 border-t border-ink-100 pt-3 text-xs leading-relaxed text-ink-600">
              <span className="font-semibold text-ink-800">Supervisor note. </span>
              {agent.supervisorNotes}
            </p>
          ) : null}
        </Panel>

        <Panel title="Assigned markets">
          {agent.assignedMarkets.length === 0 ? (
            <p className="text-sm text-ink-600">
              No market is assigned to this agent, so they cannot open a collection session. Assign
              one from{' '}
              <Link href="/admin/assignments" className="font-semibold text-brand-700 hover:underline">
                agent assignments
              </Link>
              .
            </p>
          ) : (
            <ul className="space-y-2">
              {agent.assignedMarkets.map((market) => (
                <li key={market.id} className="flex items-center justify-between gap-3">
                  <Link
                    href={`/admin/markets?focus=${market.id}`}
                    className="min-w-0 truncate text-sm font-medium text-ink-900 hover:text-brand-700 hover:underline"
                  >
                    {market.name}
                  </Link>
                  <Pill tone={market.status === 'active' ? 'success' : 'warning'}>
                    {market.status}
                  </Pill>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="What they have submitted">
          {/* Counts, not a score. Approval rate is shown only when there is a
              denominator to divide by, and the denominator is stated. */}
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-600">Prices recorded</dt>
              <dd className="font-bold tabular-nums text-ink-900">{agent.submitted}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-600">Still draft</dt>
              <dd className="font-semibold tabular-nums text-ink-700">{agent.draft}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-600">Verified</dt>
              <dd className="font-semibold tabular-nums text-success-700">{agent.verified}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-600">Correction requested</dt>
              <dd className="font-semibold tabular-nums text-warning-700">
                {agent.correctionRequested}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-600">Rejected</dt>
              <dd className="font-semibold tabular-nums text-error-700">{agent.rejected}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-600">Published</dt>
              <dd className="font-semibold tabular-nums text-ink-700">{agent.published}</dd>
            </div>
          </dl>
          <p className="mt-3 border-t border-ink-100 pt-3 text-xs leading-relaxed text-ink-600">
            {approvalRate === null
              ? 'No price has reached a decision yet, so there is no approval rate to show.'
              : `${approvalRate}% of the ${decided} decided price${decided === 1 ? '' : 's'} ${
                  approvalRate === 1 ? 'was' : 'were'
                } verified. The remaining ${decided - agent.verified} ${
                  decided - agent.verified === 1 ? 'was' : 'were'
                } corrected or rejected.`}
          </p>
        </Panel>
      </div>

      {/* ------------------------------------------------------ assignments */}
      <div className="mt-8">
        <h2 className="text-base font-bold text-ink-900">Assigned collection tasks</h2>
        <p className="mt-1 text-sm text-ink-600">
          The work this agent has been given, most recently due first.
        </p>
        <div className="mt-3">
          {agent.tasks.length === 0 ? (
            <InlineEmpty
              title="No collection tasks"
              description="No task has been assigned to this agent. Tasks are issued from the collection planner."
            />
          ) : (
            <DataTable
              caption="Assigned collection tasks"
              columns={taskColumns}
              rows={agent.tasks}
              rowKey={(row) => String(row.id)}
              empty="No tasks match this filter."
            />
          )}
        </div>
      </div>

      {/* --------------------------------------------------------- sessions */}
      <div className="mt-8">
        <h2 className="text-base font-bold text-ink-900">Collection sessions</h2>
        <p className="mt-1 text-sm text-ink-600">
          Each market visit the agent opened. An open session has not been closed yet.
        </p>
        <div className="mt-3">
          {agent.sessions.length === 0 ? (
            <InlineEmpty
              title="No collection sessions"
              description="This agent has not opened a collection session."
            />
          ) : (
            <DataTable
              caption="Collection sessions"
              columns={sessionColumns}
              rows={agent.sessions}
              rowKey={(row) => String(row.id)}
              empty="No sessions match this filter."
            />
          )}
        </div>
      </div>

      {/* ------------------------------------------------------ observations */}
      <div className="mt-8">
        <h2 className="text-base font-bold text-ink-900">Submitted prices</h2>
        <p className="mt-1 text-sm text-ink-600">
          The {agent.observations.length} most recent price{agent.observations.length === 1 ? '' : 's'}{' '}
          this agent recorded, each kept as its own observation with its own grade, unit and price
          type.
        </p>
        <div className="mt-3">
          {agent.observations.length === 0 ? (
            <InlineEmpty
              title="No prices recorded"
              description="This agent has not recorded a price yet."
            />
          ) : (
            <DataTable
              caption="Submitted prices"
              columns={observationColumns}
              rows={agent.observations}
              rowKey={(row) => row.id}
              empty="No prices match this filter."
            />
          )}
        </div>
      </div>
    </>
  );
}
