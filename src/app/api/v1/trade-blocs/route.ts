import { z } from 'zod';
import { createApiHandler } from '@/lib/api/handler';
import { getTradeBlocs } from '@/lib/trade/geographic';

const querySchema = z.object({
  include_members: z.enum(['true', 'false']).default('false'),
});

/**
 * GET /api/v1/trade-blocs
 *
 * List all active trade blocs with optional member counts.
 */
export const GET = createApiHandler({
  query: querySchema,
  handler: async (context) => {
    const blocs = await getTradeBlocs();

    return {
      trade_blocs: blocs.map((b) => ({
        id: b.id,
        code: b.code,
        name: b.name,
        description: b.description,
        bloc_type: b.bloc_type,
        established_date: b.established_date,
        website: b.website,
        member_count: b.member_count,
        is_active: b.is_active,
      })),
      total: blocs.length,
    };
  },
});
