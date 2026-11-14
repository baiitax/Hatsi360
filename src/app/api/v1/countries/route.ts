import { z } from 'zod';
import { createApiHandler } from '@/lib/api/handler';
import { getCountries, getContinentList, getSubregionList, getRegionSummaries } from '@/lib/trade/geographic';

const querySchema = z.object({
  continent: z.string().trim().max(50).optional(),
  region: z.string().trim().max(50).optional(),
  subregion: z.string().trim().max(80).optional(),
  is_african: z.enum(['true', 'false']).optional(),
  is_afcfta: z.enum(['true', 'false']).optional(),
  is_ecowas: z.enum(['true', 'false']).optional(),
  q: z.string().trim().max(120).optional(),
  include_regions: z.enum(['true', 'false']).optional(),
  include_summaries: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * GET /api/v1/countries
 *
 * List countries with optional filtering by continent, region, and trade
 * bloc membership. Supports pagination and search.
 */
export const GET = createApiHandler({
  query: querySchema,
  handler: async (context) => {
    const [result, continents, subregions, summaries] = await Promise.all([
      getCountries({
        continent: context.continent,
        region: context.region,
        subregion: context.subregion,
        isAfrican: context.is_african === 'true' ? true : context.is_african === 'false' ? false : undefined,
        isAfCFTA: context.is_afcfta === 'true' ? true : context.is_afcfta === 'false' ? false : undefined,
        isECOWAS: context.is_ecowas === 'true' ? true : context.is_ecowas === 'false' ? false : undefined,
        search: context.q,
        limit: context.limit,
        offset: context.offset,
      }),
      context.include_regions === 'true' ? getContinentList() : Promise.resolve([]),
      context.include_regions === 'true'
        ? getSubregionList(context.continent)
        : Promise.resolve([]),
      context.include_summaries === 'true' ? getRegionSummaries() : Promise.resolve([]),
    ]);

    return {
      countries: result.countries.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        iso_alpha2: c.iso_alpha2,
        iso_alpha3: c.iso_alpha3,
        continent: c.continent,
        subregion: c.subregion,
        currency_code: c.currency_code,
        is_african: c.is_african,
        is_afcfta_member: c.is_afcfta_member,
        is_ecowas_member: c.is_ecowas_member,
        population: c.population,
        gdp_usd: c.gdp_usd,
      })),
      pagination: {
        limit: context.limit,
        offset: context.offset,
        total: result.total,
        totalPages: Math.max(1, Math.ceil(result.total / context.limit)),
      },
      ...(context.include_regions === 'true' ? { continents, subregions } : {}),
      ...(context.include_summaries === 'true' ? { region_summaries: summaries } : {}),
    };
  },
});
