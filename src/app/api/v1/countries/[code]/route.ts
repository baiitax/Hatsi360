import { createApiHandler } from '@/lib/api/handler';
import { getCountryWithBlocs } from '@/lib/trade/geographic';

/**
 * GET /api/v1/countries/[code]
 *
 * Fetch a single country by its ISO code (2 or 3 letter) or country code,
 * including its trade bloc memberships.
 */
export const GET = createApiHandler({
  handler: async (context) => {
    const code = Array.isArray(context.params.code)
      ? context.params.code[0]
      : context.params.code;

    if (!code || code.length < 2 || code.length > 3) {
      return {
        error: 'invalid_code',
        message: 'Country code must be 2-3 characters (ISO alpha2/alpha3 or platform code).',
      };
    }

    const country = await getCountryWithBlocs(code.toUpperCase());

    if (!country) {
      return {
        error: 'not_found',
        message: `No country found for code '${code}'.`,
      };
    }

    return {
      id: country.id,
      code: country.code,
      name: country.name,
      iso_alpha2: country.iso_alpha2,
      iso_alpha3: country.iso_alpha3,
      iso_numeric: country.iso_numeric,
      continent: country.continent,
      region: country.region,
      subregion: country.subregion,
      currency: {
        code: country.currency_code,
        name: country.currency_name,
      },
      coordinates: {
        latitude: country.latitude,
        longitude: country.longitude,
      },
      calling_code: country.calling_code,
      population: country.population,
      gdp_usd: country.gdp_usd,
      who_region: country.who_region,
      un_m49: country.un_m49,
      trade_flags: {
        is_african: country.is_african,
        is_afcfta_member: country.is_afcfta_member,
        is_ecowas_member: country.is_ecowas_member,
      },
      trade_blocs: country.trade_blocs.map((b) => ({
        code: b.bloc_code,
        name: b.bloc_name,
        membership_type: b.membership_type,
        join_date: b.join_date,
        status: b.status,
      })),
    };
  },
});
