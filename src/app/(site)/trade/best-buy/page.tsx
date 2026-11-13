import { buildShareMetadata } from '@/lib/metadata';
import Link from 'next/link';
import { getDataSource } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getCommodityOpportunities } from '@/lib/trade/queries';
import { formatAge } from '@/lib/trade/freshness';
import {
  EmptyState,
  OpportunityDisclosure,
  PageHeader,
  Panel,
  Price,
} from '@/components/trade/Primitives';

export const metadata = buildShareMetadata({
  title: 'Best buy',
  path: '/trade/best-buy',
  description:
    'The markets where the lowest verified price was recorded for each agricultural commodity, with the observation date and data quality.',
});

export const dynamic = 'force-dynamic';

/**
 * Best buy — reframed.
 *
 * Brief §9 describes a buying-opportunity engine built on buyer procurement
 * offers. No offers exist in the schema, so this page cannot be that. It is
 * the markets where the lowest verified price was *recorded*.
 *
 * The difference is stated on the page itself, at the top, in the disclosure
 * the engine attaches to every result. Brief §9.3 also asks for a confidence
 * indicator based on data quality, freshness, source verification and sample
 * size — that is what the columns below are, rather than an invented score.
 */
export default async function TradeBestBuyPage() {
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

  const withData = rows.filter((row) => row.result.bestBuy.best != null);

  return (
    <>
      <PageHeader
        title="Best buy"
        purpose="The markets where the lowest verified price was recorded for each commodity, and how recent and how well supported that price is."
        breadcrumbs={[{ label: 'Trade Intelligence', href: '/trade' }, { label: 'Best buy' }]}
      />

      {!configured ? (
        <EmptyState
          title="No market data is connected"
          description="This page reads published price observations from the Hatsi360 database. Without a configured database there are no prices to rank."
        />
      ) : withData.length === 0 ? (
        <EmptyState
          title="No comparable published prices yet"
          description="A buying signal needs at least one published, verified observation for a commodity. None exists yet, so nothing is ranked and no figure is invented."
          action={{ label: 'See how prices are verified', href: '/methodology' }}
        />
      ) : (
        <>
          <div className="mb-4">
            <OpportunityDisclosure
              text={withData[0].result.bestBuy.disclosure}
            />
          </div>

          <Panel
            title="Lowest verified price by commodity"
            description="Ranked by the lowest published observation. Prices are only compared within the same price type, grade, unit and currency."
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
                    const best = result.bestBuy.best!;
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
                          {result.bestBuy.seriesKey?.priceType.replace(/_/g, ' ') ??
                            'unspecified'}
                        </td>
                        <td className="py-2.5 pr-3 text-right text-[11px] tabular-nums text-ink-500">
                          {formatAge({
                            ageMinutes: minutesSince(best.collectedAt),
                            isDayPrecisionOnly: true,
                          } as never)}
                        </td>
                        <td className="py-2.5 pr-3 text-right text-xs tabular-nums text-ink-700">
                          {result.bestBuy.candidates.length}
                        </td>
                        <td className="py-2.5 text-right text-xs tabular-nums text-ink-500">
                          {result.bestBuy.excludedCount > 0
                            ? `${result.bestBuy.excludedCount} not comparable`
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 border-t border-ink-100 pt-2 text-[11px] leading-relaxed text-ink-500">
              A row is only shown when a published, verified observation exists.
              Where observations were excluded, the reason is that they were not
              comparable — a different price type, grade, unit or currency, or an
              unpublished record.
            </p>
          </Panel>
        </>
      )}
    </>
  );
}

function minutesSince(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}
