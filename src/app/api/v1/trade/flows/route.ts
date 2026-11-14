/**
 * GET /api/v1/trade/flows
 * 
 * Query international trade records.
 */

import { z } from 'zod';
import { createApiHandler } from '@/lib/api/handler';
import { queryTradeRecords, getTradeDataStats } from '@/lib/trade/flows';

const querySchema = z.object({
  reporter: z.string().trim().length(3).optional(),
  partner: z.string().trim().length(3).optional(),
  commodity: z.string().trim().max(100).optional(),
  hs_code: z.string().trim().max(10).optional(),
  flow: z.enum(['import', 'export']).optional(),
  year: z.coerce.number().int().min(1990).max(2030).optional(),
  year_from: z.coerce.number().int().min(1990).max(2030).optional(),
  year_to: z.coerce.number().int().min(1990).max(2030).optional(),
  min_value: z.coerce.number().nonnegative().optional(),
  validation: z.enum(['pending', 'validated', 'flagged', 'rejected']).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  include_stats: z.enum(['true', 'false']).optional(),
});

export const GET = createApiHandler({
  query: querySchema,
  handler: async (ctx) => {
    const [records, stats] = await Promise.all([
      queryTradeRecords({
        reporting_country_code: ctx.reporter,
        partner_country_code: ctx.partner,
        commodity_slug: ctx.commodity,
        hs_code: ctx.hs_code,
        flow_type: ctx.flow,
        year: ctx.year,
        year_from: ctx.year_from,
        year_to: ctx.year_to,
        min_value_usd: ctx.min_value,
        validation_status: ctx.validation,
        limit: ctx.limit,
        offset: ctx.offset,
      }),
      ctx.include_stats === 'true'
        ? getTradeDataStats({ countryCode: ctx.reporter })
        : Promise.resolve(null),
    ]);

    return {
      trade_records: records.map((r) => ({
        id: r.id,
        year: r.year,
        month: r.month,
        period_type: r.period_type,
        flow_type: r.flow_type,
        reporter: r.reporting_country,
        partner: r.partner_country,
        commodity: r.commodity
          ? { id: r.commodity.id, name: r.commodity.name, slug: r.commodity.slug }
          : null,
        hs_code: r.hs_code
          ? { code: r.hs_code.code, description: r.hs_code.description }
          : null,
        trade_value_usd: r.trade_value_usd,
        quantity_kg: r.quantity_kg,
        net_weight_kg: r.net_weight_kg,
        valuation_method: r.valuation_method,
        is_provisional: r.is_provisional,
        validation_status: r.validation_status,
        source: r.source ? { code: r.source.code, name: r.source.name } : null,
      })),
      pagination: {
        limit: ctx.limit,
        offset: ctx.offset,
        total: records.length,
      },
      ...(stats ? { stats } : {}),
    };
  },
});
