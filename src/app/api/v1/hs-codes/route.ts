import { z } from 'zod';
import { createApiHandler } from '@/lib/api/handler';
import { getHSCodes, getClassificationStats } from '@/lib/trade/classification';

const querySchema = z.object({
  level: z.enum(['chapter', 'heading', 'subheading']).optional(),
  q: z.string().trim().max(120).optional(),
  is_agricultural: z.enum(['true', 'false']).optional(),
  is_industrial: z.enum(['true', 'false']).optional(),
  include_stats: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * GET /api/v1/hs-codes
 *
 * Search and browse the Harmonized System code hierarchy.
 * Returns codes from the current HS revision (HS 2022).
 */
export const GET = createApiHandler({
  query: querySchema,
  handler: async (context) => {
    const [result, stats] = await Promise.all([
      getHSCodes({
        level: context.level,
        search: context.q,
        isAgricultural: context.is_agricultural === 'true' ? true : context.is_agricultural === 'false' ? false : undefined,
        isIndustrial: context.is_industrial === 'true' ? true : context.is_industrial === 'false' ? false : undefined,
        limit: context.limit,
        offset: context.offset,
      }),
      context.include_stats === 'true' ? getClassificationStats() : Promise.resolve(null),
    ]);

    return {
      hs_codes: result.codes.map((c) => ({
        id: c.id,
        code: c.code,
        level: c.level,
        description: c.description,
        primary_unit: c.primary_unit,
        is_agricultural: c.is_agricultural,
        is_industrial: c.is_industrial,
      })),
      pagination: {
        limit: context.limit,
        offset: context.offset,
        total: result.total,
        totalPages: Math.max(1, Math.ceil(result.total / context.limit)),
      },
      ...(stats ? { classification_stats: stats } : {}),
    };
  },
});
