import { z } from 'zod';
import { createApiHandler } from '@/lib/api/handler';
import { errors } from '@/lib/api/response';
import { getDataSource } from '@/lib/data';
import { summariseByMarket } from '@/lib/pricing';

const querySchema = z.object({
  commodity: z.string().trim().max(120).optional(),
  market: z.string().trim().max(120).optional(),
  state: z.string().trim().max(120).optional(),
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
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * GET /api/v1/prices/latest
 *
 * The latest published price per market, with the observation count and the
 * window the summary covers.
 */
export const GET = createApiHandler({
  query: querySchema,
  handler: async (context) => {
    const source = await getDataSource();
    const [commodities, markets, states] = await Promise.all([
      source.listCommodities(),
      source.listMarkets(),
      source.listStates(),
    ]);

    const commodity = context.commodity
      ? commodities.find((c) => c.slug === context.commodity)
      : undefined;
    const market = context.market ? markets.find((m) => m.slug === context.market) : undefined;
    const state = context.state ? states.find((s) => s.slug === context.state) : undefined;

    if (context.commodity && !commodity) {
      return errors.notFound(`Unknown commodity slug "${context.commodity}".`);
    }
    if (context.market && !market) {
      return errors.notFound(`Unknown market slug "${context.market}".`);
    }

    const observations = await source.listObservationsForAnalysis({
      commodityId: commodity?.id,
      marketId: market?.id,
      stateId: state?.id,
      priceType: context.price_type,
    });

    const summaries = summariseByMarket(observations);
    const total = summaries.length;
    const page = summaries.slice(context.offset, context.offset + context.limit);

    return {
      prices: page.map((summary) => ({
        commodity: { slug: summary.commoditySlug || undefined, id: summary.commodityId },
        commodityName: summary.commodityName,
        market: { slug: summary.marketSlug, id: summary.marketId },
        marketName: summary.marketName,
        state: summary.stateName,
        priceType: summary.priceType,
        unit: summary.unitCode
          ? { code: summary.unitCode, name: summary.unitName, recorded: summary.unitIsSpecific }
          : null,
        currency: summary.currencyCode,
        medianAmount: summary.medianAmount,
        latestAmount: summary.latestAmount,
        minAmount: summary.minAmount,
        maxAmount: summary.maxAmount,
        observationCount: summary.observationCount,
        windowStart: summary.windowStart,
        windowEnd: summary.windowEnd,
        latestCollectedAt: summary.latestCollectedAt,
        latestVerifiedAt: summary.latestVerifiedAt,
        isStale: summary.isStale,
        unitAmbiguous: summary.unitAmbiguous,
      })),
      pagination: {
        limit: context.limit,
        offset: context.offset,
        total,
        totalPages: Math.max(1, Math.ceil(total / context.limit)),
      },
      calculationRule:
        'medianAmount is the median of the underlying observations, rounded to 2 decimal places.',
    };
  },
});
