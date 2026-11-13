import type { Metadata } from 'next';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth/guards';
import { getDataSource } from '@/lib/data';
import { DataTable, type Column } from '@/components/ops/DataTable';
import { PageHeader, Panel } from '@/components/ops/Primitives';

export const metadata: Metadata = {
  title: 'Commodities — Control Centre',
  robots: { index: false, follow: false },
};

/**
 * The commodity catalogue in the Control Centre.
 *
 * The catalogue is reference data: it is public, read-only and versioned by
 * migration. This screen exists so operations staff can see what the product
 * actually sells — including the commodities that are active in the catalogue
 * but have never reported a price.
 */
export default async function AdminCommoditiesPage() {
  await requireStaff('/admin/commodities');
  const source = await getDataSource();
  const commodities = await source.listCommodities();
  const categories = await source.listCategories();
  const categoryName = new Map(categories.map((category) => [category.id, category.name]));

  const rows = commodities.map((commodity) => ({
    id: commodity.id,
    name: commodity.name,
    slug: commodity.slug,
    category: categoryName.get(commodity.categoryId) ?? 'Uncategorised',
    active: commodity.isActive,
    freshness: commodity.freshnessWindowHours ?? 72,
    markets: commodity.marketCount ?? 0,
    observations: commodity.observationCount ?? 0,
    latest: commodity.latestObservationAt ?? null,
  }));

  const columns: Column<(typeof rows)[number]>[] = [
    {
      key: 'name',
      header: 'Commodity',
      cell: (row) => (
        <div>
          <p className="font-medium text-ink-900">{row.name}</p>
          <p className="text-xs text-ink-500">{row.slug}</p>
        </div>
      ),
    },
    { key: 'category', header: 'Category', cell: (row) => row.category },
    {
      key: 'state',
      header: 'State',
      cell: (row) => (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            row.active ? 'bg-leaf-100 text-leaf-700' : 'bg-ink-100 text-ink-500'
          }`}
        >
          {row.active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'freshness',
      header: 'Freshness window',
      numeric: true,
      cell: (row) => `${row.freshness}h`,
      hideOnMobile: true,
    },
    {
      key: 'markets',
      header: 'Markets',
      numeric: true,
      cell: (row) => row.markets,
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
      key: 'latest',
      header: 'Latest collection',
      cell: (row) =>
        row.latest ? (
          <span className="text-xs text-ink-600">{new Date(row.latest).toISOString().slice(0, 10)}</span>
        ) : (
          <span className="text-xs text-ink-400">No published observation</span>
        ),
    },
    {
      key: 'public',
      header: 'Public page',
      cell: (row) => (
        <Link href={`/commodities/${row.slug}`} className="text-xs font-semibold text-brand-700 hover:underline">
          View
        </Link>
      ),
    },
  ];

  const withoutPrices = rows.filter((row) => row.observations === 0).length;

  return (
    <>
      <PageHeader
        title="Commodities"
        description="The commodity catalogue. A commodity can be active in the catalogue and still have no published price — the two states are shown separately."
        breadcrumbs={[
          { label: 'Control Centre', href: '/admin/overview' },
          { label: 'Catalogue' },
          { label: 'Commodities' },
        ]}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Panel className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">In the catalogue</p>
          <p className="figure mt-1 text-2xl text-ink-900">{rows.length}</p>
        </Panel>
        <Panel className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">With published prices</p>
          <p className="figure mt-1 text-2xl text-ink-900">{rows.length - withoutPrices}</p>
        </Panel>
        <Panel className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Catalogue only — no price yet
          </p>
          <p className="figure mt-1 text-2xl text-ink-900">{withoutPrices}</p>
        </Panel>
      </div>

      <DataTable
        caption="Commodity catalogue"
        columns={columns}
        rows={rows}
        rowKey={(row) => String(row.id)}
        empty="The commodity catalogue is empty."
      />
    </>
  );
}
