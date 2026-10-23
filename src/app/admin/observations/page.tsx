import type { Metadata } from 'next';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth/guards';
import { listObservations, listReferenceData } from '@/lib/operations/admin';
import { DataTable, type Column } from '@/components/ops/DataTable';
import { PageHeader, Panel, Pill, VERIFICATION_LABELS, verificationTone } from '@/components/ops/Primitives';
import { formatDateTime, formatMoney } from '@/lib/money';
import type { ObservationDirectoryRow } from '@/lib/operations/admin';

export const metadata: Metadata = {
  title: 'Observation directory — Control Centre',
  robots: { index: false, follow: false },
};

const STATUS_OPTIONS = [
  { value: '', label: 'Any status' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'verified', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'correction_requested', label: 'Correction required' },
  { value: 'legacy_unverified', label: 'Legacy — unverified' },
];

export default async function ObservationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    marketId?: string;
    commodityId?: string;
    published?: string;
    flagged?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  await requireStaff('/admin/observations');

  const filters = {
    q: params.q,
    status: params.status || undefined,
    marketId: params.marketId ? Number(params.marketId) : undefined,
    commodityId: params.commodityId ? Number(params.commodityId) : undefined,
    published:
      params.published === 'yes' || params.published === 'no'
        ? (params.published as 'yes' | 'no')
        : undefined,
    flagged: params.flagged === '1',
    page: params.page ? Number(params.page) : 1,
    pageSize: 25,
  };

  const [page, reference] = await Promise.all([listObservations(filters), listReferenceData()]);

  const queryBase = new URLSearchParams();
  if (params.q) queryBase.set('q', params.q);
  if (params.status) queryBase.set('status', params.status);
  if (params.marketId) queryBase.set('marketId', params.marketId);
  if (params.commodityId) queryBase.set('commodityId', params.commodityId);
  if (params.published) queryBase.set('published', params.published);
  if (params.flagged) queryBase.set('flagged', params.flagged);

  const columns: Column<ObservationDirectoryRow>[] = [
    {
      key: 'commodity',
      header: 'Commodity',
      cell: (row) => <span className="font-medium text-ink-900">{row.commodityName}</span>,
    },
    { key: 'market', header: 'Market', cell: (row) => row.marketName },
    { key: 'agent', header: 'Agent', cell: (row) => row.agentName, hideOnMobile: true },
    {
      key: 'price',
      header: 'Reported price',
      numeric: true,
      cell: (row) => (
        <span>
          {row.reportedAmount === null ? '—' : formatMoney(row.reportedAmount)}
          {row.unitCode ? (
            <span className="ml-1 text-xs text-ink-400">/{row.unitCode}</span>
          ) : (
            <span className="ml-1 text-xs text-ink-400">/unit n/r</span>
          )}
        </span>
      ),
    },
    { key: 'priceType', header: 'Type', cell: (row) => row.priceType.replace(/_/g, ' '), hideOnMobile: true },
    { key: 'collected', header: 'Collected', cell: (row) => formatDateTime(row.collectedAt) },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => (
        <span className="flex flex-wrap items-center gap-1">
          <Pill tone={verificationTone(row.verificationStatus)}>
            {VERIFICATION_LABELS[row.verificationStatus] ?? row.verificationStatus}
          </Pill>
          {row.publishedAt ? <Pill tone="success">Published</Pill> : null}
          {row.qualityFlags.length > 0 ? (
            <Pill tone="warning">{row.qualityFlags.length} flag(s)</Pill>
          ) : null}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Observation directory"
        description="Every price observation in the system, with its provenance and its verification state. Filtering and pagination happen on the server."
        breadcrumbs={[
          { label: 'Control Centre', href: '/admin/overview' },
          { label: 'Observations' },
        ]}
      />

      <Panel className="mb-5">
        <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <label htmlFor="q" className="mb-1 block text-xs font-semibold text-ink-700">
              Search
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={params.q ?? ''}
              placeholder="Commodity, market or agent"
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label htmlFor="status" className="mb-1 block text-xs font-semibold text-ink-700">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={params.status ?? ''}
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="marketId" className="mb-1 block text-xs font-semibold text-ink-700">
              Market
            </label>
            <select
              id="marketId"
              name="marketId"
              defaultValue={params.marketId ?? ''}
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              <option value="">All markets</option>
              {(reference.markets as unknown as { id: number; name: string }[]).map((market) => (
                <option key={market.id} value={market.id}>
                  {market.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="commodityId" className="mb-1 block text-xs font-semibold text-ink-700">
              Commodity
            </label>
            <select
              id="commodityId"
              name="commodityId"
              defaultValue={params.commodityId ?? ''}
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              <option value="">All commodities</option>
              {(reference.commodities as { id: number; name: string }[]).map((commodity) => (
                <option key={commodity.id} value={commodity.id}>
                  {commodity.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="published" className="mb-1 block text-xs font-semibold text-ink-700">
              Publication
            </label>
            <select
              id="published"
              name="published"
              defaultValue={params.published ?? ''}
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              <option value="">Any</option>
              <option value="yes">Published</option>
              <option value="no">Not published</option>
            </select>
          </div>

          <div className="flex items-end gap-2 lg:col-span-6">
            <label className="flex items-center gap-2 text-xs font-semibold text-ink-700">
              <input
                type="checkbox"
                name="flagged"
                value="1"
                defaultChecked={params.flagged === '1'}
                className="size-4 rounded border-ink-300"
              />
              Only records with quality flags
            </label>
            <button
              type="submit"
              className="ml-auto rounded-lg bg-brand-700 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-800"
            >
              Apply filters
            </button>
            <Link
              href="/admin/observations"
              className="rounded-lg border border-ink-200 bg-white px-4 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-100"
            >
              Clear
            </Link>
          </div>
        </form>
      </Panel>

      <DataTable
        caption="Price observations"
        columns={columns}
        rows={page.rows}
        rowKey={(row) => row.id}
        queryBase={queryBase.toString()}
        page={page.page}
        pageCount={page.pageCount}
        total={page.total}
        pageSize={page.pageSize}
        empty="No observations match these filters."
      />
    </>
  );
}
