/**
 * GET /api/v1/tariffs/[code]
 * 
 * Get tariff schedules for a country, optionally filtered by HS code.
 */

import { z } from 'zod';
import { createApiHandler } from '@/lib/api/handler';
import { queryTariffs, getTariffStats, getMFNTariff, getAllTariffsForCode } from '@/lib/trade/tariffs';

const querySchema = z.object({
  hs_code: z.string().trim().max(10).optional(),
  tariff_type: z.enum(['mfn', 'bound', 'preferential', 'applied']).optional(),
  include_stats: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export const GET = createApiHandler({
  query: querySchema,
  handler: async (ctx) => {
    const code = Array.isArray(ctx.params.code) ? ctx.params.code[0] : ctx.params.code;
    if (!code) {
      return { error: 'Country code is required in the URL path.' };
    }

    // If a specific HS code is given, return full tariff breakdown
    if (ctx.hs_code) {
      const [tariffs, stats] = await Promise.all([
        queryTariffs({
          country_code: code,
          hs_code: ctx.hs_code,
          tariff_type: ctx.tariff_type,
          is_current: true,
          limit: ctx.limit,
          offset: ctx.offset,
        }),
        ctx.include_stats === 'true'
          ? getTariffStats({ countryCode: code })
          : Promise.resolve(null),
      ]);

      return {
        country_code: code,
        hs_code: ctx.hs_code,
        tariffs: tariffs.map((t) => ({
          id: t.id,
          tariff_type: t.tariff_type,
          rate_type: t.rate_type,
          rate_value: t.rate_value,
          rate_unit: t.rate_unit,
          trade_bloc: t.trade_bloc_name
            ? { code: t.trade_bloc_code, name: t.trade_bloc_name }
            : null,
          effective_date: t.effective_date,
          source: t.source_url,
        })),
        ...(stats ? { stats } : {}),
      };
    }

    // Otherwise return paginated tariff list
    const [tariffs, stats] = await Promise.all([
      queryTariffs({
        country_code: code,
        tariff_type: ctx.tariff_type,
        is_current: true,
        limit: ctx.limit,
        offset: ctx.offset,
      }),
      ctx.include_stats === 'true'
        ? getTariffStats({ countryCode: code })
        : Promise.resolve(null),
    ]);

    return {
      country_code: code,
      tariffs: tariffs.map((t) => ({
        id: t.id,
        hs_code: t.hs_code,
        hs_description: t.hs_description,
        tariff_type: t.tariff_type,
        rate_type: t.rate_type,
        rate_value: t.rate_value,
        rate_unit: t.rate_unit,
        trade_bloc: t.trade_bloc_name
          ? { code: t.trade_bloc_code, name: t.trade_bloc_name }
          : null,
        effective_date: t.effective_date,
      })),
      pagination: {
        limit: ctx.limit,
        offset: ctx.offset,
        total: tariffs.length,
      },
      ...(stats ? { stats } : {}),
    };
  },
});
