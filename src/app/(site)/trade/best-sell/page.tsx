import { buildShareMetadata } from '@/lib/metadata';
import Link from 'next/link';
import { getDataSource } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getCommodityOpportunities } from '@/lib/trade/queries';
import {
  EmptyState,
  OpportunityDisclosure,
  PageHeader,
  Panel,
  Price,
} from '@/components/trade/Primitives';

export const metadata = buildShareMetadata({
  title: 'Best sell',
  path: '/trade/best-sell',
  description:
    'The markets where the highest verified price was recorded for each agricultural commodity, and how recent and how well supported that price is.',
});

export const dynamic = 'force-dynamic';

/**
 * Best sell — reframed.
 *
 * Brief §10 asks for a selling-opportunity engine built on verified buyer
 * procurement prices, processor purchase prices and exporter offers. None of
 * those exist in the schema. This page is the markets where the highest
 * verified price was *recorded*.
 *
 * Brief §10.1 states the rule directly: "Do not confuse a published wholesale
 * observation with a confirmed buyer commitment." The disclosure below is that
 * rule, rendered.
 */
export default async function TradeBestSellPage() {
  const configured = isSupabaseConfigured();
  const commodities = configured ? await (await getDataSource()).listCommodities() : [];

  const rows = configured
    ? await Promise.all(
        commodities.map(async (commodity) => {
          const result = await getCommodityOpportunities(commodity.id);
          return { commodity, result };
        }),
      )
    : [];

  const withData = rows.filter((row) => row.result.bestSell.best != null);

  return (
    <>
      <PageHeader
        title="Best sell"
        purpose="The markets where the highest verified price was recorded for each commodity, and how recent and how well supported that price is."
        breadcrumbs={[{ label: 'Trade Intelligence', href: '/trade' }, { label: 'Best sell' }]}
      />

      {!configured ? (
        <EmptyState
          title="No market data is connected"
          description="This page reads published price observations from the Hatsi360 database. Without a configured database there are no prices to rank."
        />
      ) : withData.length === 0 ? (
        <EmptyState
          title="No comparable published prices yet"
          description="A selling signal needs at least one published, verified observation for a commodity. None exists yet, so nothing is ranked and no figure is invented."
          action={{ label: 'See how prices are verified', href: '/methodology' }}
        />
      ) : (
        <>
          <div className="mb-4">
            <OpportunityDisclosure text={withData[0].result.bestSell.disclosure} />
          </div>

          <Panel
            title="Highest verified price by commodity"
            description="Ranked by the highest published observation. Prices are only compared within the same price type, grade, unit and currency."
          >
            <div className="-mx-4 overflow-x-auto px-4">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-ink-200 text-left text-[11px] uppercase tracking-wide text-ink-500">
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      Commodity
                    </th>
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      Market
                    </th>
                    <th scope="col" className="py-2 pr-3 text-right font-semibold">
                      Price
                    </th>
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      Price type
                    </th>
                    <th scope="col" className="py-2 pr-3 text-right font-semibold">
                      Recorded
                    </th>
                    <th scope="col" className="py-2 pr-3 text-right font-semibold">
                      Comparable markets
                    </th>
                    <th scope="col" className="py-2 text-right font-semibold">
                      Excluded
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {withData.map(({ commodity, result }) => {
                    const best = result.bestSell.best!;
                    return (
                      <tr
                        key={commodity.id}
                        className="border-b border-ink-100 last:border-0"
                      >
                        <td className="py-2.5 pr-3">
                          <Link
                            href={`/trade/terminal?commodity=${commodity.slug}`}
                            className="font-medium text-ink-900 hover:text-brand-700 hover:underline"
                          >
                            {commodity.name}
                          </Link>
                        </td>
                        <td className="py-2.5 pr-3 text-xs text-ink-700">
                          {best.marketName}
                        </td>
                        <td className="py-2.5 pr-3 text-right">
                          <Price amount={best.amount} className="font-semibold" />
                        </td>
                        <td className="py-2.5 pr-3 text-xs text-ink-600">
                          {result.bestSell.seriesKey?.priceType.replace(/_/g, ' ') ??
                            'unspecified'}
                        </td>
                        <td className="py-2.5 pr-3 text-right text-[11px] tabular-nums text-ink-500">
                          {new Date(best.collectedAt).toLocaleDateString('en-NG')}
                        </td>
                        <td className="py-2.5 pr-3 text-right text-xs tabular-nums text-ink-700">
                          {result.bestSell.candidates.length}
                        </td>
                        <td className="py-2.5 text-right text-xs tabular-nums text-ink-500">
                          {result.bestSell.excludedCount > 0
                            ? `${result.bestSell.excludedCount} not comparable`
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </>
  );
}
