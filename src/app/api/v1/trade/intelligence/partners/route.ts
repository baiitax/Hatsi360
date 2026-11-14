/**
 * GET /api/v1/trade/intelligence/partners
 * 
 * Partner country trade data for Nigeria.
 * Returns aggregated trade by partner country with commodity breakdowns.
 */

import { z } from 'zod';
import { createApiHandler } from '@/lib/api/handler';
import { createClient } from '@/lib/supabase/server';

const querySchema = z.object({
  flow_type: z.enum(['export', 'import']).optional(),
  year: z.coerce.number().int().min(1990).max(2030).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
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
        commodity:commodity_id(id, name),
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

    // Aggregate by partner
    const partnerMap = new Map<number, {
      partner_country: { id: number; name: string; iso_alpha3: string };
      export_value_usd: number;
      import_value_usd: number;
      export_quantity_kg: number;
      import_quantity_kg: number;
      records: number;
      commodities: Set<string>;
      top_commodity: string;
      top_commodity_value: number;
      years: Set<number>;
    }>();

    for (const record of records ?? []) {
      const partner = (record as any).partner_country;
      const commodity = (record as any).commodity;
      const partnerId = partner.id as number;
      const value = record.trade_value_usd ?? 0;
      const quantity = record.quantity_kg ?? 0;
      const flowType = record.flow_type;
      const commodityName = commodity?.name ?? 'Unknown';

      if (!partnerMap.has(partnerId)) {
        partnerMap.set(partnerId, {
          partner_country: partner as { id: number; name: string; iso_alpha3: string },
          export_value_usd: 0,
          import_value_usd: 0,
          export_quantity_kg: 0,
          import_quantity_kg: 0,
          records: 0,
          commodities: new Set(),
          top_commodity: '',
          top_commodity_value: 0,
          years: new Set(),
        });
      }

      const entry = partnerMap.get(partnerId)!;
      entry.records += 1;
      entry.commodities.add(commodityName);
      entry.years.add(record.year);

      if (flowType === 'export') {
        entry.export_value_usd += value;
        entry.export_quantity_kg += quantity;
      } else {
        entry.import_value_usd += value;
        entry.import_quantity_kg += quantity;
      }

      if (value > entry.top_commodity_value) {
        entry.top_commodity_value = value;
        entry.top_commodity = commodityName;
      }
    }

    // Convert and sort
    const partners = Array.from(partnerMap.values())
      .map((entry) => ({
        ...entry,
        commodities: Array.from(entry.commodities),
        years: Array.from(entry.years).sort(),
        total_value_usd: entry.export_value_usd + entry.import_value_usd,
        trade_balance_usd: entry.export_value_usd - entry.import_value_usd,
      }))
      .sort((a, b) => b.total_value_usd - a.total_value_usd)
      .slice(0, ctx.limit);

    return {
      success: true,
      data: {
        partners,
        count: partners.length,
      },
      meta: {
        generated_at: new Date().toISOString(),
        source: 'UN Comtrade',
        license: 'CC-BY-4.0',
      },
    };
  },
});
