/**
 * Admin Intelligence — Countries Management
 *
 * Browse and search the expanded country database. Shows geographic
 * classification, trade bloc memberships, and key economic indicators.
 * Foundation for Phase 07 Global Trade Intelligence.
 */

import type { Metadata } from 'next';
import { requireStaff } from '@/lib/auth/guards';
import {
  getCountries,
  getContinentList,
  getSubregionList,
  getRegionSummaries,
} from '@/lib/trade/geographic';
import { PageHeader, Panel, Pill } from '@/components/ops/Primitives';
import type { PillTone } from '@/components/ops/Primitives';

export const metadata: Metadata = {
  title: 'Countries — Geographic Data',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    continent?: string;
    region?: string;
    q?: string;
    african?: string;
  }>;
}

export default async function CountriesManagementPage({ searchParams }: PageProps) {
  await requireStaff('/admin/intelligence/countries');

  const params = await searchParams;
  const continent = params.continent;
  const region = params.region;
  const search = params.q;
  const africanOnly = params.african === 'true';

  const [result, continents, subregions, summaries] = await Promise.all([
    getCountries({
      continent,
      region,
      search,
      isAfrican: africanOnly ? true : undefined,
      limit: 200,
    }),
    getContinentList(),
    region ? getSubregionList(continent) : Promise.resolve([] as string[]),
    getRegionSummaries(),
  ]);

  return (
    <>
      <PageHeader
        title="Countries"
        description={`${result.total} countries with geographic classification, trade bloc memberships, and economic data. Foundation for international trade intelligence.`}
        breadcrumbs={[
          { label: 'Intelligence', href: '/admin/intelligence' },
          { label: 'Countries' },
        ]}
      />

      {/* Region Summary Cards */}
      <div className="grid gap-3 md:grid-cols-5">
        {summaries.map((s) => (
          <div
            key={s.continent}
            className="rounded-lg border border-neutral-200 bg-white p-4"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              {s.continent}
            </p>
            <p className="mt-1 text-2xl font-bold text-neutral-900">
              {s.country_count}
            </p>
            <p className="text-xs text-neutral-500">
              Pop: {formatPopulation(s.total_population)}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <Panel title="Browse Countries">
        <form method="GET" className="flex flex-wrap gap-3 mb-4">
          <select
            name="continent"
            defaultValue={continent}
            className="rounded border border-neutral-300 px-3 py-1.5 text-sm"
          >
            <option value="">All Continents</option>
            {continents.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {subregions.length > 0 && (
            <select
              name="region"
              defaultValue={region}
              className="rounded border border-neutral-300 px-3 py-1.5 text-sm"
            >
              <option value="">All Subregions</option>
              {subregions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
          <input
            type="text"
            name="q"
            defaultValue={search}
            placeholder="Search country..."
            className="rounded border border-neutral-300 px-3 py-1.5 text-sm w-48"
          />
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" name="african" value="true" defaultChecked={africanOnly} />
            African only
          </label>
          <button
            type="submit"
            className="rounded bg-neutral-900 px-4 py-1.5 text-sm text-white hover:bg-neutral-700"
          >
            Filter
          </button>
          {(continent || region || search || africanOnly) && (
            <a
              href="/admin/intelligence/countries"
              className="rounded border border-neutral-300 px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
            >
              Clear
            </a>
          )}
        </form>

        {/* Countries Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="py-2 pr-4">Country</th>
                <th className="py-2 pr-4">ISO</th>
                <th className="py-2 pr-4">Continent</th>
                <th className="py-2 pr-4">Subregion</th>
                <th className="py-2 pr-4">Currency</th>
                <th className="py-2 pr-4 text-right">Population</th>
                <th className="py-2">Trade Blocs</th>
              </tr>
            </thead>
            <tbody>
              {result.countries.map((country) => (
                <tr key={country.id} className="border-b border-neutral-100">
                  <td className="py-2 pr-4 font-medium">
                    {country.name}
                    <span className="ml-2 text-xs text-neutral-400">
                      {country.code}
                    </span>
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs">
                    {country.iso_alpha2 ?? '—'} / {country.iso_alpha3 ?? '—'}
                  </td>
                  <td className="py-2 pr-4">{country.continent ?? '—'}</td>
                  <td className="py-2 pr-4">{country.subregion ?? '—'}</td>
                  <td className="py-2 pr-4">
                    {country.currency_code ? (
                      <span className="font-mono text-xs">{country.currency_code}</span>
                    ) : '—'}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    {country.population ? formatPopulation(country.population) : '—'}
                  </td>
                  <td className="py-2">
                    <div className="flex gap-1">
                      {country.is_african && (
                        <Pill tone="info">Africa</Pill>
                      )}
                      {country.is_afcfta_member && (
                        <Pill tone="success">AfCFTA</Pill>
                      )}
                      {country.is_ecowas_member && (
                        <Pill tone="brand">ECOWAS</Pill>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {result.total > 200 && (
          <p className="mt-3 text-sm text-neutral-500">
            Showing 200 of {result.total} countries. Use filters to narrow results.
          </p>
        )}
      </Panel>
    </>
  );
}

function formatPopulation(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}
