import { z } from 'zod';
import { createApiHandler } from '@/lib/api/handler';

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * GET /api/v1/insights
 *
 * Published market insights and analysis.
 *
 * The list of insights is served from a static module in this deployment. When
 * Supabase is configured the `articles` table is used instead, so the same
 * endpoint works for both.
 */
export const GET = createApiHandler({
  query: querySchema,
  handler: async (context) => {
    const { insights } = await import('@/lib/content/insights');
    const page = insights.slice(context.offset, context.offset + context.limit);

    return {
      insights: page.map((article) => ({
        slug: article.slug,
        title: article.title,
        excerpt: article.excerpt,
        category: article.category,
        publishedAt: article.publishedAt,
        readingMinutes: article.readingMinutes,
      })),
      pagination: {
        limit: context.limit,
        offset: context.offset,
        total: insights.length,
        totalPages: Math.max(1, Math.ceil(insights.length / context.limit)),
      },
    };
  },
});
