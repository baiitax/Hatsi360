/**
 * GET /api/v1/trade/analytics/[code]
 * 
 * Get trade flow analytics for a country (yearly totals, top partners).
 */

import { z } from 'zod';
import { createApiHandler } from '@/lib/api/handler';
import { getTradeFlowAnalytics } from '@/lib/trade/flows';
import { getCountryByCode } from '@/lib/trade/geographic';

const querySchema = z.object({
  commodity: z.string().trim().max(100).optional(),
  year_from: z.coerce.number().int().min(1990).max(2030).optional(),
  year_to: z.coerce.number().int().min(1990).max(2030).optional(),
});

export const GET = createApiHandler({
  query: querySchema,
  handler: async (ctx) => {
    const code = Array.isArray(ctx.params.code) ? ctx.params.code[0] : ctx.params.code;
    if (!code) {
      return { error: 'Country code is required in the URL path.' };
    }

    // Resolve country
    const country = await getCountryByCode(code);
    if (!country) {
      return { error: `Country not found: ${code}` };
    }

    // Get analytics
    const analytics = await getTradeFlowAnalytics({
      countryId: country.id,
      commoditySlug: ctx.commodity,
      yearFrom: ctx.year_from,
      yearTo: ctx.year_to,
    });

    return analytics;
  },
});
