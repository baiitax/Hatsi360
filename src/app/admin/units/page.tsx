import type { Metadata } from 'next';
import { requireStaff } from '@/lib/auth/guards';
import { listReferenceData } from '@/lib/operations/admin';
import { DataTable, type Column } from '@/components/ops/DataTable';
import { PageHeader } from '@/components/ops/Primitives';

export const metadata: Metadata = {
  title: 'Units — Control Centre',
  robots: { index: false, follow: false },
};

/**
 * The measurement unit catalogue.
 *
 * `is_specific = false` marks the synthetic "unspecified" unit that carries
 * migrated records whose unit was never stated. Those records are never
 * normalised and are always flagged as ambiguous.
 */
export default async function AdminUnitsPage() {
  await requireStaff('/admin/units');
  const { units } = await listReferenceData();

  const rows = (units as {
    id: number;
    code: string;
    name: string;
    plural_name: string | null;
    dimension: string;
    base_factor: number | null;
    is_specific: boolean;
  }[]).map((unit) => ({
    id: unit.id,
    code: unit.code,
    name: unit.name,
    plural: unit.plural_name,
    dimension: unit.dimension,
    factor: unit.base_factor,
    specific: unit.is_specific,
  }));

  const columns: Column<(typeof rows)[number]>[] = [
    {
      key: 'code',
      header: 'Code',
      cell: (row) => <span className="font-mono text-xs font-semibold text-ink-900">{row.code}</span>,
    },
    {
      key: 'name',
      header: 'Unit',
      cell: (row) => (
        <div>
          <p className="font-medium text-ink-900">{row.name}</p>
          {row.plural ? <p className="text-xs text-ink-500">{row.plural}</p> : null}
        </div>
      ),
    },
    { key: 'dimension', header: 'Dimension', cell: (row) => row.dimension },
    {
      key: 'factor',
      header: 'Base factor',
      numeric: true,
      cell: (row) => (row.factor ?? '—'),
      hideOnMobile: true,
    },
    {
      key: 'specific',
      header: 'Comparable',
      cell: (row) => (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            row.specific ? 'bg-leaf-100 text-leaf-700' : 'bg-harvest-100 text-harvest-700'
          }`}
        >
          {row.specific ? 'Yes' : 'Ambiguous'}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Measurement units"
        description="The units a price may be reported in. Only units with a known conversion into their dimension's base unit can be compared or normalised."
        breadcrumbs={[
          { label: 'Control Centre', href: '/admin/overview' },
          { label: 'Catalogue' },
          { label: 'Units' },
        ]}
      />
      <DataTable
        caption="Measurement units"
        columns={columns}
        rows={rows}
        rowKey={(row) => String(row.id)}
        empty="No units are configured."
      />
    </>
  );
}
