import { z } from 'zod';
import { createApiHandler } from '@/lib/api/handler';
import { errors } from '@/lib/api/response';
import { getDataSource } from '@/lib/data';
import { REPORTS, computeReport } from '@/lib/content/reports';
import { formatMoney } from '@/lib/money';

const querySchema = z.object({
  report: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * GET /api/v1/reports
 *
 * The published market intelligence reports, with their computed figures.
 *
 * The report *list* is public: the names, summaries and method notes are
 * published on the website and are not a premium capability. The computed
 * figures behind a report are the substance, and they are returned here as
 * they are on the page — the same numbers, computed the same way.
 *
 * Premium reports stored in `market_reports` with `is_premium = true` are not
 * exposed through this endpoint without the `reports` entitlement. The
 * database policy enforces that independently of this code.
 */
export const GET = createApiHandler({
  query: querySchema,
  handler: async (context) => {
    const source = await getDataSource();
    const [observations, units, markets, commodities] = await Promise.all([
      source.listObservationsForAnalysis({}),
      source.listUnits(),
      source.listMarkets(),
      source.listCommodities(),
    ]);

    const unitLabels = new Map(units.map((unit) => [unit.id, unit.code]));

    const requested = context.report
      ? REPORTS.filter((report) => report.slug === context.report)
      : REPORTS;

    if (context.report && requested.length === 0) {
      return errors.notFound(`Unknown report slug "${context.report}".`);
    }

    const page = requested.slice(context.offset, context.offset + context.limit);

    return {
      reports: page.map((report) => {
        const computed = computeReport(report, observations, {
          unitLabels,
          totalMarkets: markets.length,
          totalCommodities: commodities.length,
        });

        return {
          slug: report.slug,
          title: report.title,
          summary: report.summary,
          category: report.category,
          method: report.method,
          cadence: report.cadence,
          readingMinutes: report.readingMinutes,
          window: computed.windowLabel,
          observationCount: computed.observationCount,
          figures: computed.figures,
          movements: computed.movements.map((movement) => ({
            commodity: movement.commodityName,
            commoditySlug: movement.commoditySlug,
            priceType: movement.priceType,
            unit: movement.unitLabel,
            currency: movement.currencyCode,
            firstAmount: movement.firstAmount,
            lastAmount: movement.lastAmount,
            firstDisplay: formatMoney(movement.firstAmount, {
              currency: movement.currencyCode,
            }),
            lastDisplay: formatMoney(movement.lastAmount, { currency: movement.currencyCode }),
            changePercent: movement.changePercent,
            observations: movement.observations,
            firstDay: movement.firstDay,
            lastDay: movement.lastDay,
          })),
          markets: computed.markets.map((row) => ({
            market: row.marketName,
            marketSlug: row.marketSlug,
            state: row.stateName,
            commodity: row.commodityName,
            priceType: row.priceType,
            unit: row.unitLabel,
            currency: row.currencyCode,
            medianAmount: row.median,
            medianDisplay: formatMoney(row.median, { currency: row.currencyCode }),
            observations: row.observations,
            latestDay: row.latestDay.slice(0, 10),
          })),
          thinCoverage: computed.thin,
        };
      }),
      pagination: {
        limit: context.limit,
        offset: context.offset,
        total: requested.length,
        totalPages: Math.max(1, Math.ceil(requested.length / context.limit)),
      },
      note:
        'Figures are computed at request time from published observations. Days with no published observation are gaps and are never interpolated.',
    };
  },
});
