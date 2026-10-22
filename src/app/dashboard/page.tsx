import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/ui/PageHero';
import { getProfile, getSession, isStaffRole } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import { getDataSource } from '@/lib/data';
import { formatDate, formatMoney } from '@/lib/money';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your Pluck Live workspace: watchlists, alerts, reports and API keys.',
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const session = await getSession();
  const profile = await getProfile();

  if (!session || !profile) {
    return (
      <>
        <PageHero
          eyebrow="Workspace"
          title="Sign in to your Pluck Live workspace"
          lede="Save the commodities and markets you follow, set price alerts, and manage your API keys."
          breadcrumbs={[{ label: 'Dashboard' }]}
        />
        <div className="section">
          <div className="container-page max-w-md">
            <div className="card p-6 sm:p-8">
              <p className="text-sm leading-relaxed text-ink-600">
                You do not need an account to browse prices — the whole public price directory is
                free. An account adds watchlists, alerts, exports and API access.
              </p>
              <Link
                href="/login?next=%2Fdashboard"
                className="mt-6 block rounded-xl bg-brand-700 px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-800"
              >
                Sign in
              </Link>
              <Link
                href="/prices"
                className="mt-3 block rounded-xl border border-ink-300 px-6 py-3 text-center text-sm font-semibold text-ink-700 transition-colors hover:border-brand-400 hover:text-brand-800"
              >
                Browse prices instead
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  const source = await getDataSource();
  const [commodities, markets] = await Promise.all([
    source.listCommodities(),
    source.listMarkets(),
  ]);

  let savedCommodities: string[] = [];
  let savedMarkets: string[] = [];
  let alerts: { commodity: string; direction: string; threshold: number | null }[] = [];
  let apiApplications: { name: string; prefix: string; tier: string; lastUsed: string | null }[] = [];
  let subscription: { plan: string; status: string } | null = null;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();

    const [savedC, savedM, alertRows, apiRows, subRows] = await Promise.all([
      supabase.from('saved_commodities').select('commodity_id').eq('user_id', profile.id),
      supabase.from('saved_markets').select('market_id').eq('user_id', profile.id),
      supabase
        .from('price_alerts')
        .select('direction, threshold_amount, commodity:commodities(name)')
        .eq('user_id', profile.id)
        .eq('is_active', true),
      supabase
        .from('api_applications')
        .select('name, key_prefix, tier, last_used_at')
        .eq('user_id', profile.id)
        .eq('is_active', true),
      supabase
        .from('customer_subscriptions')
        .select('plan, status')
        .eq('user_id', profile.id)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1),
    ]);

    savedCommodities = (savedC.data ?? [])
      .map((r) => commodities.find((c) => c.id === r.commodity_id)?.name)
      .filter((n): n is string => Boolean(n));
    savedMarkets = (savedM.data ?? [])
      .map((r) => markets.find((m) => m.id === r.market_id)?.name)
      .filter((n): n is string => Boolean(n));
    alerts = (alertRows.data ?? []).map((row) => {
      const commodity = row.commodity as unknown as { name?: string } | null;
      return {
        commodity: commodity?.name ?? 'Any commodity',
        direction: row.direction as string,
        threshold: row.threshold_amount == null ? null : Number(row.threshold_amount),
      };
    });
    apiApplications = (apiRows.data ?? []).map((row) => ({
      name: row.name as string,
      prefix: row.key_prefix as string,
      tier: row.tier as string,
      lastUsed: (row.last_used_at as string | null) ?? null,
    }));
    const sub = (subRows.data ?? [])[0];
    subscription = sub ? { plan: sub.plan as string, status: sub.status as string } : null;
  }

  const withPrices = commodities.filter((c) => (c.observationCount ?? 0) > 0).slice(0, 6);

  return (
    <>
      <PageHero
        eyebrow="Workspace"
        title={`Welcome back, ${profile.fullName ?? profile.email}`}
        lede="Your watchlists, alerts, reports and API keys — plus the public price tools, which stay free."
        breadcrumbs={[{ label: 'Dashboard' }]}
      />

      <div className="section">
        <div className="container-page space-y-8">
          {/* ----------------------------------------------- shortcuts -- */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { href: '/prices', title: 'Price directory', body: 'Every published observation.' },
              { href: '/compare', title: 'Compare markets', body: 'One commodity, many markets.' },
              { href: '/commodities', title: 'Commodities', body: 'The full catalogue.' },
              { href: '/api-docs', title: 'Developer API', body: 'Build on the data.' },
            ].map((shortcut) => (
              <Link key={shortcut.href} href={shortcut.href} className="card card-hover p-5">
                <h2 className="text-base font-bold">{shortcut.title}</h2>
                <p className="mt-1 text-sm text-ink-600">{shortcut.body}</p>
                <span className="mt-3 inline-block text-sm font-semibold text-brand-700">
                  Open →
                </span>
              </Link>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* --------------------------------------------- watchlists -- */}
            <section className="card p-6">
              <h2 className="text-base font-bold">Saved commodities</h2>
              <p className="mt-1 text-xs text-ink-500">Your watchlist.</p>
              {savedCommodities.length === 0 ? (
                <p className="mt-4 text-sm text-ink-500">
                  Nothing saved yet.{' '}
                  <Link href="/commodities" className="font-semibold text-brand-700 underline">
                    Browse commodities
                  </Link>{' '}
                  to build your watchlist.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {savedCommodities.map((name) => (
                    <li key={name} className="text-sm text-ink-700">
                      {name}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card p-6">
              <h2 className="text-base font-bold">Saved markets</h2>
              <p className="mt-1 text-xs text-ink-500">Markets you follow.</p>
              {savedMarkets.length === 0 ? (
                <p className="mt-4 text-sm text-ink-500">
                  Nothing saved yet.{' '}
                  <Link href="/markets" className="font-semibold text-brand-700 underline">
                    Browse markets
                  </Link>
                  .
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {savedMarkets.map((name) => (
                    <li key={name} className="text-sm text-ink-700">
                      {name}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card p-6">
              <h2 className="text-base font-bold">Price alerts</h2>
              <p className="mt-1 text-xs text-ink-500">Thresholds you have set.</p>
              {alerts.length === 0 ? (
                <p className="mt-4 text-sm text-ink-500">
                  No alerts yet. Alerts are part of the Professional plan —{' '}
                  <Link href="/pricing" className="font-semibold text-brand-700 underline">
                    see plans
                  </Link>
                  .
                </p>
              ) : (
                <ul className="mt-4 space-y-2.5">
                  {alerts.map((alert, index) => (
                    <li key={index} className="text-sm text-ink-700">
                      <span className="font-medium">{alert.commodity}</span>
                      <span className="block text-xs text-ink-500">
                        {alert.direction === 'any'
                          ? 'Notify on any move'
                          : `Notify ${alert.direction} ${formatMoney(alert.threshold)}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* ---------------------------------------------- api + plan -- */}
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card p-6">
              <h2 className="text-base font-bold">API applications</h2>
              <p className="mt-1 text-xs text-ink-500">
                Keys are shown once at creation and stored only as a hash.
              </p>
              {apiApplications.length === 0 ? (
                <p className="mt-4 text-sm text-ink-500">
                  No API keys yet.{' '}
                  <Link href="/api-docs" className="font-semibold text-brand-700 underline">
                    Read the API documentation
                  </Link>{' '}
                  to request one.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {apiApplications.map((application) => (
                    <li key={application.prefix} className="rounded-xl border border-ink-200 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-ink-900">{application.name}</p>
                        <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-semibold text-ink-700">
                          {application.tier}
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-xs text-ink-500">{application.prefix}…</p>
                      <p className="mt-1 text-xs text-ink-500">
                        Last used {application.lastUsed ? formatDate(application.lastUsed) : 'never'}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card p-6">
              <h2 className="text-base font-bold">Your plan</h2>
              <p className="mt-1 text-xs text-ink-500">What you have access to right now.</p>
              <p className="mt-4 text-2xl font-black text-ink-950">
                {subscription ? subscription.plan : 'Free'}
              </p>
              <p className="mt-1 text-sm text-ink-600">
                {subscription
                  ? `Subscription is ${subscription.status}.`
                  : 'The free plan. Every published price, every market and commodity page, the comparison tool and the historical charts are all included.'}
              </p>
              <ul className="mt-4 space-y-2 text-sm text-ink-600">
                <li>✓ Price directory and market comparison</li>
                <li>✓ Historical charts with observation counts</li>
                <li className={subscription ? '' : 'text-ink-400'}>
                  {subscription ? '✓' : '·'} CSV exports and scheduled reports
                </li>
                <li className={subscription ? '' : 'text-ink-400'}>
                  {subscription ? '✓' : '·'} API access
                </li>
              </ul>
              <Link
                href="/pricing"
                className="mt-5 inline-block rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
              >
                Compare plans
              </Link>
            </section>
          </div>

          {/* ----------------------------------------------- operations -- */}
          {isStaffRole(profile.role) ? (
            <section className="rounded-2xl border border-brand-200 bg-brand-50 p-6">
              <h2 className="text-base font-bold text-brand-950">Operations</h2>
              <p className="mt-1 text-sm text-brand-900">
                You have the {profile.role.replace(/_/g, ' ')} role.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/admin"
                  className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
                >
                  Open the operations console
                </Link>
                <Link
                  href="/agent"
                  className="rounded-full border border-brand-300 px-5 py-2.5 text-sm font-semibold text-brand-900 transition-colors hover:bg-brand-100"
                >
                  Field collection
                </Link>
              </div>
            </section>
          ) : null}

          {/* --------------------------------------------- price pulse -- */}
          <section>
            <h2 className="text-xl font-bold tracking-tight">Latest prices you can act on</h2>
            <p className="mt-1 text-sm text-ink-600">
              A live snapshot from the public price directory — free for every account.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {withPrices.map((commodity) => (
                <Link
                  key={commodity.id}
                  href={`/commodities/${commodity.slug}`}
                  className="card card-hover p-5"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                    {commodity.categoryName}
                  </p>
                  <h3 className="mt-1 text-lg font-bold">{commodity.name}</h3>
                  <p className="mt-2 text-sm text-ink-600">
                    {commodity.marketCount} market{commodity.marketCount === 1 ? '' : 's'} ·{' '}
                    {commodity.observationCount} observation
                    {commodity.observationCount === 1 ? '' : 's'}
                  </p>
                  <p className="mt-1 text-xs text-ink-500">
                    Latest {formatDate(commodity.latestObservationAt)}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
