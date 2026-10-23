import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAgent } from '@/lib/auth/guards';
import {
  getAgentCommodities,
  getAgentHome,
  getAgentUnits,
} from '@/lib/operations/agent';
import { CollectionFlow } from '@/components/agent/CollectionFlow';

export const metadata: Metadata = {
  title: 'Collect a price — Field collection',
  robots: { index: false, follow: false },
};

export default async function AgentCollectPage() {
  const profile = await requireAgent('/agent/collect');

  const [home, commodities, units] = await Promise.all([
    getAgentHome(profile.id),
    getAgentCommodities(),
    getAgentUnits(),
  ]);

  const markets = home.markets.map((market) => ({
    id: market.id,
    name: market.name,
    stateName: market.stateName,
  }));

  const commodityOptions = commodities.map((commodity) => ({
    id: commodity.id,
    name: commodity.name,
    inScope: commodity.inScope,
  }));

  const unitOptions = units.map((unit) => ({
    id: unit.id as number,
    code: unit.code as string,
    name: unit.name as string,
    isSpecific: Boolean(unit.is_specific),
  }));

  const tasks = home.tasksToday.map((task) => ({
    id: task.id,
    marketId: task.marketId,
    marketName: task.marketName,
    commodityIds: task.commodityIds,
    commodityNames: task.commodityNames,
    status: task.status,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink-950">Collect a price</h1>
        <p className="mt-0.5 text-sm text-ink-500">
          Six short steps. Your work is saved on this phone until it reaches the office.
        </p>
      </div>

      {markets.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          You do not have a market assigned, so there is nowhere to collect. Contact your
          supervisor. <Link href="/agent/home" className="font-semibold underline">Back to home</Link>
        </div>
      ) : (
        <CollectionFlow
          markets={markets}
          commodities={commodityOptions}
          units={unitOptions}
          tasks={tasks}
        />
      )}
    </div>
  );
}
