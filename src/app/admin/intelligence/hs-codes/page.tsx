/**
 * Admin Intelligence — HS Code Classification Management
 *
 * Browse the Harmonized System code hierarchy and view commodity-to-HS
 * code mappings. Shows the classification foundation for international
 * trade intelligence.
 */

import type { Metadata } from 'next';
import { requireStaff } from '@/lib/auth/guards';
import {
  getHSCodes,
  getClassificationStats,
  getCommodityHSMappings,
} from '@/lib/trade/classification';
import { PageHeader, Panel, Pill } from '@/components/ops/Primitives';
import type { PillTone } from '@/components/ops/Primitives';

export const metadata: Metadata = {
  title: 'HS Codes — Classification',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    level?: string;
    q?: string;
    type?: string;
  }>;
}

export default async function HSCodesManagementPage({ searchParams }: PageProps) {
  await requireStaff('/admin/intelligence/hs-codes');

  const params = await searchParams;
  const level = params.level as 'chapter' | 'heading' | 'subheading' | undefined;
  const search = params.q;
  const type = params.type;

  const [codesResult, stats, mappings] = await Promise.all([
    getHSCodes({
      level,
      search,
      isAgricultural: type === 'agricultural' ? true : undefined,
      isIndustrial: type === 'industrial' ? true : undefined,
      limit: 200,
    }),
    getClassificationStats(),
    getCommodityHSMappings(),
  ]);

  return (
    <>
      <PageHeader
        title="HS Code Classification"
        description={`Harmonized System codes for international trade classification. ${stats.total_codes} codes across ${stats.chapters} chapters.`}
        breadcrumbs={[
          { label: 'Intelligence', href: '/admin/intelligence' },
          { label: 'HS Codes' },
        ]}
      />

      {/* Stats Cards */}
      <div className="grid gap-3 md:grid-cols-5">
        <StatCard label="Total Codes" value={stats.total_codes} />
        <StatCard label="Chapters" value={stats.chapters} />
        <StatCard label="Headings" value={stats.headings} />
        <StatCard label="Subheadings" value={stats.subheadings} />
        <StatCard label="Mappings" value={stats.commodity_mappings} />
      </div>

      {/* Filters */}
      <Panel title="Browse HS Codes">
        <form method="GET" className="flex flex-wrap gap-3 mb-4">
          <select
            name="level"
            defaultValue={level}
            className="rounded border border-neutral-300 px-3 py-1.5 text-sm"
          >
            <option value="">All Levels</option>
            <option value="chapter">Chapters (2-digit)</option>
            <option value="heading">Headings (4-digit)</option>
            <option value="subheading">Subheadings (6-digit)</option>
          </select>
          <select
            name="type"
            defaultValue={type}
            className="rounded border border-neutral-300 px-3 py-1.5 text-sm"
          >
            <option value="">All Types</option>
            <option value="agricultural">Agricultural</option>
            <option value="industrial">Industrial</option>
          </select>
          <input
            type="text"
            name="q"
            defaultValue={search}
            placeholder="Search code or description..."
            className="rounded border border-neutral-300 px-3 py-1.5 text-sm w-56"
          />
          <button
            type="submit"
            className="rounded bg-neutral-900 px-4 py-1.5 text-sm text-white hover:bg-neutral-700"
          >
            Filter
          </button>
          {(level || search || type) && (
            <a
              href="/admin/intelligence/hs-codes"
              className="rounded border border-neutral-300 px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
            >
              Clear
            </a>
          )}
        </form>

        {/* Codes Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="py-2 pr-4">Code</th>
                <th className="py-2 pr-4">Level</th>
                <th className="py-2 pr-4">Description</th>
                <th className="py-2 pr-4">Unit</th>
                <th className="py-2">Type</th>
              </tr>
            </thead>
            <tbody>
              {codesResult.codes.map((code) => (
                <tr key={code.id} className="border-b border-neutral-100">
                  <td className="py-2 pr-4 font-mono font-medium text-sm">
                    {code.code}
                  </td>
                  <td className="py-2 pr-4">
                    <Pill
                      tone={
                        code.level === 'chapter'
                          ? 'info'
                          : code.level === 'heading'
                          ? 'success'
                          : 'neutral'
                      }
                    >
                      {code.level}
                    </Pill>
                  </td>
                  <td className="py-2 pr-4 max-w-md truncate">
                    {code.description}
                  </td>
                  <td className="py-2 pr-4 text-xs text-neutral-500">
                    {code.primary_unit ?? '—'}
                  </td>
                  <td className="py-2">
                    <div className="flex gap-1">
                      {code.is_agricultural && (
                        <Pill tone="success">Agri</Pill>
                      )}
                      {code.is_industrial && (
                        <Pill tone="info">Ind</Pill>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Commodity Mappings */}
      <Panel title={`Commodity-to-HS Mappings (${mappings.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="py-2 pr-4">Commodity</th>
                <th className="py-2 pr-4">HS Code</th>
                <th className="py-2 pr-4">HS Description</th>
                <th className="py-2 pr-4">Confidence</th>
                <th className="py-2">Primary</th>
              </tr>
            </thead>
            <tbody>
              {mappings.map((m) => (
                <tr key={m.id} className="border-b border-neutral-100">
                  <td className="py-2 pr-4 font-medium">
                    {m.commodity?.name ?? 'Unknown'}
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs">
                    {m.hs_code?.code ?? '—'}
                  </td>
                  <td className="py-2 pr-4 text-xs text-neutral-600 max-w-xs truncate">
                    {m.hs_code?.description ?? '—'}
                  </td>
                  <td className="py-2 pr-4">
                    <Pill
                      tone={
                        m.mapping_confidence === 'high'
                          ? 'success'
                          : m.mapping_confidence === 'medium'
                          ? 'warning'
                          : 'neutral'
                      }
                    >
                      {m.mapping_confidence}
                    </Pill>
                  </td>
                  <td className="py-2">
                    {m.is_primary ? (
                      <Pill tone="info">Primary</Pill>
                    ) : (
                      <span className="text-xs text-neutral-400">Alt</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-neutral-900">{value}</p>
    </div>
  );
}
