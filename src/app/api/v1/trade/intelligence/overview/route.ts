/**
 * GET /api/v1/trade/intelligence/overview
 * 
 * Overview statistics for Nigeria's international trade.
 * Returns aggregated trade data for dashboard display.
 */

import { z } from 'zod';
import { createApiHandler } from '@/lib/api/handler';
import { createClient } from '@/lib/supabase/server';

const querySchema = z.object({
  year_from: z.coerce.number().int().min(1990).max(2030).optional(),
  year_to: z.coerce.number().int().min(1990).max(2030).optional(),
  reporting_country: z.string().trim().length(3).default('NGA'),
});

export const GET = createApiHandler({
  query: querySchema,
  handler: async (ctx) => {
    const supabase = await createClient();

    // Get reporting country ID
    const { data: country } = await supabase
      .from('countries')
      .select('id, name, iso_alpha3')
      .eq('iso_alpha3', ctx.reporting_country)
      .single();

    if (!country) {
      return {
        success: false,
        error: `Country ${ctx.reporting_country} not found`,
      };
    }

    // Build base query
    let query = supabase
      .from('international_trade_records')
      .select('flow_type, trade_value_usd, quantity_kg, year, commodity_id, partner_country_id')
      .eq('reporting_country_id', country.id)
      .eq('validation_status', 'validated');

    if (ctx.year_from) {
      query = query.gte('year', ctx.year_from);
    }
    if (ctx.year_to) {
      query = query.lte('year', ctx.year_to);
    }

    const { data: records, error } = await query;
    if (error) {
      return {
        success: false,
        error: `Failed to query trade data: ${error.message}`,
      };
    }

    // Aggregate
    let total_exports = 0;
    let total_imports = 0;
    let export_records = 0;
    let import_records = 0;
    const commoditySet = new Set<number>();
    const partnerSet = new Set<number>();
    const yearSet = new Set<number>();

    for (const record of records ?? []) {
      const value = record.trade_value_usd ?? 0;
      yearSet.add(record.year);

      if (record.flow_type === 'export') {
        total_exports += value;
        export_records += 1;
      } else {
        total_imports += value;
        import_records += 1;
      }

      if (record.commodity_id) commoditySet.add(record.commodity_id);
      partnerSet.add(record.partner_country_id);
    }

    const years = Array.from(yearSet).sort();

    return {
      success: true,
      data: {
        reporting_country: {
          code: country.iso_alpha3,
          name: country.name,
        },
        summary: {
          total_records: (records ?? []).length,
          export_records,
          import_records,
          total_exports_usd: total_exports,
          total_imports_usd: total_imports,
          trade_balance_usd: total_exports - total_imports,
          partner_countries: partnerSet.size,
          commodities_traded: commoditySet.size,
          year_range: years.length > 0 ? { min: years[0], max: years[years.length - 1] } : null,
          data_years: years,
        },
      },
      meta: {
        generated_at: new Date().toISOString(),
        source: 'UN Comtrade',
        license: 'CC-BY-4.0',
      },
    };
  },
});
