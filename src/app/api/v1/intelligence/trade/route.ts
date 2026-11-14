/**
 * GET /api/v1/intelligence/trade
 *
 * Query commodity trade flow data. Returns import/export records
 * matching the specified filters.
 *
 * Query params:
 *   commodity_id, commodity_slug, flow_type, reporter_country,
 *   partner_country, year, year_from, year_to
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTradeData } from '@/lib/intelligence/service';
import type { TradeFlowType } from '@/lib/intelligence/types';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Require authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const flowType = searchParams.get('flow_type');
    const query = {
      commodity_id: searchParams.get('commodity_id')
        ? parseInt(searchParams.get('commodity_id')!)
        : undefined,
      flow_type: flowType as TradeFlowType | undefined,
      reporter_country: searchParams.get('reporter_country') ?? undefined,
      partner_country: searchParams.get('partner_country') ?? undefined,
      year: searchParams.get('year')
        ? parseInt(searchParams.get('year')!)
        : undefined,
      year_from: searchParams.get('year_from')
        ? parseInt(searchParams.get('year_from')!)
        : undefined,
      year_to: searchParams.get('year_to')
        ? parseInt(searchParams.get('year_to')!)
        : undefined,
      verified_only: searchParams.get('verified_only') === 'true',
    };

    // Resolve commodity slug to ID if provided
    if (searchParams.get('commodity_slug')) {
      const { data: commodity, error } = await supabase
        .from('commodities')
        .select('id')
        .eq('slug', searchParams.get('commodity_slug')!)
        .single();

      if (error || !commodity) {
        return NextResponse.json(
          { error: `Commodity not found: ${searchParams.get('commodity_slug')}` },
          { status: 404 }
        );
      }
      query.commodity_id = commodity.id;
    }

    const data = await getTradeData(query);

    return NextResponse.json({
      count: data.length,
      data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
