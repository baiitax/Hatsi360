import { z } from 'zod';
import { createApiHandler } from '@/lib/api/handler';
import { errors } from '@/lib/api/response';
import { getDataSource } from '@/lib/data';
import { buildSeries } from '@/lib/pricing';

const querySchema = z
  .object({
    commodity: z.string().trim().min(1, 'commodity is required.').max(120),
    market: z.string().trim().min(1, 'market is required.').max(120),
    start_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'start_date must be YYYY-MM-DD.')
      .optional(),
    end_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'end_date must be YYYY-MM-DD.')
      .optional(),
  })
  .refine(
    (value) =>
      !value.start_date ||
      !value.end_date ||
      value.start_date <= value.end_date,
    { message: 'start_date must not be after end_date.' },
  );

/**
 * GET /api/v1/prices/history
 *
 * A daily price series for one commodity in one market.
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
    const market = markets.find((m) => m.slug === context.market);

    if (!commodity) {
      return errors.notFound(`Unknown commodity slug "${context.commodity}".`);
    }
    if (!market) {
      return errors.notFound(`Unknown market slug "${context.market}".`);
    }

    const observations = await source.listObservationsForAnalysis({
      commodityId: commodity.id,
      marketId: market.id,
      collectedFrom: context.start_date ? `${context.start_date}T00:00:00.000Z` : undefined,
      collectedTo: context.end_date ? `${context.end_date}T23:59:59.999Z` : undefined,
    });

    const series = buildSeries(observations);

    return {
      commodity: { slug: commodity.slug, name: commodity.name },
      market: { slug: market.slug, name: market.name, state: market.stateName },
      range: {
        start: context.start_date ?? series[0]?.date ?? null,
        end: context.end_date ?? series[series.length - 1]?.date ?? null,
      },
      series: series.map((point) => ({
        date: point.date,
        medianAmount: point.median,
        minAmount: point.min,
        maxAmount: point.max,
        observations: point.observations,
      })),
      observationCount: observations.length,
      calculationRule:
        'Each point is the median of that day\'s observations; minAmount and maxAmount are the observed range.',
    };
  },
});
