/**
 * FAOSTAT Data Ingestion Service
 *
 * Ingests production, supply/demand (Food Balance Sheets), and trade data
 * from the FAO Statistical Database (FAOSTAT).
 *
 * Source: Food and Agriculture Organization of the United Nations
 * API: https://fenixservices.fao.org/faostat/api/v1/en
 * License: CC BY-NC-SA 3.0 IGO — attribution required, non-commercial use
 *
 * This service transforms FAOSTAT data into our commodity intelligence
 * schema while preserving full provenance metadata.
 */

import { createClient } from '@/lib/supabase/server';
import { getEntitlements, hasEntitlement, type EntitlementSet } from '@/lib/entitlements';
import type { IngestionResult, IngestionContext } from '../types';

// ── FAOSTAT Configuration ───────────────────────────────────────────────────

const FAOSTAT_API_BASE = 'https://fenixservices.fao.org/faostat/api/v1/en';

/**
 * Maps FAOSTAT item codes to our commodity slugs.
 * FAOSTAT uses numeric item codes — we maintain a mapping to our slug system.
 */
const FAOSTAT_ITEM_MAP: Record<string, string> = {
  '27': 'rice',         // Rice, paddy
  '56': 'maize',        // Maize
  '125': 'sorghum',     // Sorghum
  '108': 'millet',      // Millet
  '116': 'cassava',     // Cassava
  '137': 'yam',         // Yams
  '236': 'plantain',    // Plantains and others
  '191': 'sweet_potato', // Sweet potatoes
  '255': 'groundnut',   // Groundnuts, with shell
  '267': 'soybean',     // Soybeans
  '203': 'cowpea',      // Cow peas, dry
  '289': 'sesame_seed', // Sesame seed
  '249': 'cotton',      // Cotton lint
  '661': 'cocoa',       // Cocoa beans
  '260': 'palm_oil',    // Palm oil
  '656': 'cashew',      // Cashew apples (approximation)
  '397': 'ginger',      // Ginger
  '197': 'garlic',      // Garlic
  '210': 'shea',        // Shea nuts (approximation)
  '817': 'hibiscus',    // Hibiscus (approximation)
};

/**
 * FAOSTAT element codes for different data types
 */
const FAOSTAT_ELEMENTS = {
  production: '5510',     // Production quantity
  yield: '5419',          // Yield
  area: '5312',           // Area harvested
  imports: '5610',        // Import Quantity
  exports: '5910',        // Export Quantity
  import_value: '5620',   // Import Value
  export_value: '5920',   // Export Value
};

/**
 * Country codes we track (West African focus + major trading partners)
 */
const COUNTRY_CODES = [
  'NGA', 'GHA', 'CIV', 'SEN', 'MLI', 'BFA', 'NER', 'BEN', 'TGO',
];

// ── API Client ──────────────────────────────────────────────────────────────

interface FAOSTATResponse {
  Code: string;
  Value: string;
  Year: string;
  [key: string]: string;
}

/**
 * Fetch data from FAOSTAT bulk download API.
 * Uses the CSV bulk download endpoint for reliability.
 */
async function fetchFAOSTATData(
  dataset: string,
  itemCodes: string[],
  elementCodes: string[],
  areaCodes: string[]
): Promise<FAOSTATResponse[]> {
  // FAOSTAT uses M49 country codes, not ISO alpha-3
  // We'll use the area parameter with ISO codes and let the API handle conversion
  const items = itemCodes.join(',');
  const elements = elementCodes.join(',');
  const areas = areaCodes.join(',');

  const url = `${FAOSTAT_API_BASE}/data/${dataset}?area=${areas}&item=${items}&element=${elements}&year=*&show_codes=true&null_values=false&output_type=objects`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(60000), // 60 second timeout
    });

    if (!response.ok) {
      throw new Error(`FAOSTAT API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch FAOSTAT data: ${message}`);
  }
}

/**
 * Convert ISO 3166-1 alpha-3 to FAOSTAT M49 country code
 * (Simplified mapping for West African countries we track)
 */
const ISO_TO_M49: Record<string, string> = {
  'NGA': '223',
  'GHA': '83',
  'CIV': '38',
  'SEN': '183',
  'MLI': '133',
  'BFA': '143',
  'NER': '153',
  'BEN': '147',
  'TGO': '193',
  'USA': '2',
  'CHN': '351',
  'IND': '356',
  'BRA': '21',
  'GBR': '229',
  'FRA': '231',
  'DEU': '276',
  'NLD': '163',
  'BEL': '255',
  'JPN': '110',
  'IDN': '101',
};

// ── Production Ingestion ────────────────────────────────────────────────────

export async function ingestFAOSTATProduction(
  context: IngestionContext
): Promise<IngestionResult> {
  // Check bulk entitlement before performing large-scale data ingestion
  const entitlements = await getEntitlements();
  if (!hasEntitlement(entitlements, 'bulk')) {
    return {
      records_fetched: 0,
      records_inserted: 0,
      records_updated: 0,
      records_skipped: 0,
      errors: ['Bulk data entitlement required for FAOSTAT production ingestion. Upgrade to Professional or Enterprise tier.'],
    };
  }

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
    const commodityMappings = await resolveCommodityMappings(supabase);

    // Fetch production data from FAOSTAT
    const itemCodes = Object.keys(FAOSTAT_ITEM_MAP);
    const m49Codes = Object.values(ISO_TO_M49);

    const rawData = await fetchFAOSTATData(
      'QCL', // Crops
      itemCodes,
      [FAOSTAT_ELEMENTS.production, FAOSTAT_ELEMENTS.yield, FAOSTAT_ELEMENTS.area],
      m49Codes
    );

    result.records_fetched = rawData.length;

    // Process and upsert records
    for (const record of rawData) {
      try {
        const faoItemCode = record.Item_Code;
        const commoditySlug = FAOSTAT_ITEM_MAP[faoItemCode];
        const commodity = commodityMappings[commoditySlug];

        if (!commodity) {
          result.records_skipped++;
          continue;
        }

        // Convert FAO area code back to ISO
        const m49Code = record.Area_Code;
        const isoCode = Object.entries(ISO_TO_M49).find(([, v]) => v === m49Code)?.[0];
        if (!isoCode) {
          result.records_skipped++;
          continue;
        }

        const year = parseInt(record.Year, 10);
        const elementCode = record.Element_Code;
        const value = parseFloat(record.Value);

        // Convert to metric tonnes (FAOSTAT production is in tonnes, yield in hg/ha)
        let production_mt: number | null = null;
        let yield_mt_per_ha: number | null = null;
        let harvested_area_ha: number | null = null;

        if (elementCode === FAOSTAT_ELEMENTS.production) {
          production_mt = value / 1000; // tonnes → metric tonnes (already same unit actually)
          production_mt = value; // FAOSTAT production is already in tonnes
        } else if (elementCode === FAOSTAT_ELEMENTS.yield) {
          // Yield in hg/ha → convert to mt/ha
          yield_mt_per_ha = value / 10000;
        } else if (elementCode === FAOSTAT_ELEMENTS.area) {
          harvested_area_ha = value; // Already in hectares
        }

        // Upsert production record
        const { error } = await supabase.from('commodity_production').upsert(
          {
            commodity_id: commodity.id,
            country_code: isoCode,
            year,
            production_quantity_mt: production_mt,
            yield_mt_per_ha: yield_mt_per_ha,
            harvested_area_ha: harvested_area_ha,
            source_id: context.source_id,
            sync_event_id: context.sync_event_id,
            original_item_code: faoItemCode,
            original_element_code: elementCode,
            verification_status: 'imported',
          },
          {
            onConflict: 'commodity_id,country_code,year',
            ignoreDuplicates: false,
          }
        );

        if (error) {
          result.errors.push(`Year ${year}, ${isoCode}, ${commoditySlug}: ${error.message}`);
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
    result.errors.push(`FAOSTAT production ingestion failed: ${msg}`);
  }

  return result;
}

// ── Trade Ingestion ─────────────────────────────────────────────────────────

export async function ingestFAOSTATTrade(
  context: IngestionContext
): Promise<IngestionResult> {
  // Check bulk entitlement before performing large-scale data ingestion
  const entitlements = await getEntitlements();
  if (!hasEntitlement(entitlements, 'bulk')) {
    return {
      records_fetched: 0,
      records_inserted: 0,
      records_updated: 0,
      records_skipped: 0,
      errors: ['Bulk data entitlement required for FAOSTAT trade ingestion. Upgrade to Professional or Enterprise tier.'],
    };
  }

  const supabase = await createClient();
  const result: IngestionResult = {
    records_fetched: 0,
    records_inserted: 0,
    records_updated: 0,
    records_skipped: 0,
    errors: [],
  };

  try {
    const commodityMappings = await resolveCommodityMappings(supabase);
    const itemCodes = Object.keys(FAOSTAT_ITEM_MAP);
    const m49Codes = Object.values(ISO_TO_M49);

    // Fetch trade data (Trade - Crops)
    const rawData = await fetchFAOSTATData(
      'TCL', // Trade - Crops
      itemCodes,
      [FAOSTAT_ELEMENTS.imports, FAOSTAT_ELEMENTS.exports, FAOSTAT_ELEMENTS.import_value, FAOSTAT_ELEMENTS.export_value],
      m49Codes
    );

    result.records_fetched = rawData.length;

    for (const record of rawData) {
      try {
        const faoItemCode = record.Item_Code;
        const commoditySlug = FAOSTAT_ITEM_MAP[faoItemCode];
        const commodity = commodityMappings[commoditySlug];

        if (!commodity) {
          result.records_skipped++;
          continue;
        }

        const reporterM49 = record.Area_Code;
        const reporterIso = Object.entries(ISO_TO_M49).find(([, v]) => v === reporterM49)?.[0];
        if (!reporterIso) {
          result.records_skipped++;
          continue;
        }

        const year = parseInt(record.Year, 10);
        const elementCode = record.Element_Code;
        const value = parseFloat(record.Value);

        const isImport = elementCode === FAOSTAT_ELEMENTS.imports || elementCode === FAOSTAT_ELEMENTS.import_value;
        const isQuantity = elementCode === FAOSTAT_ELEMENTS.imports || elementCode === FAOSTAT_ELEMENTS.exports;
        const isValue = elementCode === FAOSTAT_ELEMENTS.import_value || elementCode === FAOSTAT_ELEMENTS.export_value;

        if (!isQuantity) {
          // Skip value records for now — we focus on quantity
          result.records_skipped++;
          continue;
        }

        const quantityMt = value / 1000; // Convert to metric tonnes

        // For FAOSTAT trade data, we don't have partner country from this endpoint
        // Use the reporter as both (self-trade placeholder) — real partner data
        // requires the bilateral trade endpoint
        const { error } = await supabase.from('commodity_trade').insert({
          commodity_id: commodity.id,
          flow_type: isImport ? 'import' : 'export',
          reporter_country: reporterIso,
          partner_country: 'ROW', // Rest of World (aggregate)
          year,
          quantity_mt: quantityMt,
          value_usd: null,
          source_id: context.source_id,
          sync_event_id: context.sync_event_id,
          verification_status: 'imported',
        });

        if (error) {
          result.errors.push(`Trade ${year}, ${reporterIso}: ${error.message}`);
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
    result.errors.push(`FAOSTAT trade ingestion failed: ${msg}`);
  }

  return result;
}

// ── Utility Functions ───────────────────────────────────────────────────────

interface CommodityMapping {
  id: number;
  name: string;
  slug: string;
}

async function resolveCommodityMappings(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never
): Promise<Record<string, CommodityMapping>> {
  const slugs = Object.values(FAOSTAT_ITEM_MAP);
  const uniqueSlugs = [...new Set(slugs)];

  const { data, error } = await supabase
    .from('commodities')
    .select('id, name, slug')
    .in('slug', uniqueSlugs);

  if (error) {
    throw new Error(`Failed to resolve commodity mappings: ${error.message}`);
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
 * Get the full FAOSTAT item code mapping for display/configuration
 */
export function getFAOSTATItemMap(): Record<string, string> {
  return { ...FAOSTAT_ITEM_MAP };
}

/**
 * Get supported country codes
 */
export function getSupportedCountries(): string[] {
  return [...COUNTRY_CODES];
}
