import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAgent } from '@/lib/auth/guards';
import { getFieldMarkets, priceTypeLabel } from '@/lib/operations/field';
import { formatDateTime } from '@/lib/money';
import {
  FieldCard,
  FieldDetailRow,
  FieldEmpty,
  FieldNote,
  FieldSection,
  FieldStatusPill,
} from '@/components/agent/FieldUi';

export const metadata: Metadata = {
  title: 'Market — Field collection',
  robots: { index: false, follow: false },
};

/**
 * One market, from the agent's side.
 *
 * Only markets the agent is assigned to are returned, so there is no way to
 * reach a market the agent has no business collecting in. The page shows the
 * coverage the agent is responsible for and the instructions for it — it
 * deliberately does not show the market's management records, which are not
 * the agent's to see.
 */
export default async function AgentMarketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireAgent('/agent/markets');

  const marketId = Number(id);
  if (!Number.isInteger(marketId) || marketId <= 0) notFound();

  const markets = await getFieldMarkets(profile.id);
  const market = markets.find((entry) => entry.id === marketId);
  if (!market) notFound();

  return (
    <div className="space-y-5">
      <nav aria-label="Breadcrumb">
        <Link href="/agent/markets" className="text-xs font-bold text-brand-700">
          ← Your markets
        </Link>
      </nav>

      <header>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-ink-950">{market.name}</h1>
            <p className="mt-0.5 text-sm text-ink-500">
              {market.stateName ?? 'Unknown state'}
              {market.zoneName ? ` · ${market.zoneName}` : ''}
            </p>
          </div>
          {market.assignmentStatus && market.assignmentStatus !== 'active' ? (
            <FieldStatusPill
              status={market.assignmentStatus}
              label={market.assignmentStatus === 'paused' ? 'Paused' : 'Ended'}
              tone="neutral"
            />
          ) : null}
        </div>
        {market.address ? <p className="mt-1 text-xs text-ink-500">{market.address}</p> : null}
      </header>

      {market.assignmentStatus === 'paused' ? (
        <FieldNote tone="warning" title="This assignment is paused">
          You can still open the market and review what you have collected, but new collections are
          on hold until your supervisor reactivates the assignment.
        </FieldNote>
      ) : null}

      {market.assignmentStatus === 'ended' ? (
        <FieldNote tone="warning" title="This assignment has ended">
          The market is no longer in your coverage. Your past collections here are kept.
        </FieldNote>
      ) : null}

      {market.assignmentStatus === 'active' ? (
        <Link
          href={`/agent/collection/new?market=${market.id}`}
          className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-brand-700 px-4 py-3 text-base font-bold text-white"
        >
          Collect at this market
        </Link>
      ) : null}

      <FieldSection title="Market details">
        <FieldCard>
          <dl>
            <FieldDetailRow label="Zone">{market.zoneName ?? 'not set'}</FieldDetailRow>
            <FieldDetailRow label="Frequency">
              <span className="capitalize">{market.frequency ?? 'not scheduled'}</span>
            </FieldDetailRow>
            {market.windowStart && market.windowEnd ? (
              <FieldDetailRow label="Collection window">
                {market.windowStart} – {market.windowEnd}
              </FieldDetailRow>
            ) : null}
            <FieldDetailRow label="Deadline">{market.deadlineTime ?? 'not set'}</FieldDetailRow>
            <FieldDetailRow label="Expected prices">
              {market.expectedObservations > 0 ? market.expectedObservations : 'not set'}
            </FieldDetailRow>
            <FieldDetailRow label="Evidence">
              {market.evidenceRequired ? 'Required' : 'Optional'}
            </FieldDetailRow>
            <FieldDetailRow label="Commodities in scope">{market.commodityCount}</FieldDetailRow>
            <FieldDetailRow label="Last collection">
              {market.lastCollectionAt ? formatDateTime(market.lastCollectionAt) : 'none recorded'}
            </FieldDetailRow>
            <FieldDetailRow label="Collected today">{market.collectedToday}</FieldDetailRow>
            <FieldDetailRow label="Open tasks">{market.openTaskCount}</FieldDetailRow>
          </dl>
        </FieldCard>
      </FieldSection>

      {market.collectionInstructions ? (
        <FieldSection title="Instructions">
          <FieldNote tone="info">{market.collectionInstructions}</FieldNote>
        </FieldSection>
      ) : null}

      {market.requiredPriceTypes.length > 0 ? (
        <FieldSection title="Price types collected here">
          <ul className="flex flex-wrap gap-1.5">
            {market.requiredPriceTypes.map((type) => (
              <li
                key={type}
                className="rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-semibold text-ink-800"
              >
                {priceTypeLabel(type)}
              </li>
            ))}
          </ul>
        </FieldSection>
      ) : null}

      {market.commodityNames.length > 0 ? (
        <FieldSection title="Commodities in scope">
          <ul className="flex flex-wrap gap-1.5">
            {market.commodityNames.map((name) => (
              <li
                key={name}
                className="rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-semibold text-ink-800"
              >
                {name}
              </li>
            ))}
          </ul>
        </FieldSection>
      ) : (
        <FieldSection title="Commodities in scope">
          <FieldEmpty
            title="No scope recorded"
            body="Your supervisor has not set the commodities collected at this market. You can still record any commodity in the catalogue here."
          />
        </FieldSection>
      )}
    </div>
  );
}
