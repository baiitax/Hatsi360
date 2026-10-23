import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/guards';
import { listAgents, listMarkets } from '@/lib/operations/admin';
import { DataTable, type Column } from '@/components/ops/DataTable';
import {
  ACCOUNT_STATUS_LABELS,
  PageHeader,
  Panel,
  Pill,
} from '@/components/ops/Primitives';
import {
  AgentStatusControl,
  AssignmentControl,
  ProvisionAgentForm,
} from '@/components/admin/AgentManagement';
import { formatDateTime } from '@/lib/money';
import type { AgentDirectoryRow } from '@/lib/operations/admin';

export const metadata: Metadata = {
  title: 'Agents — Control Centre',
  robots: { index: false, follow: false },
};

function statusTone(status: string) {
  if (status === 'active') return 'success' as const;
  if (status === 'suspended') return 'warning' as const;
  return 'danger' as const;
}

export default async function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  await requireAdmin('/admin/agents');

  const [page, marketsPage] = await Promise.all([
    listAgents({ q: params.q, page: params.page ? Number(params.page) : 1, pageSize: 25 }),
    listMarkets({ pageSize: 200 }),
  ]);

  const markets = marketsPage.rows.map((market) => ({ id: market.id, name: market.name }));

  const columns: Column<AgentDirectoryRow>[] = [
    {
      key: 'name',
      header: 'Agent',
      cell: (row) => (
        <div>
          <p className="font-medium text-ink-900">{row.fullName ?? 'Unnamed agent'}</p>
          <p className="text-xs text-ink-500">
            {row.employeeCode ?? 'No employee code'}
            {row.region ? ` · ${row.region}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Account',
      cell: (row) => (
        <Pill tone={statusTone(row.accountStatus)}>
          {ACCOUNT_STATUS_LABELS[row.accountStatus] ?? row.accountStatus}
        </Pill>
      ),
    },
    {
      key: 'markets',
      header: 'Markets',
      cell: (row) =>
        row.marketNames.length === 0 ? (
          <span className="text-xs text-amber-700">No market assigned</span>
        ) : (
          <span className="text-xs text-ink-600">{row.marketNames.join(', ')}</span>
        ),
      hideOnMobile: true,
    },
    {
      key: 'activity',
      header: 'Submissions',
      numeric: true,
      cell: (row) => (
        <span className="text-xs">
          {row.submitted} submitted · {row.accepted} approved · {row.rejected} rejected
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'last',
      header: 'Last activity',
      cell: (row) => (
        <span className="text-xs text-ink-500">
          {row.lastActivityAt ? formatDateTime(row.lastActivityAt) : 'No activity'}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Agents"
        description="Market agents are provisioned here, on the server. There is no public registration path into an operational role, and an agent can never change their own role or status."
        breadcrumbs={[
          { label: 'Control Centre', href: '/admin/overview' },
          { label: 'Agents' },
        ]}
      />

      <ProvisionAgentForm markets={markets} />

      <Panel className="mb-5">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="min-w-[16rem] flex-1">
            <label htmlFor="q" className="mb-1 block text-xs font-semibold text-ink-700">
              Search by name
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={params.q ?? ''}
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-brand-700 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-800"
          >
            Search
          </button>
        </form>
      </Panel>

      <DataTable
        caption="Market agents"
        columns={columns}
        rows={page.rows}
        rowKey={(row) => row.id}
        queryBase={params.q ? `q=${encodeURIComponent(params.q)}` : ''}
        page={page.page}
        pageCount={page.pageCount}
        total={page.total}
        pageSize={page.pageSize}
        empty="No agents are registered yet. Provision one above to get started."
      />

      <h2 className="mt-8 text-sm font-bold text-ink-900">Account and assignment controls</h2>
      <p className="mt-1 text-xs text-ink-500">
        Suspending an agent blocks their submissions immediately, in the server guard and in the
        database. Every change is written to the audit trail with a reason.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {page.rows.map((agent) => (
          <Panel key={agent.id} title={agent.fullName ?? 'Unnamed agent'}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">
                  Account status
                </h3>
                <AgentStatusControl
                  agentId={agent.id}
                  agentName={agent.fullName ?? 'this agent'}
                  status={agent.accountStatus}
                />
              </div>
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">
                  Market assignments
                </h3>
                <AssignmentControl
                  agentId={agent.id}
                  agentName={agent.fullName ?? 'this agent'}
                  markets={markets}
                  assignedMarketIds={agent.assignedMarketIds}
                />
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}
