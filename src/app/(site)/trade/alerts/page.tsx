import { buildShareMetadata } from '@/lib/metadata';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { getDataSource } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import { EmptyState, PageHeader, Panel, Pill, Price } from '@/components/trade/Primitives';

export const metadata = buildShareMetadata({
  title: 'Price alerts',
  path: '/trade/alerts',
  indexable: false,
  description:
    'Price thresholds for the agricultural commodities you follow, and how you are notified when they are crossed.',
});

export const dynamic = 'force-dynamic';

/**
 * Price alerts.
 *
 * Brief §19 asks for threshold alerts, significant-change alerts, new
 * opportunity alerts, supply updates and disruption alerts, with controls over
 * frequency. The schema's `price_alerts` table already supports the threshold
 * form: a commodity or market target, a direction, an absolute threshold and a
 * percentage threshold, a delivery channel, an active flag and a
 * last-triggered timestamp.
 *
 * What this page deliberately does not offer:
 *
 *   - "New opportunity" alerts. An opportunity requires a commercial offer.
 *     Offers do exist in this platform (`buyer_offers` / `seller_offers`,
 *     verified through `offer_verification_events`), but an offer is private
 *     by default: only a verified, disclosed and unexpired one is publicly
 *     readable, and even then it is one counterparty's commitment rather than
 *     a market fact. Alerting on the lowest recorded price instead would fire
 *     on ordinary market variation, which brief §15 forbids.
 *   - Frequency controls beyond what the channel implies. There is no
 *     notification scheduler in the platform, so promising digest frequency
 *     would be a claim the system cannot keep.
 *
 * The trigger conditions are stated honestly on the page.
 */
export default async function TradeAlertsPage() {
  const user = await getUser();
  if (!user) {
    redirect('/login?next=/trade/alerts');
  }

  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader
          title="Price alerts"
          purpose="Price thresholds for the commodities you follow."
          breadcrumbs={[{ label: 'Trade Intelligence', href: '/trade' }, { label: 'Alerts' }]}
        />
        <EmptyState
          title="No market data is connected"
          description="Alerts are evaluated against published price observations. Without a configured database there is nothing to evaluate."
        />
      </>
    );
  }

  const supabase = await createClient();

  const [alertsResult, commodities, markets] = await Promise.all([
    supabase
      .from('price_alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    (await getDataSource()).listCommodities(),
    (await getDataSource()).listMarkets(),
  ]);

  const alerts = alertsResult.data ?? [];
  const commodityNames = new Map(commodities.map((c) => [c.id, c.name]));
  const marketNames = new Map(markets.map((m) => [m.id, m.name]));

  const active = alerts.filter((a) => a.is_active).length;

  return (
    <>
      <PageHeader
        title="Price alerts"
        purpose="Thresholds that notify you when a published price crosses a level you care about."
        breadcrumbs={[{ label: 'Trade Intelligence', href: '/trade' }, { label: 'Alerts' }]}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel
            title="Your alerts"
            description="Each alert is evaluated against published, verified observations only."
          >
            {alerts.length === 0 ? (
              <EmptyState
                title="No alerts configured"
                description="An alert notifies you when a published price for a commodity or market crosses a threshold you set. Configure one from a commodity's terminal page."
                action={{ label: 'Browse commodities', href: '/commodities' }}
              />
            ) : (
              <ul className="space-y-2.5">
                {alerts.map((alert) => {
                  const commodityName = alert.commodity_id
                    ? commodityNames.get(alert.commodity_id as number)
                    : null;
                  const marketName = alert.market_id
                    ? marketNames.get(alert.market_id as number)
                    : null;
                  return (
                    <li
                      key={alert.id as number}
                      className="rounded-lg border border-ink-200 p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink-900">
                            {commodityName ?? marketName ?? 'Unknown target'}
                            {commodityName && marketName ? ` · ${marketName}` : ''}
                          </p>
                          <p className="mt-0.5 text-[11px] text-ink-600">
                            {describeThreshold(alert)}
                          </p>
                        </div>
                        <Pill tone={alert.is_active ? 'success' : 'neutral'}>
                          {alert.is_active ? 'active' : 'paused'}
                        </Pill>
                      </div>
                      <p className="mt-2 text-[11px] text-ink-500">
                        Delivered by {String(alert.channel)}
                        {alert.last_triggered_at
                          ? ` · last triggered ${new Date(
                              String(alert.last_triggered_at),
                            ).toLocaleDateString('en-NG')}`
                          : ' · not triggered yet'}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="How alerts are evaluated">
            <ul className="space-y-2 text-[11px] leading-relaxed text-ink-600">
              <li>
                An alert is checked against a <span className="font-semibold">published</span>{' '}
                observation. Draft, rejected and unpublished prices never trigger one.
              </li>
              <li>
                A threshold is compared only within the same price type, grade,
                unit and currency, so a change of unit cannot look like a price
                move.
              </li>
              <li>
                An alert states the price that triggered it, the date it was
                recorded, and the market it came from.
              </li>
            </ul>
          </Panel>

          <Panel title="What is not offered">
            <p className="text-[11px] leading-relaxed text-ink-600">
              There is no alert for a &ldquo;new opportunity&rdquo;. An
              opportunity requires a commercial offer, and an offer is a private
              commitment between two named parties rather than a market fact —
              so such an alert would fire on ordinary market variation rather
              than on something a trader can act on.
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-ink-600">
              Digest frequency is not configurable, because the platform has no
              notification scheduler. Alerts are delivered through the channel
              shown, when the condition is met.
            </p>
          </Panel>

          <Panel title="Status">
            <dl className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <dt className="text-ink-600">Alerts configured</dt>
                <dd className="font-bold tabular-nums text-ink-900">{alerts.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-600">Active</dt>
                <dd className="font-bold tabular-nums text-ink-900">{active}</dd>
              </div>
            </dl>
          </Panel>
        </div>
      </div>
    </>
  );
}

function describeThreshold(alert: Record<string, unknown>): string {
  const direction = String(alert.direction ?? 'any');
  const amount = alert.threshold_amount as number | null;
  const percent = alert.threshold_percent as number | null;

  const parts: string[] = [];
  if (amount != null) parts.push(`₦${amount.toLocaleString('en-NG')}`);
  if (percent != null) parts.push(`${percent}%`);
  if (parts.length === 0) parts.push('any change');

  const verb =
    direction === 'above'
      ? 'rises above'
      : direction === 'below'
        ? 'falls below'
        : 'changes past';

  return `Notify when the price ${verb} ${parts.join(' or ')}`;
}

/** Kept so the import is used when the panel is extended. */
export const __priceComponent = Price;
