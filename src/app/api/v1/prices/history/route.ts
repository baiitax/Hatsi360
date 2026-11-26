import { z } from 'zod';
import { createApiHandler } from '@/lib/api/handler';
import { errors } from '@/lib/api/response';
import { getDataSource } from '@/lib/data';
import { hasEntitlement, type EntitlementSet } from '@/lib/entitlements';
import type { ApiApplication } from '@/lib/api/auth';
import { buildSeries } from '@/lib/pricing';

/**
 * How far back each caller class may read.
 *
 * Before this limit existed the endpoint accepted any `start_date` and
 * returned the whole series, so "extended historical data" — the thing the
 * paid tiers are sold on — was free and unlimited. The window is enforced
 * here, on the server; the interface is not the control.
 */
const FREE_WINDOW_DAYS = 90;
const ENTITLED_WINDOW_DAYS = 3650;

function windowDaysFor(application: ApiApplication | null): number {
  if (!application) return FREE_WINDOW_DAYS;
  const set: EntitlementSet = application.entitlementSet;
  return hasEntitlement(set, 'bulk') ? ENTITLED_WINDOW_DAYS : FREE_WINDOW_DAYS;
}

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

    const windowDays = windowDaysFor(context.application);
    const entitled = windowDays > FREE_WINDOW_DAYS;

    // Resolve the effective range: an explicit request, or the largest window
    // the caller is entitled to, anchored on today.
    const endIso = context.end_date ? `${context.end_date}T23:59:59.999Z` : new Date().toISOString();
    const requestedStart = context.start_date
      ? Date.parse(`${context.start_date}T00:00:00.000Z`)
      : Date.parse(endIso) - windowDays * 86_400_000;

    if (!Number.isFinite(requestedStart)) {
      return errors.badRequest('start_date is not a valid date.');
    }

    const spanDays = (Date.parse(endIso) - requestedStart) / 86_400_000;
    if (spanDays > windowDays) {
      return errors.forbidden(
        `Historical prices are limited to the last ${windowDays} days on this access level` +
          (entitled ? '.' : `. Longer ranges require the "bulk" entitlement.`) +
          ' Narrow start_date, or request access.',
      );
    }

    const observations = await source.listObservationsForAnalysis({
      commodityId: commodity.id,
      marketId: market.id,
      collectedFrom: new Date(requestedStart).toISOString(),
      collectedTo: endIso,
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
