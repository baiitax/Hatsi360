/**
 * GET /api/v1/intelligence/production
 *
 * Query commodity production data. Returns records matching the
 * specified filters. All responses include provenance metadata.
 *
 * Query params:
 *   commodity_id, commodity_slug, country_code, year, year_from, year_to
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProductionData } from '@/lib/intelligence/service';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Require authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const query = {
      commodity_id: searchParams.get('commodity_id')
        ? parseInt(searchParams.get('commodity_id')!)
        : undefined,
      country_code: searchParams.get('country_code') ?? undefined,
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

    const data = await getProductionData(query);

    return NextResponse.json({
      count: data.length,
      data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
