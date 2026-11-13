import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAgent } from '@/lib/auth/guards';
import { getFieldMarkets, getFieldAssignments } from '@/lib/operations/field';
import { NewCollectionForm } from '@/components/agent/NewCollectionForm';

export const metadata: Metadata = {
  title: 'Start a collection — Field collection',
  robots: { index: false, follow: false },
};

/**
 * Start a collection.
 *
 * The market list is the agent's own coverage — the database refuses a
 * collection anywhere else, so there is nothing to choose that would fail
 * later. A task may be attached, which links the visit to the plan.
 */
export default async function NewCollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ market?: string; task?: string }>;
}) {
  const params = await searchParams;
  const profile = await requireAgent('/agent/collection/new');

  const [markets, assignments] = await Promise.all([
    getFieldMarkets(profile.id),
    getFieldAssignments(profile.id),
  ]);

  const activeMarkets = markets.filter((market) => market.assignmentStatus !== 'ended');
  const requestedMarketId = Number(params.market);
  const preselectedMarketId = activeMarkets.some((market) => market.id === requestedMarketId)
    ? requestedMarketId
    : null;

  const requestedTaskId = Number(params.task);
  const openTasks = assignments.filter(
    (task) =>
      task.status === 'open' ||
      task.status === 'in_progress' ||
      task.status === 'correction_required',
  );
  const preselectedTaskId = openTasks.some((task) => task.id === requestedTaskId)
    ? requestedTaskId
    : null;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold tracking-tight text-ink-950">Start a collection</h1>
        <p className="mt-0.5 text-sm text-ink-500">
          Choose the market you are at. The session you open will hold every commodity you record.
        </p>
      </header>

      {activeMarkets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-200 bg-white p-6 text-center">
          <p className="text-sm font-semibold text-ink-800">No market is assigned to you</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-500">
            A collection can only be opened at a market your supervisor has assigned to you.
          </p>
          <Link
            href="/agent/home"
            className="mt-3 inline-flex min-h-[44px] items-center rounded-xl border border-ink-200 bg-white px-4 py-2 text-sm font-bold text-ink-800"
          >
            Back to home
          </Link>
        </div>
      ) : (
        <NewCollectionForm
          markets={activeMarkets.map((market) => ({
            id: market.id,
            name: market.name,
            stateName: market.stateName,
            assignmentStatus: market.assignmentStatus,
            commodityCount: market.commodityCount,
          }))}
          tasks={openTasks.map((task) => ({
            id: task.id,
            marketId: task.marketId,
            marketName: task.marketName,
            dueOn: task.dueOn,
            commodityNames: task.commodityNames,
            expectedCount: task.expectedCount,
          }))}
          preselectedMarketId={preselectedMarketId}
          preselectedTaskId={preselectedTaskId}
        />
      )}
    </div>
  );
}
