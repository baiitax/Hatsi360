import type { Metadata } from 'next';
import { requireStaff } from '@/lib/auth/guards';
import { listQualityFlags } from '@/lib/operations/admin';
import { DataTable, type Column } from '@/components/ops/DataTable';
import { PageHeader, Panel, Pill } from '@/components/ops/Primitives';
import { ResolveFlagButton } from '@/components/admin/QualityControls';
import { ruleCatalogue } from '@/lib/quality/rules';
import { formatDateTime } from '@/lib/money';

export const metadata: Metadata = {
  title: 'Data quality — Control Centre',
  robots: { index: false, follow: false },
};

interface FlagRow {
  id: number;
  observation_id: string;
  flag: string;
  detail: string | null;
  severity: string;
  rule_code: string | null;
  rule_version: number | null;
  created_at: string;
  resolved_at: string | null;
}

const SEVERITY_TONE: Record<string, 'info' | 'warning' | 'danger'> = {
  info: 'info',
  warning: 'warning',
  review: 'warning',
  blocking: 'danger',
  critical: 'danger',
};

export default async function QualityPage() {
  await requireStaff('/admin/quality');

  const flags = (await listQualityFlags(200)) as FlagRow[];
  const rules = ruleCatalogue();

  const open = flags.filter((flag) => !flag.resolved_at);
  const resolved = flags.filter((flag) => flag.resolved_at);

  const columns: Column<FlagRow>[] = [
    {
      key: 'flag',
      header: 'Flag',
      cell: (row) => (
        <div>
          <Pill tone={SEVERITY_TONE[row.severity] ?? 'neutral'}>
            {row.flag.replace(/_/g, ' ')}
          </Pill>
          {row.detail ? (
            <p className="mt-1 max-w-sm text-xs text-ink-600">{row.detail}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'observation',
      header: 'Observation',
      cell: (row) => (
        <span className="font-mono text-xs text-ink-500">{row.observation_id.slice(0, 8)}</span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'rule',
      header: 'Rule',
      cell: (row) => (
        <span className="text-xs text-ink-600">
          {row.rule_code ?? 'manual'}
          {row.rule_version ? ` v${row.rule_version}` : ''}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'raised',
      header: 'Raised',
      cell: (row) => <span className="text-xs text-ink-500">{formatDateTime(row.created_at)}</span>,
    },
    {
      key: 'state',
      header: 'State',
      cell: (row) =>
        row.resolved_at ? (
          <Pill tone="success">Resolved</Pill>
        ) : (
          <Pill tone="warning">Open</Pill>
        ),
    },
    {
      key: 'action',
      header: '',
      cell: (row) => (row.resolved_at ? null : <ResolveFlagButton flagId={row.id} />),
    },
  ];

  return (
    <>
      <PageHeader
        title="Data quality"
        description="Every flag records the rule and the rule version that produced it, so a flag raised last month can still be explained after the thresholds have moved."
        breadcrumbs={[
          { label: 'Control Centre', href: '/admin/overview' },
          { label: 'Data quality' },
        ]}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="card px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Open flags</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-ink-950">{open.length}</p>
        </div>
        <div className="card px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Resolved flags</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-ink-950">{resolved.length}</p>
        </div>
        <div className="card px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Active rules</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-ink-950">{rules.length}</p>
        </div>
      </div>

      <Panel className="mb-5" title="Rule catalogue" description="The rules the engine applies to every observation.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                <th scope="col" className="py-2 pr-3">Rule</th>
                <th scope="col" className="py-2 pr-3">Version</th>
                <th scope="col" className="py-2 pr-3">Severity</th>
                <th scope="col" className="py-2">What it detects</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.code} className="border-b border-ink-100 last:border-0">
                  <th scope="row" className="py-2 pr-3 text-left font-mono text-xs text-ink-800">
                    {rule.code}
                  </th>
                  <td className="py-2 pr-3 text-xs text-ink-600">v{rule.version}</td>
                  <td className="py-2 pr-3">
                    <Pill tone={SEVERITY_TONE[rule.severity] ?? 'neutral'}>{rule.severity}</Pill>
                  </td>
                  <td className="py-2 text-xs text-ink-600">{rule.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <h2 className="mb-3 text-sm font-bold text-ink-900">Flag history</h2>
      <DataTable
        caption="Quality flags"
        columns={columns}
        rows={flags}
        rowKey={(row) => String(row.id)}
        empty="No quality flags have been raised."
      />
    </>
  );
}
