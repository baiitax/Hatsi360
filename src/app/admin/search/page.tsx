import type { Metadata } from 'next';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth/guards';
import { listAgents, listMarkets, listObservations, listReferenceData } from '@/lib/operations/admin';
import { PageHeader, Panel, Pill } from '@/components/ops/Primitives';
import { formatDateTime, formatMoney } from '@/lib/money';

export const metadata: Metadata = {
  title: 'Search — Control Centre',
  robots: { index: false, follow: false },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  await requireStaff('/admin/search');

  const query = (params.q ?? '').trim();

  if (query.length < 2) {
    return (
      <>
        <PageHeader
          title="Search"
          description="Search agents, markets, commodities and submitted prices from one place."
          breadcrumbs={[
            { label: 'Control Centre', href: '/admin/overview' },
            { label: 'Search' },
          ]}
        />
        <Panel>
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="min-w-[16rem] flex-1">
              <label htmlFor="q" className="mb-1 block text-xs font-semibold text-ink-700">
                Search term
              </label>
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={query}
                autoFocus
                placeholder="A market, agent or commodity name"
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
          <p className="mt-3 text-xs text-ink-500">
            Type at least two characters. Results are limited to what your role may read.
          </p>
        </Panel>
      </>
    );
  }

  const [agents, markets, reference, observations] = await Promise.all([
    listAgents({ q: query, pageSize: 10 }),
    listMarkets({ q: query, pageSize: 10 }),
    listReferenceData(),
    listObservations({ q: query, pageSize: 10 }),
  ]);

  const commodityMatches = (
    reference.commodities as unknown as { id: number; name: string; slug: string }[]
  ).filter((commodity) => commodity.name.toLowerCase().includes(query.toLowerCase()));

  const total =
    agents.total + markets.total + commodityMatches.length + observations.total;

  return (
    <>
      <PageHeader
        title={`Search results for “${query}”`}
        description={`${total} match${total === 1 ? '' : 'es'} across agents, markets, commodities and observations.`}
        breadcrumbs={[
          { label: 'Control Centre', href: '/admin/overview' },
          { label: 'Search' },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={`Agents (${agents.total})`}>
          {agents.rows.length === 0 ? (
            <p className="text-xs text-ink-500">No agent matches that name.</p>
          ) : (
            <ul className="space-y-2">
              {agents.rows.map((agent) => (
                <li key={agent.id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-ink-900">{agent.fullName ?? 'Unnamed'}</p>
                    <p className="text-xs text-ink-500">
                      {agent.marketNames.join(', ') || 'No market assigned'}
                    </p>
                  </div>
                  <Pill tone={agent.accountStatus === 'active' ? 'success' : 'warning'}>
                    {agent.accountStatus}
                  </Pill>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={`Markets (${markets.total})`}>
          {markets.rows.length === 0 ? (
            <p className="text-xs text-ink-500">No market matches that name.</p>
          ) : (
            <ul className="space-y-2">
              {markets.rows.map((market) => (
                <li key={market.id} className="flex items-center justify-between gap-3">
                  <div>
                    <Link
                      href={`/markets/${market.slug}`}
                      className="text-sm font-medium text-ink-900 hover:text-brand-700"
                    >
                      {market.name}
                    </Link>
                    <p className="text-xs text-ink-500">{market.stateName ?? 'Unknown state'}</p>
                  </div>
                  <span className="text-xs text-ink-500">{market.observations} observations</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={`Commodities (${commodityMatches.length})`}>
          {commodityMatches.length === 0 ? (
            <p className="text-xs text-ink-500">No commodity matches that name.</p>
          ) : (
            <ul className="space-y-2">
              {commodityMatches.slice(0, 10).map((commodity) => (
                <li key={commodity.id} className="flex items-center justify-between gap-3">
                  <Link
                    href={`/commodities/${commodity.slug}`}
                    className="text-sm font-medium text-ink-900 hover:text-brand-700"
                  >
                    {commodity.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={`Observations (${observations.total})`}>
          {observations.rows.length === 0 ? (
            <p className="text-xs text-ink-500">No observation matches that term.</p>
          ) : (
            <ul className="space-y-2">
              {observations.rows.map((observation) => (
                <li key={observation.id} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-ink-900">
                      {observation.commodityName} · {observation.marketName}
                    </p>
                    <p className="text-xs text-ink-500">
                      {observation.agentName} · {formatDateTime(observation.collectedAt)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-ink-900">
                    {observation.reportedAmount === null
                      ? '—'
                      : formatMoney(observation.reportedAmount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
