/**
 * UN Comtrade Data Ingestion Script
 * 
 * Fetches real agricultural trade data from UN Comtrade public API
 * and ingests it into the international_trade_records table.
 * 
 * Focus: Nigeria's agricultural imports/exports for priority commodities
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// UN Comtrade commodity codes for priority agricultural products
const COMMODITY_CODES = {
  '1006': 'rice',        // Rice
  '1005': 'maize',       // Maize
  '1001': 'wheat',       // Wheat
  '1201': 'soybeans',    // Soybeans
  '1207': 'sesame',      // Sesame seeds
  '1202': 'groundnuts',  // Groundnuts
  '0904': 'pepper',      // Pepper (black/white)
  '0703': 'onions',      // Onions
  '0702': 'tomatoes',    // Tomatoes
  '0805': 'citrus',      // Citrus fruit
};

// Country code mappings (UN M49 to ISO3)
const COUNTRY_MAPPINGS: Record<string, string> = {
  '566': 'NGA', // Nigeria
  '288': 'GHA', // Ghana
  '404': 'KEN', // Kenya
  '710': 'ZAF', // South Africa
  '818': 'EGY', // Egypt
  '834': 'TZA', // Tanzania
  '800': 'UGA', // Uganda
  '156': 'CHN', // China
  '356': 'IND', // India
  '840': 'USA', // United States
  '76': 'BRA',  // Brazil
  '276': 'DEU', // Germany
  '250': 'FRA', // France
  '826': 'GBR', // United Kingdom
  '392': 'JPN', // Japan
  // Add more as needed
};

interface ComtradeRecord {
  refYear: number;
  reporterCode: number;
  flowCode: string;
  partnerCode: number;
  cmdCode: string;
  qty: number;
  qtyUnitCode: number;
  altQty: number;
  altQtyUnitCode: number;
  primaryValue: number;
  netWgt: number;
  grossWgt: number;
}

async function fetchComtradeData(
  reporterCode: number,
  cmdCode: string,
  flowCode: string,
  years: number[]
): Promise<ComtradeRecord[]> {
  const allRecords: ComtradeRecord[] = [];

  for (const year of years) {
    const url = `https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=${reporterCode}&period=${year}&cmdCode=${cmdCode}&flowCode=${flowCode}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`Failed to fetch ${url}: ${response.status}`);
        continue;
      }

      const data = await response.json();
      if (data.data && data.data.length > 0) {
        allRecords.push(...data.data);
      }
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
    }

    // Rate limiting - be respectful to the API
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return allRecords;
}

function mapFlowCode(flowCode: string): 'import' | 'export' {
  return flowCode === 'M' ? 'import' : 'export';
}

async function getCountryId(iso3: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('countries')
    .select('id')
    .eq('iso_alpha3', iso3)
    .single();

  if (error || !data) {
    console.warn(`Country not found: ${iso3}`);
    return null;
  }

  return data.id;
}

async function getCommodityId(slug: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('commodities')
    .select('id')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    console.warn(`Commodity not found: ${slug}`);
    return null;
  }

  return data.id;
}

async function getHsCodeId(hsCode: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('hs_codes')
    .select('id')
    .eq('code', hsCode)
    .single();

  if (error || !data) {
    console.warn(`HS code not found: ${hsCode}`);
    return null;
  }

  return data.id;
}

async function getEvidenceSourceId(): Promise<number | null> {
  const { data, error } = await supabase
    .from('evidence_sources')
    .select('id')
    .eq('code', 'un_comtrade')
    .single();

  if (error || !data) {
    console.error('Evidence source not found: un_comtrade');
    return null;
  }

  return data.id;
}

async function ingestTradeRecord(record: ComtradeRecord): Promise<boolean> {
  try {
    // Map country codes
    const reporterISO3 = COUNTRY_MAPPINGS[record.reporterCode.toString()];
    const partnerISO3 = COUNTRY_MAPPINGS[record.partnerCode.toString()];

    if (!reporterISO3 || !partnerISO3) {
      console.warn(`Missing country mapping for reporter ${record.reporterCode} or partner ${record.partnerCode}`);
      return false;
    }

    // Map commodity
    const commoditySlug = COMMODITY_CODES[record.cmdCode as keyof typeof COMMODITY_CODES];
    if (!commoditySlug) {
      console.warn(`Unknown commodity code: ${record.cmdCode}`);
      return false;
    }

    // Get database IDs
    const reportingCountryId = await getCountryId(reporterISO3);
    const partnerCountryId = await getCountryId(partnerISO3);
    const commodityId = await getCommodityId(commoditySlug);
    const hsCodeId = await getHsCodeId(record.cmdCode);
    const sourceId = await getEvidenceSourceId();

    if (!reportingCountryId || !partnerCountryId || !sourceId) {
      console.warn(`Missing required IDs for record:`, record);
      return false;
    }

    // Prepare record for insertion
    const tradeRecord = {
      reporting_country_id: reportingCountryId,
      partner_country_id: partnerCountryId,
      flow_type: mapFlowCode(record.flowCode),
      hs_code_id: hsCodeId,
      commodity_id: commodityId,
      year: record.refYear,
      period_type: 'annual' as const,
      trade_value_usd: record.primaryValue,
      quantity_kg: record.qty,
      net_weight_kg: record.netWgt,
      gross_weight_kg: record.grossWgt,
      valuation_method: 'cif', // Default for imports
      is_provisional: false,
      validation_status: 'validated' as const,
      source_id: sourceId,
      source_dataset: 'UN Comtrade',
      source_url: `https://comtrade.un.org/`,
      retrieval_date: new Date().toISOString(),
    };

    // Insert record
    const { error } = await supabase
      .from('international_trade_records')
      .insert(tradeRecord);

    if (error) {
      console.error('Insert error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error ingesting record:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting UN Comtrade data ingestion for Nigeria...\n');

  const reporterCode = 566; // Nigeria
  const years = [2018, 2019, 2020, 2021, 2022, 2023];
  const flows = ['M', 'X']; // M = imports, X = exports

  let totalFetched = 0;
  let totalInserted = 0;
  let totalSkipped = 0;

  // Fetch and ingest data for each commodity and flow
  for (const [cmdCode, commodityName] of Object.entries(COMMODITY_CODES)) {
    console.log(`\n📦 Processing ${commodityName} (HS ${cmdCode})...`);

    for (const flowCode of flows) {
      const flowType = mapFlowCode(flowCode);
      console.log(`  ${flowType === 'import' ? '📥 Imports' : '📤 Exports'}...`);

      const records = await fetchComtradeData(reporterCode, cmdCode, flowCode, years);
      console.log(`    Fetched ${records.length} records`);
      totalFetched += records.length;

      for (const record of records) {
        const success = await ingestTradeRecord(record);
        if (success) {
          totalInserted++;
        } else {
          totalSkipped++;
        }
      }
    }
  }

  console.log('\n✅ Ingestion complete!');
  console.log(`   Total fetched: ${totalFetched}`);
  console.log(`   Total inserted: ${totalInserted}`);
  console.log(`   Total skipped: ${totalSkipped}`);
}

main().catch(console.error);
