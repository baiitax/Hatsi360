import { z } from 'zod';
import { createApiHandler } from '@/lib/api/handler';
import { getDataSource } from '@/lib/data';

const querySchema = z.object({
  category: z.string().trim().max(120).optional(),
  q: z.string().trim().max(120).optional(),
  with_prices: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * GET /api/v1/commodities
 *
 * The commodity catalogue with the markets currently reporting each commodity.
 */
export const GET = createApiHandler({
  query: querySchema,
  handler: async (context) => {
    const source = await getDataSource();
    const [commodities, categories] = await Promise.all([
      source.listCommodities(),
      source.listCategories(),
    ]);

    const categorySlug = context.category;
    const category = categorySlug
      ? categories.find((c) => c.slug === categorySlug)
      : undefined;

    const term = context.q?.toLowerCase();

    let rows = commodities;
    if (category) rows = rows.filter((c) => c.categoryId === category.id);
    if (term) {
      rows = rows.filter((c) =>
        [c.name, c.slug, ...(c.synonyms ?? [])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(term),
      );
    }
    if (context.with_prices === 'false') {
      rows = rows.filter((c) => (c.observationCount ?? 0) === 0);
    }

    const total = rows.length;
    const page = rows.slice(context.offset, context.offset + context.limit);

    return {
      commodities: page.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description,
        category: c.categorySlug
          ? { slug: c.categorySlug, name: c.categoryName }
          : null,
        synonyms: c.synonyms ?? [],
        marketsWithPrices: c.marketCount ?? 0,
        observationCount: c.observationCount ?? 0,
        latestObservationAt: c.latestObservationAt,
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
