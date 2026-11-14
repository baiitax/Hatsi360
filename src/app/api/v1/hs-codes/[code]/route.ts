import { createApiHandler } from '@/lib/api/handler';
import { getHSCodeByCode, getCommoditiesForHSCode } from '@/lib/trade/classification';

/**
 * GET /api/v1/hs-codes/[code]
 *
 * Fetch a single HS code with its children and linked commodities.
 */
export const GET = createApiHandler({
  handler: async (context) => {
    const code = Array.isArray(context.params.code)
      ? context.params.code[0]
      : context.params.code;

    if (!code) {
      return {
        error: 'invalid_code',
        message: 'HS code is required.',
      };
    }

    const hsCode = await getHSCodeByCode(code);

    if (!hsCode) {
      return {
        error: 'not_found',
        message: `No HS code found for '${code}'.`,
      };
    }

    // Get linked commodities
    const withMappings = await getCommoditiesForHSCode(hsCode.id);

    return {
      id: hsCode.id,
      code: hsCode.code,
      level: hsCode.level,
      description: hsCode.description,
      primary_unit: hsCode.primary_unit,
      is_agricultural: hsCode.is_agricultural,
      is_industrial: hsCode.is_industrial,
      children: hsCode.children.map((c) => ({
        id: c.id,
        code: c.code,
        level: c.level,
        description: c.description,
      })),
      commodities: withMappings?.commodities ?? [],
    };
  },
});
