import { z } from 'zod';
import { createApiHandler } from '@/lib/api/handler';
import { getDataSource } from '@/lib/data';

const querySchema = z.object({
  state: z.string().trim().max(120).optional(),
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * GET /api/v1/markets
 *
 * The market directory with the observation counts for each market.
 */
export const GET = createApiHandler({
  query: querySchema,
  handler: async (context) => {
    const source = await getDataSource();
    const [markets, states] = await Promise.all([
      source.listMarkets(),
      source.listStates(),
    ]);

    const state = context.state ? states.find((s) => s.slug === context.state) : undefined;
    const term = context.q?.toLowerCase();

    let rows = markets;
    if (state) rows = rows.filter((m) => m.stateId === state.id);
    if (term) {
      rows = rows.filter((m) =>
        [m.name, m.stateName, m.description]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(term),
      );
    }

    const total = rows.length;
    const page = rows.slice(context.offset, context.offset + context.limit);

    return {
      markets: page.map((m) => ({
        id: m.id,
        slug: m.slug,
        name: m.name,
        description: m.description,
        address: m.address,
        state: { slug: m.stateSlug, name: m.stateName },
        country: m.countryCode,
        observationCount: m.observationCount ?? 0,
        latestObservationAt: m.latestObservationAt,
      })),
      pagination: {
        limit: context.limit,
        offset: context.offset,
        total,
        totalPages: Math.max(1, Math.ceil(total / context.limit)),
      },
    };
  },
});
