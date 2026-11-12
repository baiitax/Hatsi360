import type { Metadata } from 'next';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth/guards';
import { listMarkets } from '@/lib/operations/admin';
import { DataTable, type Column } from '@/components/ops/DataTable';
import { PageHeader, Panel, Pill } from '@/components/ops/Primitives';
import { formatDateTime } from '@/lib/money';
import type { MarketDirectoryRow } from '@/lib/operations/admin';

export const metadata: Metadata = {
  title: 'Markets — Control Centre',
  robots: { index: false, follow: false },
};

export default async function MarketsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  await requireStaff('/admin/markets');

  const page = await listMarkets({
    q: params.q,
    page: params.page ? Number(params.page) : 1,
    pageSize: 25,
  });

  const columns: Column<MarketDirectoryRow>[] = [
    {
      key: 'name',
      header: 'Market',
      cell: (row) => (
        <div>
          <p className="font-medium text-ink-900">{row.name}</p>
          <p className="text-xs text-ink-500">
            {row.stateName ?? 'Unknown state'}
            {row.marketZoneName ? ` · ${row.marketZoneName}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => (
        <span className="flex flex-wrap gap-1">
          <Pill tone={row.isActive ? 'success' : 'neutral'}>
            {row.isActive ? 'Active' : 'Inactive'}
          </Pill>
          {row.priority && row.priority !== 'normal' ? (
            <Pill tone="warning">{row.priority}</Pill>
          ) : null}
        </span>
      ),
    },
    {
      key: 'agents',
      header: 'Agents',
      numeric: true,
      cell: (row) => row.assignedAgents,
      hideOnMobile: true,
    },
    {
      key: 'observations',
      header: 'Observations',
      numeric: true,
      cell: (row) => row.observations,
      hideOnMobile: true,
    },
    {
      key: 'target',
      header: 'Daily target',
      numeric: true,
      cell: (row) => row.coverageTarget ?? '—',
      hideOnMobile: true,
    },
    {
      key: 'latest',
      header: 'Latest collection',
      cell: (row) =>
        row.latestCollectedAt ? (
          formatDateTime(row.latestCollectedAt)
        ) : (
          <span className="text-ink-400">None recorded</span>
        ),
    },
    {
      key: 'public',
      header: 'Public page',
      cell: (row) => (
        <Link
          href={`/markets/${row.slug}`}
          className="text-xs font-semibold text-brand-700 hover:underline"
        >
          View
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Markets"
        description="The markets GonaPulse covers. A market with no agent and no schedule is a coverage gap, and it is reported as one rather than hidden."
        breadcrumbs={[
          { label: 'Control Centre', href: '/admin/overview' },
          { label: 'Markets' },
        ]}
      />

      <Panel className="mb-5">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="min-w-[16rem] flex-1">
            <label htmlFor="q" className="mb-1 block text-xs font-semibold text-ink-700">
              Search by market name
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
        caption="Markets"
        columns={columns}
        rows={page.rows}
        rowKey={(row) => String(row.id)}
        queryBase={params.q ? `q=${encodeURIComponent(params.q)}` : ''}
        page={page.page}
        pageCount={page.pageCount}
        total={page.total}
        pageSize={page.pageSize}
        empty="No markets are configured."
      />
    </>
  );
}
