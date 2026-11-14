import { createApiHandler } from '@/lib/api/handler';
import { getTradeBlocByCode } from '@/lib/trade/geographic';

/**
 * GET /api/v1/trade-blocs/[code]
 *
 * Fetch a single trade bloc by code, including its full membership list.
 */
export const GET = createApiHandler({
  handler: async (context) => {
    const code = Array.isArray(context.params.code)
      ? context.params.code[0]
      : context.params.code;

    if (!code) {
      return {
        error: 'invalid_code',
        message: 'Trade bloc code is required.',
      };
    }

    const bloc = await getTradeBlocByCode(code.toUpperCase());

    if (!bloc) {
      return {
        error: 'not_found',
        message: `No trade bloc found for code '${code}'.`,
      };
    }

    return {
      id: bloc.id,
      code: bloc.code,
      name: bloc.name,
      description: bloc.description,
      bloc_type: bloc.bloc_type,
      established_date: bloc.established_date,
      website: bloc.website,
      member_count: bloc.member_count,
      is_active: bloc.is_active,
      members: bloc.members.map((m) => ({
        country: {
          code: m.country.code,
          name: m.country.name,
          iso_alpha2: m.country.iso_alpha2,
          iso_alpha3: m.country.iso_alpha3,
        },
        membership_type: m.membership_type,
        join_date: m.join_date,
        status: m.status,
      })),
    };
  },
});
