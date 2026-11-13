import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAgent } from '@/lib/auth/guards';
import {
  getFieldSession,
  getFieldCommodities,
  getFieldUnits,
  getFieldGrades,
} from '@/lib/operations/field';
import { CollectionSession } from '@/components/agent/CollectionSession';

export const metadata: Metadata = {
  title: 'Collection session — Field collection',
  robots: { index: false, follow: false },
};

/**
 * One collection session.
 *
 * The session is read through the agent's own rows, so a session that
 * belongs to somebody else is not found at all. The commodity catalogue, the
 * units and the grades all come from the database — nothing about the
 * catalogue is hard-coded in the app.
 */
export default async function CollectionSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireAgent('/agent/collection');

  const batchId = Number(id);
  if (!Number.isInteger(batchId) || batchId <= 0) notFound();

  const session = await getFieldSession(profile.id, batchId);
  if (!session) notFound();

  const [commodities, units, grades] = await Promise.all([
    getFieldCommodities(session.marketId),
    getFieldUnits(),
    getFieldGrades(),
  ]);

  const market = await import('@/lib/operations/field').then((module) =>
    module.getFieldMarkets(profile.id),
  );
  const evidenceRequired =
    market.find((entry) => entry.id === session.marketId)?.evidenceRequired ?? false;

  return (
    <div className="space-y-5">
      <nav aria-label="Breadcrumb">
        <Link href="/agent/home" className="text-xs font-bold text-brand-700">
          ← Home
        </Link>
      </nav>

      <header>
        <h1 className="text-xl font-bold tracking-tight text-ink-950">{session.marketName}</h1>
        <p className="mt-0.5 text-sm text-ink-500">
          Collection session
          {session.taskDueOn ? ` · assignment due ${session.taskDueOn}` : ''}
        </p>
        <p className="mt-0.5 font-mono text-[11px] text-ink-400">{session.reference}</p>
      </header>

      <CollectionSession
        batchId={session.id}
        marketId={session.marketId}
        marketName={session.marketName}
        completed={Boolean(session.completedAt)}
        taskId={session.taskId}
        observations={session.observations}
        expectedCommodities={session.expectedCommodities}
        commodities={commodities.map((commodity) => ({
          id: commodity.id,
          name: commodity.name,
          inScope: commodity.inScope,
        }))}
        units={units.map((unit) => ({
          id: unit.id,
          code: unit.code,
          name: unit.name,
          isSpecific: unit.is_specific,
        }))}
        grades={grades.map((grade) => ({
          id: grade.id,
          name: grade.name,
          commodityId: grade.commodity_id,
        }))}
        evidenceRequired={evidenceRequired}
      />
    </div>
  );
}
