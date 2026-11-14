/**
 * USDA Foreign Agricultural Service — PSD Online Ingestion
 *
 * Ingests Production, Supply, and Distribution (PSD) data from the
 * USDA Foreign Agricultural Service. PSD data provides comprehensive
 * supply/demand balance sheets for major commodities.
 *
 * Source: USDA FAS PSD Online (https://apps.fas.usda.gov/psdonline)
 * API: https://apps.fas.usda.gov/PSDOnlineDataServices
 * License: Public domain (US government work)
 *
 * PSD data is particularly valuable because it provides complete
 * supply/demand balance sheets (production + imports + beginning stocks
 * = total supply; domestic use + exports + ending stocks = total demand).
 */

import { createClient } from '@/lib/supabase/server';
import type { IngestionResult, IngestionContext } from '../types';

// ── USDA PSD Configuration ──────────────────────────────────────────────────

const USDA_PSD_API_BASE = 'https://apps.fas.usda.gov/PSDOnlineDataServices';

/**
 * Maps USDA commodity codes to our commodity slugs.
 * USDA uses a different coding system — we map their codes to our slugs.
 */
const USDA_COMMODITY_MAP: Record<string, string> = {
  '0421100': 'rice',          // Rice, Milled
  '0440000': 'maize',         // Corn
  '0463200': 'sorghum',       // Sorghum
  '0451120': 'cassava',       // Cassava
  '0442060': 'groundnut',     // Groundnuts
  '0432200': 'soybean',       // Soybeans
  '0442230': 'cowpea',        // Cowpeas (approximate match)
  '0423110': 'cotton',        // Cotton
  '0643000': 'cocoa',         // Cocoa
  '0922000': 'palm_oil',      // Palm Oil
  '0570000': 'sugar',         // Sugar (if we track it)
};

/**
 * USDA attribute codes for different PSD data elements
 */
const USDA_ATTRIBUTES = {
  production: '004',          // Production
  imports: '058',             // Imports
  exports: '058_exports',     // Exports (different attribute)
  domesticConsumption: '058_dom',  // Domestic Consumption
  beginningStocks: '005',     // Beginning Stocks
  endingStocks: '088',        // Ending Stocks
  totalSupply: '001',         // Total Supply
  totalUse: '002',            // Total Use (Domestic + Exports)
};

/**
 * ISO codes for countries USDA covers
 */
const USDA_COUNTRIES = [
  'NGA', 'GHA', 'CIV', 'SEN', 'MLI', 'BFA', 'NER', 'BEN', 'TGO',
  'USA', 'CHN', 'IND', 'BRA',  // Major trading partners
];

// ── API Client ──────────────────────────────────────────────────────────────

interface USDARecord {
  commodityCode: string;
  countryId: string;
  countryName: string;
  calendarYear: number;
  month: number;
  attributeId: string;
  attributeDescription: string;
  value: number;
  unitId: string;
  unitDescription: string;
}

async function fetchUSDAData(
  commodityCodes: string[],
  countryIds: string[]
): Promise<USDARecord[]> {
  // Build the API request for PSD data
  const params = new URLSearchParams({
    commodityCode: commodityCodes.join(','),
    countryCode: countryIds.join(','),
    marketYear: '2020,2021,2022,2023,2024', // Recent years
  });

  const url = `${USDA_PSD_API_BASE}/api/CommodityData?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'API_KEY': process.env.USDA_PSD_API_KEY || '',
      },
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      throw new Error(`USDA PSD API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch USDA PSD data: ${message}`);
  }
}

// ── Supply/Demand Ingestion ─────────────────────────────────────────────────

/**
 * Ingest USDA PSD data into supply and demand tables.
 * USDA PSD provides balance sheet data that maps to both supply and demand tables.
 */
export async function ingestUSDASupplyDemand(
  context: IngestionContext
): Promise<IngestionResult> {
  const supabase = await createClient();
  const result: IngestionResult = {
    records_fetched: 0,
    records_inserted: 0,
    records_updated: 0,
    records_skipped: 0,
    errors: [],
  };

  try {
    // Resolve commodity mappings
    const commodityMappings = await resolveUSDACommodityMappings(supabase);

    // Fetch PSD data
    const commodityCodes = Object.keys(USDA_COMMODITY_MAP);
    const rawData = await fetchUSDAData(commodityCodes, USDA_COUNTRIES);

    result.records_fetched = rawData.length;

    // Group records by commodity + country + year
    const grouped = groupByCommodityCountryYear(rawData);

    for (const [key, records] of Object.entries(grouped)) {
      try {
        const [commoditySlug, countryCode, yearStr] = key.split('|');
        const year = parseInt(yearStr, 10);
        const commodity = commodityMappings[commoditySlug];

        if (!commodity) {
          result.records_skipped++;
          continue;
        }

        // Extract values from grouped records
        const values = extractPSDValues(records);

        // Upsert supply record
        const { error: supplyError } = await supabase.from('commodity_supply').upsert({
          commodity_id: commodity.id,
          country_code: countryCode,
          year,
          domestic_production_mt: values.production,
          imports_mt: values.imports,
          beginning_stocks_mt: values.beginningStocks,
          total_supply_mt: values.totalSupply,
          source_id: context.source_id,
          sync_event_id: context.sync_event_id,
          verification_status: 'imported',
        }, {
          onConflict: 'commodity_id,country_code,year',
        });

        if (supplyError) {
          result.errors.push(`Supply ${key}: ${supplyError.message}`);
          result.records_skipped++;
        } else {
          result.records_inserted++;
        }

        // Upsert demand record
        const { error: demandError } = await supabase.from('commodity_demand').upsert({
          commodity_id: commodity.id,
          country_code: countryCode,
          year,
          exports_mt: values.exports,
          ending_stocks_mt: values.endingStocks,
          total_domestic_mt: values.domesticConsumption,
          total_demand_mt: values.totalUse,
          source_id: context.source_id,
          sync_event_id: context.sync_event_id,
          verification_status: 'imported',
        }, {
          onConflict: 'commodity_id,country_code,year',
        });

        if (demandError) {
          result.errors.push(`Demand ${key}: ${demandError.message}`);
          result.records_skipped++;
        } else {
          result.records_inserted++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(msg);
        result.records_skipped++;
      }
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    result.errors.push(`USDA PSD ingestion failed: ${msg}`);
  }

  return result;
}

// ── Utility Functions ───────────────────────────────────────────────────────

function groupByCommodityCountryYear(
  records: USDARecord[]
): Record<string, USDARecord[]> {
  const grouped: Record<string, USDARecord[]> = {};

  for (const record of records) {
    const commoditySlug = USDA_COMMODITY_MAP[record.commodityCode];
    if (!commoditySlug) continue;

    const key = `${commoditySlug}|${record.countryId}|${record.calendarYear}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(record);
  }

  return grouped;
}

interface PSDValues {
  production: number | null;
  imports: number | null;
  exports: number | null;
  beginningStocks: number | null;
  endingStocks: number | null;
  totalSupply: number | null;
  totalUse: number | null;
  domesticConsumption: number | null;
}

function extractPSDValues(records: USDARecord[]): PSDValues {
  const values: PSDValues = {
    production: null,
    imports: null,
    exports: null,
    beginningStocks: null,
    endingStocks: null,
    totalSupply: null,
    totalUse: null,
    domesticConsumption: null,
  };

  for (const record of records) {
    // USDA PSD values are typically in 1000 metric tonnes
    const valueInMt = record.value * 1000;

    // Map attribute description to our fields
    const desc = record.attributeDescription.toLowerCase();
    if (desc.includes('production')) values.production = valueInMt;
    else if (desc.includes('import')) values.imports = valueInMt;
    else if (desc.includes('export')) values.exports = valueInMt;
    else if (desc.includes('beginning') && desc.includes('stock')) values.beginningStocks = valueInMt;
    else if (desc.includes('ending') && desc.includes('stock')) values.endingStocks = valueInMt;
    else if (desc.includes('total') && desc.includes('supply')) values.totalSupply = valueInMt;
    else if (desc.includes('total') && desc.includes('use')) values.totalUse = valueInMt;
    else if (desc.includes('domestic') && desc.includes('consumption')) values.domesticConsumption = valueInMt;
  }

  return values;
}

interface CommodityMapping {
  id: number;
  name: string;
  slug: string;
}

async function resolveUSDACommodityMappings(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never
): Promise<Record<string, CommodityMapping>> {
  const slugs = [...new Set(Object.values(USDA_COMMODITY_MAP))];

  const { data, error } = await supabase
    .from('commodities')
    .select('id, name, slug')
    .in('slug', slugs);

  if (error) {
    throw new Error(`Failed to resolve USDA commodity mappings: ${error.message}`);
  }

  const mappings: Record<string, CommodityMapping> = {};
  for (const commodity of data ?? []) {
    mappings[commodity.slug] = {
      id: commodity.id,
      name: commodity.name,
      slug: commodity.slug,
    };
  }

  return mappings;
}

/**
 * Get the USDA commodity code mapping for display/configuration
 */
export function getUSDACommodityMap(): Record<string, string> {
  return { ...USDA_COMMODITY_MAP };
}
