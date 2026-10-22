import { z } from 'zod';
import { createApiHandler } from '@/lib/api/handler';
import { errors } from '@/lib/api/response';
import { getDataSource } from '@/lib/data';
import { summariseByMarket } from '@/lib/pricing';

const querySchema = z
  .object({
    commodity: z.string().trim().min(1, 'commodity is required.').max(120),
    price_type: z
      .enum([
        'farmgate',
        'wholesale_asking',
        'wholesale_transaction',
        'retail',
        'processor_procurement',
        'export_buy',
        'export_sell',
        'indicative',
        'unspecified',
      ])
      .optional(),
    markets: z.string().trim().max(2000).optional(),
  })
  .refine(
    (value) => !value.markets || value.markets.split(',').every((m) => m.trim().length > 0),
    { message: 'markets must be a comma-separated list of market slugs.' },
  );

/**
 * GET /api/v1/prices/compare
 *
 * The same commodity, at the same price type, across markets.
 *
 * Only figures with compatible measurement units are compared. When the records
 * use different units the response says so explicitly and excludes them.
 */
export const GET = createApiHandler({
  query: querySchema,
  handler: async (context) => {
    const source = await getDataSource();
    const [commodities, markets] = await Promise.all([
      source.listCommodities(),
      source.listMarkets(),
    ]);

    const commodity = commodities.find((c) => c.slug === context.commodity);
    if (!commodity) {
      return errors.notFound(`Unknown commodity slug "${context.commodity}".`);
    }

    const requestedMarkets = context.markets
      ? context.markets
          .split(',')
          .map((slug) => slug.trim())
          .filter(Boolean)
      : undefined;

    const marketIds = requestedMarkets
      ? markets.filter((m) => requestedMarkets.includes(m.slug)).map((m) => m.id)
      : undefined;

    if (requestedMarkets && marketIds && marketIds.length !== requestedMarkets.length) {
      const known = new Set(markets.map((m) => m.slug));
      const unknown = requestedMarkets.filter((slug) => !known.has(slug));
      return errors.notFound(`Unknown market slug(s): ${unknown.join(', ')}.`);
    }

    const observations = await source.listObservationsForAnalysis({
      commodityId: commodity.id,
      marketId: marketIds?.[0],
      priceType: context.price_type,
    });

    const scoped = marketIds
      ? observations.filter((o) => marketIds.includes(o.marketId))
      : observations;

    const priceType = context.price_type ?? scoped[0]?.priceType;
    const typed = priceType ? scoped.filter((o) => o.priceType === priceType) : [];

    // Bucket by unit so only compatible units are compared.
    const unitBuckets = new Map<string, typeof typed>();
    for (const observation of typed) {
      const key = String(observation.reportedUnitId ?? 'none');
      const list = unitBuckets.get(key) ?? [];
      list.push(observation);
      unitBuckets.set(key, list);
    }

    const buckets = [...unitBuckets.entries()].sort((a, b) => b[1].length - a[1].length);
    const primary = buckets[0];
    const excluded = buckets.slice(1);

    const summaries = primary ? summariseByMarket(primary[1]) : [];

    // The spread is the lowest and highest median in the comparison — not the
    // first and last rows, which are ordered by market rather than by price.
    const byAmount = [...summaries].sort((a, b) => a.medianAmount - b.medianAmount);
    const spread =
      byAmount.length > 1
        ? {
            lowestMarket: byAmount[0]!.marketName,
            lowestAmount: byAmount[0]!.medianAmount,
            highestMarket: byAmount[byAmount.length - 1]!.marketName,
            highestAmount: byAmount[byAmount.length - 1]!.medianAmount,
            spreadAmount:
              byAmount[byAmount.length - 1]!.medianAmount - byAmount[0]!.medianAmount,
          }
        : null;

    return {
      commodity: { slug: commodity.slug, name: commodity.name },
      priceType,
      unit: primary
        ? {
            code: primary[1][0]?.unitCode ?? null,
            name: primary[1][0]?.unitName ?? null,
            recorded: primary[1].every((o) => o.unitIsSpecific !== false),
          }
        : null,
      comparisonRule:
        'Only observations sharing a commodity, price type and compatible measurement unit are compared.',
      prices: summaries.map((summary) => ({
        market: { slug: summary.marketSlug, id: summary.marketId, name: summary.marketName },
        state: summary.stateName,
        medianAmount: summary.medianAmount,
        latestAmount: summary.latestAmount,
        minAmount: summary.minAmount,
        maxAmount: summary.maxAmount,
        observationCount: summary.observationCount,
        currency: summary.currencyCode,
        windowStart: summary.windowStart,
        windowEnd: summary.windowEnd,
        isStale: summary.isStale,
      })),
      spread,
      excludedForUnitMismatch: excluded.map(([, list]) => ({
        unitCode: list[0]?.unitCode ?? null,
        observationCount: list.length,
        markets: Array.from(new Set(list.map((o) => o.marketName))),
      })),
    };
  },
});
