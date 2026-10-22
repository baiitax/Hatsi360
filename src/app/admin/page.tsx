import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/ui/PageHero';
import { VerificationQueue } from '@/components/admin/VerificationQueue';
import { getProfile, getSession, isStaffRole } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import { getDataSource } from '@/lib/data';
import { formatDate, formatDateTime } from '@/lib/money';

export const metadata: Metadata = {
  title: 'Operations console',
  description: 'Verify, publish and manage agricultural price observations.',
  robots: { index: false, follow: false },
};

interface QueueItem {
  id: string;
  commodityName: string;
  marketName: string;
  stateName: string;
  amount: number | null;
  unitName: string | null;
  priceType: string;
  collectedAt: string;
  submittedAt: string | null;
  notes: string | null;
  agentName: string | null;
  status: string;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const session = await getSession();
  const profile = await getProfile();

  if (!session || !profile) {
    return (
      <>
        <PageHero
          eyebrow="Operations"
          title="Sign in to the operations console"
          lede="The console is for verification officers, supervisors and administrators."
          breadcrumbs={[{ label: 'Admin' }]}
        />
        <div className="section">
          <div className="container-page max-w-md">
            <div className="card p-6 sm:p-8">
              <Link
                href="/login?next=%2Fadmin"
                className="block rounded-xl bg-brand-700 px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-800"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!isStaffRole(profile.role)) {
    return (
      <>
        <PageHero
          eyebrow="Operations"
          title="You do not have access to this workspace"
          lede="The operations console is restricted to verification officers, supervisors, analysts and administrators."
          breadcrumbs={[{ label: 'Admin' }]}
        />
        <div className="section">
          <div className="container-page max-w-md">
            <div className="card p-6 sm:p-8">
              <p className="text-sm leading-relaxed text-ink-600">
                Your role is <strong>{profile.role.replace(/_/g, ' ')}</strong>. Access to this
                workspace is enforced on the server and in the database, not by hiding the link.
              </p>
              <Link
                href="/dashboard"
                className="mt-6 block rounded-xl bg-brand-700 px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-800"
              >
                Go to my dashboard
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  const source = await getDataSource();
  const [markets, commodities, categories, states] = await Promise.all([
    source.listMarkets(),
    source.listCommodities(),
    source.listCategories(),
    source.listStates(),
  ]);

  const published = await source.listObservationsForAnalysis({});

  let queue: QueueItem[] = [];
  let recentAudit: { action: string; entity_type: string; created_at: string; actor: string | null }[] = [];
  let agentCount = 0;
  let assignmentCount = 0;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();

    const [pending, auditRows, agents, assignments] = await Promise.all([
      supabase
        .from('price_observations')
        .select(
          'id, reported_amount, reported_unit_id, price_type, collected_at, submitted_at, notes, verification_status, commodity:commodities(name), market:markets(name), state:states(name), unit:measurement_units(name), agent:profiles(full_name)',
        )
        .eq('verification_status', 'pending_verification')
        .order('submitted_at', { ascending: true })
        .limit(50),
      supabase
        .from('audit_logs')
        .select('action, entity_type, created_at, actor:profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'agent'),
      supabase.from('market_agent_assignments').select('id', { count: 'exact', head: true }),
    ]);

    queue = (pending.data ?? []).map((row) => {
      const commodity = row.commodity as unknown as { name?: string } | null;
      const market = row.market as unknown as { name?: string } | null;
      const state = row.state as unknown as { name?: string } | null;
      const unit = row.unit as unknown as { name?: string } | null;
      const agent = row.agent as unknown as { full_name?: string } | null;
      return {
        id: row.id as string,
        commodityName: commodity?.name ?? 'Commodity',
        marketName: market?.name ?? 'Market',
        stateName: state?.name ?? '',
        amount: row.reported_amount == null ? null : Number(row.reported_amount),
        unitName: unit?.name ?? null,
        priceType: row.price_type as string,
        collectedAt: row.collected_at as string,
        submittedAt: (row.submitted_at as string | null) ?? null,
        notes: (row.notes as string | null) ?? null,
        agentName: agent?.full_name ?? null,
        status: row.verification_status as string,
      };
    });

    recentAudit = (auditRows.data ?? []).map((row) => {
      const actor = row.actor as unknown as { full_name?: string } | null;
      return {
        action: row.action as string,
        entity_type: row.entity_type as string,
        created_at: row.created_at as string,
        actor: actor?.full_name ?? null,
      };
    });

    agentCount = agents.count ?? 0;
    assignmentCount = assignments.count ?? 0;
  }

  const latestCollectedAt = published.length
    ? published.reduce<string | null>(
        (acc, o) => (acc == null || o.collectedAt > acc ? o.collectedAt : acc),
        null,
      )
    : null;

  const view = params.view ?? 'overview';

  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'queue', label: `Verification queue${queue.length ? ` (${queue.length})` : ''}` },
    { key: 'reference', label: 'Markets & commodities' },
    { key: 'audit', label: 'Audit history' },
  ];

  return (
    <>
      <PageHero
        eyebrow="Operations"
        title="Operations console"
        lede="Verify submissions, publish prices, and keep the reference data correct."
        breadcrumbs={[{ label: 'Admin' }]}
      />

      <div className="section">
        <div className="container-page">
          <nav aria-label="Console sections" className="mb-6 flex flex-wrap gap-2">
            {TABS.map((tab) => (
              <Link
                key={tab.key}
                href={`/admin?view=${tab.key}`}
                aria-current={view === tab.key ? 'page' : undefined}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  view === tab.key
                    ? 'border-brand-700 bg-brand-700 text-white'
                    : 'border-ink-200 bg-white text-ink-700 hover:border-brand-400 hover:text-brand-800'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>

          {view === 'overview' ? (
            <>
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="card p-5">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Published observations
                  </dt>
                  <dd className="mt-1 text-2xl font-black text-brand-800">{published.length}</dd>
                </div>
                <div className="card p-5">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Awaiting verification
                  </dt>
                  <dd className="mt-1 text-2xl font-black text-ink-900">{queue.length}</dd>
                </div>
                <div className="card p-5">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Markets / commodities
                  </dt>
                  <dd className="mt-1 text-2xl font-black text-ink-900">
                    {markets.length} / {commodities.length}
                  </dd>
                </div>
                <div className="card p-5">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Agents / assignments
                  </dt>
                  <dd className="mt-1 text-2xl font-black text-ink-900">
                    {agentCount} / {assignmentCount}
                  </dd>
                </div>
              </dl>

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <section className="card p-6">
                  <h2 className="text-base font-bold">Freshness</h2>
                  <p className="mt-1 text-xs text-ink-500">
                    The newest published observation and how old it is.
                  </p>
                  <p className="mt-4 text-2xl font-black text-ink-950">
                    {latestCollectedAt ? formatDateTime(latestCollectedAt) : 'Nothing published'}
                  </p>
                  {latestCollectedAt ? (
                    <p className="mt-1 text-sm text-ink-600">
                      {Math.floor((Date.now() - new Date(latestCollectedAt).getTime()) / 86_400_000)}{' '}
                      day(s) old
                    </p>
                  ) : null}
                </section>

                <section className="card p-6">
                  <h2 className="text-base font-bold">Data source</h2>
                  <p className="mt-1 text-xs text-ink-500">
                    Which backend this deployment is reading from.
                  </p>
                  <p className="mt-4 text-lg font-bold text-ink-950">
                    {source.isMigrated ? 'Migrated legacy dataset' : 'Supabase (live)'}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">
                    {source.isMigrated
                      ? 'This deployment is serving the records migrated from the previous Pluck Live system. Connect Supabase to switch to the live database.'
                      : 'This deployment is reading directly from the Supabase project.'}
                  </p>
                </section>
              </div>

              <section className="mt-6 card p-6">
                <h2 className="text-base font-bold">Recent audit history</h2>
                {recentAudit.length === 0 ? (
                  <p className="mt-3 text-sm text-ink-500">
                    No audit records yet. Every approval, rejection and correction is written here
                    with the person, the time and the reason.
                  </p>
                ) : (
                  <ul className="mt-4 divide-y divide-ink-100">
                    {recentAudit.map((entry, index) => (
                      <li key={index} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                        <span className="text-sm font-medium text-ink-800">
                          {entry.action.replace(/_/g, ' ')}
                          <span className="ml-2 text-ink-500">{entry.entity_type}</span>
                        </span>
                        <span className="text-xs text-ink-500">
                          {entry.actor ?? 'system'} · {formatDateTime(entry.created_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          ) : null}

          {view === 'queue' ? <VerificationQueue items={queue} /> : null}

          {view === 'reference' ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="card overflow-hidden">
                <div className="border-b border-ink-200 bg-ink-50 px-5 py-3">
                  <h2 className="text-base font-bold">Markets</h2>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {markets.length} markets across {states.length} states.
                  </p>
                </div>
                <ul className="max-h-[32rem] divide-y divide-ink-100 overflow-y-auto">
                  {markets.map((market) => (
                    <li key={market.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div>
                        <Link
                          href={`/markets/${market.slug}`}
                          className="text-sm font-semibold text-ink-900 hover:text-brand-700"
                        >
                          {market.name}
                        </Link>
                        <p className="text-xs text-ink-500">{market.stateName}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-semibold text-ink-700">
                        {market.observationCount ?? 0}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="card overflow-hidden">
                <div className="border-b border-ink-200 bg-ink-50 px-5 py-3">
                  <h2 className="text-base font-bold">Commodities</h2>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {commodities.length} commodities across {categories.length} categories.
                  </p>
                </div>
                <ul className="max-h-[32rem] divide-y divide-ink-100 overflow-y-auto">
                  {commodities.map((commodity) => (
                    <li key={commodity.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div>
                        <Link
                          href={`/commodities/${commodity.slug}`}
                          className="text-sm font-semibold text-ink-900 hover:text-brand-700"
                        >
                          {commodity.name}
                        </Link>
                        <p className="text-xs text-ink-500">{commodity.categoryName}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-semibold text-ink-700">
                        {commodity.observationCount ?? 0}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          ) : null}

          {view === 'audit' ? (
            <section className="card p-6">
              <h2 className="text-base font-bold">Audit history</h2>
              <p className="mt-1 text-xs text-ink-500">
                An append-only record of consequential actions: who did what, when, and why.
              </p>
              {recentAudit.length === 0 ? (
                <p className="mt-4 text-sm text-ink-500">No audit records yet.</p>
              ) : (
                <ul className="mt-4 divide-y divide-ink-100">
                  {recentAudit.map((entry, index) => (
                    <li key={index} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                      <span className="text-sm font-medium text-ink-800">
                        {entry.action.replace(/_/g, ' ')}
                        <span className="ml-2 text-ink-500">{entry.entity_type}</span>
                      </span>
                      <span className="text-xs text-ink-500">
                        {entry.actor ?? 'system'} · {formatDateTime(entry.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}
