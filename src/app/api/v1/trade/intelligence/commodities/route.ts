/**
 * GET /api/v1/trade/intelligence/commodities
 * 
 * Commodity trade data for Nigeria.
 * Returns aggregated trade by commodity with partner breakdowns.
 */

import { z } from 'zod';
import { createApiHandler } from '@/lib/api/handler';
import { createClient } from '@/lib/supabase/server';

const querySchema = z.object({
  flow_type: z.enum(['export', 'import']).optional(),
  year: z.coerce.number().int().min(1990).max(2030).optional(),
  reporting_country: z.string().trim().length(3).default('NGA'),
});

export const GET = createApiHandler({
  query: querySchema,
  handler: async (ctx) => {
    const supabase = await createClient();

    // Get reporting country
    const { data: country } = await supabase
      .from('countries')
      .select('id')
      .eq('iso_alpha3', ctx.reporting_country)
      .single();

    if (!country) {
      return { success: false, error: `Country ${ctx.reporting_country} not found` };
    }

    // Fetch records
    let query = supabase
      .from('international_trade_records')
      .select(`
        flow_type,
        trade_value_usd,
        quantity_kg,
        year,
        commodity:commodity_id(id, name, slug),
        hs_code:hs_code_id(code, description),
        partner_country:partner_country_id(id, name, iso_alpha3)
      `)
      .eq('reporting_country_id', country.id)
      .eq('validation_status', 'validated');

    if (ctx.flow_type) {
      query = query.eq('flow_type', ctx.flow_type);
    }
    if (ctx.year) {
      query = query.eq('year', ctx.year);
    }

    const { data: records, error } = await query;
    if (error) {
      return { success: false, error: `Query failed: ${error.message}` };
    }

    // Aggregate by commodity
    const commodityMap = new Map<number, {
      commodity: { id: number; name: string; slug: string };
      hs_code: string;
      export_value_usd: number;
      import_value_usd: number;
      export_quantity_kg: number;
      import_quantity_kg: number;
      export_records: number;
      import_records: number;
      export_partners: Map<number, { name: string; code: string; value: number }>;
      import_partners: Map<number, { name: string; code: string; value: number }>;
      years: Set<number>;
    }>();

    for (const record of records ?? []) {
      const commodity = (record as any).commodity;
      const hsCode = (record as any).hs_code;
      const partner = (record as any).partner_country;
      const commodityId = commodity.id as number;
      const value = record.trade_value_usd ?? 0;
      const quantity = record.quantity_kg ?? 0;
      const flowType = record.flow_type;

      if (!commodityMap.has(commodityId)) {
        commodityMap.set(commodityId, {
          commodity: commodity as { id: number; name: string; slug: string },
          hs_code: hsCode.code,
          export_value_usd: 0,
          import_value_usd: 0,
          export_quantity_kg: 0,
          import_quantity_kg: 0,
          export_records: 0,
          import_records: 0,
          export_partners: new Map(),
          import_partners: new Map(),
          years: new Set(),
        });
      }

      const entry = commodityMap.get(commodityId)!;
      entry.years.add(record.year);

      if (flowType === 'export') {
        entry.export_value_usd += value;
        entry.export_quantity_kg += quantity;
        entry.export_records += 1;

        const existing = entry.export_partners.get(partner.id);
        if (existing) {
          existing.value += value;
        } else {
          entry.export_partners.set(partner.id, {
            name: partner.name,
            code: partner.iso_alpha3,
            value,
          });
        }
      } else {
        entry.import_value_usd += value;
        entry.import_quantity_kg += quantity;
        entry.import_records += 1;

        const existing = entry.import_partners.get(partner.id);
        if (existing) {
          existing.value += value;
        } else {
          entry.import_partners.set(partner.id, {
            name: partner.name,
            code: partner.iso_alpha3,
            value,
          });
        }
      }
    }

    // Convert and format
    const commodities = Array.from(commodityMap.values()).map((entry) => {
      const topExportPartners = Array.from(entry.export_partners.values())
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      const topImportPartners = Array.from(entry.import_partners.values())
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      return {
        commodity: entry.commodity,
        hs_code: entry.hs_code,
        export_value_usd: entry.export_value_usd,
        import_value_usd: entry.import_value_usd,
        total_value_usd: entry.export_value_usd + entry.import_value_usd,
        trade_balance_usd: entry.export_value_usd - entry.import_value_usd,
        export_quantity_kg: entry.export_quantity_kg,
        import_quantity_kg: entry.import_quantity_kg,
        export_records: entry.export_records,
        import_records: entry.import_records,
        top_export_partners: topExportPartners,
        top_import_partners: topImportPartners,
        years: Array.from(entry.years).sort(),
      };
    }).sort((a, b) => b.total_value_usd - a.total_value_usd);

    return {
      success: true,
      data: {
        commodities,
        count: commodities.length,
      },
      meta: {
        generated_at: new Date().toISOString(),
        source: 'UN Comtrade',
        license: 'CC-BY-4.0',
      },
    };
  },
});
