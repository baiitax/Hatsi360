/**
 * FAOSTAT Sync Edge Function
 *
 * Triggered manually or via cron to fetch and ingest FAOSTAT data.
 * Runs as a Supabase Edge Function for isolation and scheduled execution.
 *
 * Usage:
 *   POST https://<project>.supabase.co/functions/v1/sync-faostat
 *   Headers: Authorization: Bearer <service_role_key>
 *   Body: { "commodity_slugs": ["rice", "maize"], "years": [2020, 2021, 2022, 2023] }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FAOSTAT_API_BASE = 'https://fenixservices.fao.org/faostat/api/v1/en';

// FAOSTAT item code → commodity slug mapping
const FAOSTAT_ITEM_MAP: Record<string, string> = {
  '27': 'rice',
  '56': 'maize',
  '108': 'millet',
  '125': 'cassava',
  '137': 'yam',
  '236': 'plantain',
  '191': 'sweet_potato',
  '255': 'groundnut',
  '267': 'soybean',
  '203': 'cowpea',
  '289': 'sesame_seed',
  '249': 'cotton',
  '661': 'cocoa',
  '260': 'palm_oil',
  '397': 'ginger',
  '197': 'garlic',
};

// Reverse mapping: slug → FAOSTAT item code(s)
const SLUG_TO_ITEM_CODES: Record<string, string[]> = {};
for (const [code, slug] of Object.entries(FAOSTAT_ITEM_MAP)) {
  if (!SLUG_TO_ITEM_CODES[slug]) SLUG_TO_ITEM_CODES[slug] = [];
  if (!SLUG_TO_ITEM_CODES[slug].includes(code)) SLUG_TO_ITEM_CODES[slug].push(code);
}

// ISO alpha-3 → FAOSTAT M49 area code
const ISO_TO_M49: Record<string, string> = {
  'NGA': '223', 'GHA': '83', 'CIV': '38', 'SEN': '183', 'MLI': '133',
  'BFA': '143', 'NER': '153', 'BEN': '147', 'TGO': '193',
};

// FAOSTAT element codes
const ELEMENTS = {
  production: '5510',
  yield: '5419',
  area: '5312',
};

serve(async (req) => {
  try {
    // Authenticate
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const commoditySlugs = body.commodity_slugs || Object.keys(SLUG_TO_ITEM_CODES);
    const years = body.years || [2020, 2021, 2022, 2023, 2024];

    // Get or create source record
    const { data: source } = await supabase
      .from('evidence_sources')
      .select('id')
      .eq('code', 'faostat')
      .single();

    if (!source) {
      return new Response(JSON.stringify({ error: 'FAOSTAT source not found in evidence_sources' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create sync event
    const { data: syncEvent, error: syncError } = await supabase
      .from('source_sync_events')
      .insert({
        source_id: source.id,
        sync_type: 'api_fetch',
        status: 'running',
      })
      .select()
      .single();

    if (syncError) {
      return new Response(JSON.stringify({ error: syncError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Resolve commodity IDs
    const { data: commodities } = await supabase
      .from('commodities')
      .select('id, slug')
      .in('slug', commoditySlugs);

    const commodityMap = new Map(commodities?.map(c => [c.slug, c.id]) || []);

    // Build FAOSTAT API request
    const itemCodes = commoditySlugs
      .flatMap(slug => SLUG_TO_ITEM_CODES[slug] || [])
      .filter(Boolean);

    const areaCodes = Object.values(ISO_TO_M49);
    const yearRange = `${Math.min(...years)}-${Math.max(...years)}`;

    // Fetch production data
    const apiUrl = `${FAOSTAT_API_BASE}/data/QCL?area=${areaCodes.join(',')}&item=${itemCodes.join(',')}&element=${Object.values(ELEMENTS).join(',')}&year=${yearRange}&output_type=objects`;

    console.log(`Fetching FAOSTAT data: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      throw new Error(`FAOSTAT API returned ${response.status}`);
    }

    const rawData = await response.json();
    const records = Array.isArray(rawData) ? rawData : [];

    console.log(`Fetched ${records.length} records from FAOSTAT`);

    // Process and upsert records
    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Group by commodity + country + year
    const grouped = new Map<string, { production?: number; yield?: number; area?: number }>();

    for (const record of records) {
      const itemCode = String(record.Item_Code);
      const slug = FAOSTAT_ITEM_MAP[itemCode];
      if (!slug) { skipped++; continue; }

      const commodityId = commodityMap.get(slug);
      if (!commodityId) { skipped++; continue; }

      const areaCode = String(record.Area_Code);
      const isoCode = Object.entries(ISO_TO_M49).find(([_, m49]) => m49 === areaCode)?.[0];
      if (!isoCode) { skipped++; continue; }

      const year = parseInt(record.Year, 10);
      const elementCode = String(record.Element_Code);
      const value = parseFloat(record.Value);

      const key = `${commodityId}-${isoCode}-${year}`;
      if (!grouped.has(key)) grouped.set(key, {});
      const group = grouped.get(key)!;

      if (elementCode === ELEMENTS.production) group.production = value;
      else if (elementCode === ELEMENTS.yield) group.yield = value / 10000; // hg/ha → mt/ha
      else if (elementCode === ELEMENTS.area) group.area = value;
    }

    // Upsert grouped records
    for (const [key, data] of grouped.entries()) {
      const [commodityIdStr, isoCode, yearStr] = key.split('-');
      const commodityId = parseInt(commodityIdStr, 10);
      const year = parseInt(yearStr, 10);

      const { error } = await supabase.from('commodity_production').upsert({
        commodity_id: commodityId,
        country_code: isoCode,
        year,
        production_quantity_mt: data.production ?? null,
        yield_mt_per_ha: data.yield ?? null,
        harvested_area_ha: data.area ?? null,
        source_id: source.id,
        sync_event_id: syncEvent.id,
        verification_status: 'imported',
      }, {
        onConflict: 'commodity_id,country_code,year',
      });

      if (error) {
        errors.push(`${key}: ${error.message}`);
        skipped++;
      } else {
        inserted++;
      }
    }

    // Complete sync event
    await supabase
      .from('source_sync_events')
      .update({
        completed_at: new Date().toISOString(),
        status: errors.length > 0 ? 'partial' : 'completed',
        records_fetched: records.length,
        records_inserted: inserted,
        records_skipped: skipped,
        error_message: errors.length > 0 ? errors.slice(0, 10).join('; ') : null,
      })
      .eq('id', syncEvent.id);

    // Update source last_sync_at
    await supabase
      .from('evidence_sources')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', source.id);

    return new Response(JSON.stringify({
      success: true,
      sync_event_id: syncEvent.id,
      records_fetched: records.length,
      records_inserted: inserted,
      records_skipped: skipped,
      errors: errors.length,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('FAOSTAT sync error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
