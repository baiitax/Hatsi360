import type { Metadata } from 'next';
import { requireStaff } from '@/lib/auth/guards';
import { listReferenceData } from '@/lib/operations/admin';
import { DataTable, type Column } from '@/components/ops/DataTable';
import { PageHeader } from '@/components/ops/Primitives';

export const metadata: Metadata = {
  title: 'Grades — Control Centre',
  robots: { index: false, follow: false },
};

/**
 * The grade catalogue.
 *
 * Grades are part of the comparability rule: two observations are only
 * compared when their grades match, so the grade list is an operational
 * reference, not decoration.
 */
export default async function AdminGradesPage() {
  await requireStaff('/admin/grades');
  const { grades, commodities, varieties } = await listReferenceData();
  const commodityName = new Map(
    (commodities as { id: number; name: string }[]).map((c) => [c.id, c.name]),
  );
  const varietyName = new Map(
    (varieties as { id: number; name: string }[]).map((v) => [v.id, v.name]),
  );

  const rows = (grades as {
    id: number;
    commodity_id: number;
    variety_id: number | null;
    name: string;
    slug: string;
    description: string | null;
  }[]).map((grade) => ({
    id: grade.id,
    name: grade.name,
    commodity: commodityName.get(grade.commodity_id) ?? 'Unknown commodity',
    variety: grade.variety_id ? (varietyName.get(grade.variety_id) ?? '—') : '—',
    description: grade.description,
  }));

  const columns: Column<(typeof rows)[number]>[] = [
    { key: 'name', header: 'Grade', cell: (row) => <span className="font-medium text-ink-900">{row.name}</span> },
    { key: 'commodity', header: 'Commodity', cell: (row) => row.commodity },
    { key: 'variety', header: 'Variety', cell: (row) => row.variety, hideOnMobile: true },
    {
      key: 'description',
      header: 'Description',
      cell: (row) => (
        <span className="text-xs text-ink-600">{row.description ?? 'No description recorded.'}</span>
      ),
      hideOnMobile: true,
    },
  ];

  return (
    <>
      <PageHeader
        title="Grades"
        description="Quality grades in use across the catalogue. Observations are only compared when the grade matches, so this list defines what can be compared with what."
        breadcrumbs={[
          { label: 'Control Centre', href: '/admin/overview' },
          { label: 'Catalogue' },
          { label: 'Grades' },
        ]}
      />
      <DataTable
        caption="Grades"
        columns={columns}
        rows={rows}
        rowKey={(row) => String(row.id)}
        empty="No grades are configured."
      />
    </>
  );
}
