import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/ui/PageHero';
import { AgentConsole } from '@/components/agent/AgentConsole';
import { getProfile, getSession } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import { getDataSource } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Field collection',
  description: 'Collect and submit agricultural price observations from the field.',
  robots: { index: false, follow: false },
};

export default async function AgentPage() {
  const session = await getSession();
  const profile = await getProfile();

  if (!session || !profile) {
    return (
      <>
        <PageHero
          eyebrow="Field collection"
          title="Sign in to collect prices"
          lede="The collection interface is for assigned market agents. Sign in with the account your supervisor gave you."
          breadcrumbs={[{ label: 'Agent' }]}
        />
        <div className="section">
          <div className="container-page max-w-md">
            <div className="card p-6 sm:p-8">
              <p className="text-sm leading-relaxed text-ink-600">
                You will only see the markets and commodities you have been assigned. If you finish
                your shift with entries still unsaved, they stay as local drafts on your device
                until they are synced.
              </p>
              <Link
                href="/login?next=%2Fagent"
                className="mt-6 block rounded-xl bg-brand-700 px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-800"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  const isAgent = ['agent', 'market_supervisor', 'admin', 'super_admin'].includes(profile.role);

  const source = await getDataSource();
  const [allMarkets, allCommodities, units] = await Promise.all([
    source.listMarkets(),
    source.listCommodities(),
    source.listUnits(),
  ]);

  // Assigned markets come from the database; the RLS policies already limit the
  // rows an agent can see to their own assignments.
  let assignedMarkets = allMarkets.map((m) => ({
    id: m.id,
    name: m.name,
    stateName: m.stateName ?? '',
  }));

  let submissions: {
    id: string;
    commodityName: string;
    marketName: string;
    amount: number;
    unitName: string | null;
    collectedAt: string;
    status: string;
    submittedAt: string | null;
  }[] = [];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();

    const { data: assignments } = await supabase
      .from('market_agent_assignments')
      .select('market_id')
      .eq('user_id', profile.id)
      .eq('status', 'active');

    const assignedIds = new Set((assignments ?? []).map((a) => a.market_id as number));
    if (assignedIds.size > 0) {
      assignedMarkets = assignedMarkets.filter((m) => assignedIds.has(m.id));
    }

    const { data: mine } = await supabase
      .from('price_observations')
      .select(
        'id, reported_amount, collected_at, submitted_at, verification_status, commodity:commodities(name), market:markets(name), unit:measurement_units(name)',
      )
      .eq('agent_user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(25);

    submissions = (mine ?? []).map((row) => {
      const commodity = row.commodity as unknown as { name?: string } | null;
      const market = row.market as unknown as { name?: string } | null;
      const unit = row.unit as unknown as { name?: string } | null;
      return {
        id: row.id as string,
        commodityName: commodity?.name ?? 'Commodity',
        marketName: market?.name ?? 'Market',
        amount: Number(row.reported_amount ?? 0),
        unitName: unit?.name ?? null,
        collectedAt: row.collected_at as string,
        status: row.verification_status as string,
        submittedAt: (row.submitted_at as string | null) ?? null,
      };
    });
  }

  return (
    <>
      <PageHero
        eyebrow="Field collection"
        title={`Good day, ${profile.fullName ?? 'agent'}`}
        lede="Record what you observed, in the unit you were given it, with the time you were given it."
        breadcrumbs={[{ label: 'Agent' }]}
      />
      <div className="section">
        <div className="container-page">
          {isAgent ? (
            <AgentConsole
              profile={profile}
              markets={assignedMarkets}
              commodities={allCommodities.map((c) => ({
                id: c.id,
                name: c.name,
                categoryName: c.categoryName ?? null,
              }))}
              units={units.map((u) => ({
                id: u.id,
                code: u.code,
                name: u.name,
                isSpecific: u.isSpecific,
              }))}
              submissions={submissions}
            />
          ) : (
            <div className="card p-6 sm:p-8">
              <h2 className="text-lg font-bold">This account is not assigned to a market</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                Your account has the role <strong>{profile.role.replace(/_/g, ' ')}</strong>. Only
                accounts with an agent or supervisor role can submit observations, and only for
                markets they have been assigned to.
              </p>
              <Link
                href="/dashboard"
                className="mt-6 inline-block rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
              >
                Go to my dashboard
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
