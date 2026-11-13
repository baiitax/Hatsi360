import type { Metadata } from 'next';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth/guards';
import { getDataSource } from '@/lib/data';
import { DataTable, type Column } from '@/components/ops/DataTable';
import { PageHeader } from '@/components/ops/Primitives';
import { CategoryGlyph } from '@/components/marketing/CategoryGlyph';

export const metadata: Metadata = {
  title: 'Commodity categories — Control Centre',
  robots: { index: false, follow: false },
};

/** The commodity taxonomy, with the number of commodities each category holds. */
export default async function AdminCategoriesPage() {
  await requireStaff('/admin/categories');
  const source = await getDataSource();
  const [categories, commodities] = await Promise.all([
    source.listCategories(),
    source.listCommodities(),
  ]);

  const rows = categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    commodities: commodities.filter((commodity) => commodity.categoryId === category.id).length,
    order: category.sortOrder,
  }));

  const columns: Column<(typeof rows)[number]>[] = [
    {
      key: 'name',
      header: 'Category',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <CategoryGlyph slug={row.slug} size={20} />
          </span>
          <div>
            <p className="font-medium text-ink-900">{row.name}</p>
            <p className="text-xs text-ink-500">{row.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      cell: (row) => (
        <span className="text-xs text-ink-600">{row.description ?? 'No description recorded.'}</span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'commodities',
      header: 'Commodities',
      numeric: true,
      cell: (row) => row.commodities,
    },
    {
      key: 'order',
      header: 'Sort order',
      numeric: true,
      cell: (row) => row.order,
      hideOnMobile: true,
    },
    {
      key: 'public',
      header: 'Public page',
      cell: (row) => (
        <Link
          href={`/commodities?category=${row.slug}`}
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
        title="Commodity categories"
        description="The taxonomy the public catalogue browses by. The order here is the order the categories appear in on the website."
        breadcrumbs={[
          { label: 'Control Centre', href: '/admin/overview' },
          { label: 'Catalogue' },
          { label: 'Categories' },
        ]}
      />
      <DataTable
        caption="Commodity categories"
        columns={columns}
        rows={rows}
        rowKey={(row) => String(row.id)}
        empty="No categories are configured."
      />
    </>
  );
}
