/**
 * FAOSTAT Trade Data Adapter
 * 
 * Phase 07 Stage 3: International Trade Data Engine
 * 
 * Fetches bilateral agricultural trade data from FAOSTAT Trade module.
 * FAOSTAT provides annual trade data for agricultural commodities by country pair.
 * 
 * API Documentation: https://www.fao.org/faostat/en/#data/T
 * Base URL: https://fenixservices.fao.org/faostat/api/v1/en/data/T
 */

import type { TradeDataRecord, TradeQueryParams, TradeDataSourceAdapter, ValidationResult, TradeDataSourceType } from '../types';
import { validateTradeRecords } from '../validators';

// FAOSTAT item codes mapped to our commodity slugs
const FAOSTAT_ITEM_MAP: Record<string, string> = {
  '27': 'rice',        // Rice
  '56': 'maize',       // Maize
  '15': 'wheat',       // Wheat
  '83': 'sesame',      // Sesame seed
  '220': 'groundnut',  // Groundnuts, with shell
  '234': 'soybean',    // Soybeans
  '656': 'cocoa',      // Cocoa beans
  '661': 'coffee',     // Coffee, green
  '687': 'tea',        // Tea
  '689': 'mate',       // Mate
  '692': 'pepper',     // Pepper (piper)
  '693': 'chilli',     // Chilli and pepper, green
  '698': 'vanilla',    // Vanilla
  '702': 'cinnamon',   // Cinnamon
  '711': 'cloves',     // Cloves
  '720': 'cotton',     // Cotton lint
  '723': 'flax',       // Fibre, flax, raw
  '731': 'jute',       // Fibre, jute
  '740': 'silk',       // Silk-worm cocoons
  '754': 'wool',       // Wool, greasy
  '817': 'cattle',     // Cattle
  '820': 'buffalo',    // Buffaloes
  '849': 'poultry',    // Chickens
  '867': 'hides',      // Hides, cattle, fresh
  '868': 'skins',      // Skins, sheep, with wool
  '873': 'milk',       // Milk, whole fresh cow
  '882': 'eggs',       // Eggs, hen, in shell
  '946': 'honey',      // Honey, natural
  '977': 'sugar',      // Sugar, raw centrifugal
  '1035': 'cotton_seed', // Cotton seed
  '1058': 'palm_oil',  // Oil, palm
  '1062': 'coconut_oil', // Oil, coconut
  '1073': 'olive_oil', // Oil, olive, virgin
  '1111': 'groundnut_oil', // Oil, groundnut
  '1120': 'soybean_oil', // Oil, soybean
  '1128': 'palm_kernel_oil', // Oil, palm kernel
  '1141': 'cottonseed_oil', // Oil, cottonseed
  '1145': 'sesame_oil', // Oil, sesame
  '1151': 'sunflower_oil', // Oil, sunflower
  '1158': 'rapeseed_oil', // Oil, rapeseed
};

// Reverse map for querying
const ITEM_CODE_BY_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(FAOSTAT_ITEM_MAP).map(([code, slug]) => [slug, code])
);

// Element codes for trade data
const ELEMENT_IMPORT = 5611; // Import Quantity (kg)
const ELEMENT_EXPORT = 5911; // Export Quantity (kg)
const ELEMENT_IMPORT_VALUE = 5612; // Import Value (1000 US$)
const ELEMENT_EXPORT_VALUE = 5912; // Export Value (1000 US$)

export class FAOSTATTradeAdapter implements TradeDataSourceAdapter {
  private baseUrl = 'https://fenixservices.fao.org/faostat/api/v1/en/data/T';

  getSourceType(): TradeDataSourceType {
    return 'faostat_trade';
  }

  /**
   * Fetch trade data from FAOSTAT
   * 
   * FAOSTAT Trade API parameters:
   * - area: Reporting country (M49 code)
   * - item: Commodity (FAOSTAT item code)
   * - element: Import/Export quantity or value
   * - year: Year(s)
   * - partner: Partner country (M49 code)
   */
  async fetchTradeData(params: TradeQueryParams): Promise<TradeDataRecord[]> {
    // Build query URL
    const queryParams = new URLSearchParams();
    queryParams.set('show_codes', 'true');
    queryParams.set('show_flags', 'true');
    queryParams.set('null_values', 'false');
    queryParams.set('bulk', 'false');

    // Add area filter
    if (params.reporting_country_code) {
      // Convert ISO alpha-3 to M49 numeric code
      const m49Code = this.isoToM49(params.reporting_country_code);
      if (m49Code) {
        queryParams.set('area', m49Code);
      }
    }

    // Add item filter
    if (params.commodity_slug) {
      const itemCode = ITEM_CODE_BY_SLUG[params.commodity_slug];
      if (itemCode) {
        queryParams.set('item', itemCode);
      }
    }

    // Add year filter
    if (params.year) {
      queryParams.set('year', params.year.toString());
    } else if (params.year_from && params.year_to) {
      // FAOSTAT doesn't support year ranges directly, need to fetch multiple years
      const years = [];
      for (let y = params.year_from; y <= params.year_to; y++) {
        years.push(y);
      }
      queryParams.set('year', years.join(','));
    }

    // Add element filter (import/export)
    const elements: number[] = [];
    if (!params.flow_type || params.flow_type === 'import') {
      elements.push(ELEMENT_IMPORT, ELEMENT_IMPORT_VALUE);
    }
    if (!params.flow_type || params.flow_type === 'export') {
      elements.push(ELEMENT_EXPORT, ELEMENT_EXPORT_VALUE);
    }
    queryParams.set('element', elements.join(','));

    const url = `${this.baseUrl}?${queryParams.toString()}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`FAOSTAT API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.transformData(data);
    } catch (error) {
      console.error('Failed to fetch FAOSTAT trade data:', error);
      throw error;
    }
  }

  /**
   * Transform FAOSTAT API response to canonical format
   */
  transformData(raw: any[]): TradeDataRecord[] {
    if (!raw || !Array.isArray(raw)) {
      return [];
    }

    const records: TradeDataRecord[] = [];

    for (const row of raw) {
      try {
        const record = this.transformRow(row);
        if (record) {
          records.push(record);
        }
      } catch (error) {
        console.warn('Failed to transform FAOSTAT row:', error, row);
      }
    }

    return records;
  }

  /**
   * Transform a single FAOSTAT row
   */
  private transformRow(row: any): TradeDataRecord | null {
    // Extract values
    const areaCode = row.AreaCode;
    const areaName = row.Area;
    const itemCode = row.ItemCode;
    const itemName = row.Item;
    const elementCode = row.ElementCode;
    const elementName = row.Element;
    const year = row.Year;
    const value = row.Value;
    const unit = row.Unit;

    // Determine flow type from element
    let flow_type: 'import' | 'export';
    if (elementCode === ELEMENT_IMPORT || elementCode === ELEMENT_IMPORT_VALUE) {
      flow_type = 'import';
    } else if (elementCode === ELEMENT_EXPORT || elementCode === ELEMENT_EXPORT_VALUE) {
      flow_type = 'export';
    } else {
      return null; // Unknown element
    }

    // Convert M49 code to ISO alpha-3
    const reporting_country_iso3 = this.m49ToIso(areaCode);
    if (!reporting_country_iso3) {
      return null; // Unknown country
    }

    // Map FAOSTAT item code to commodity slug
    const commodity_slug = FAOSTAT_ITEM_MAP[itemCode];
    if (!commodity_slug) {
      return null; // Unknown commodity
    }

    // Determine value type
    const isValue = elementCode === ELEMENT_IMPORT_VALUE || elementCode === ELEMENT_EXPORT_VALUE;
    const isQuantity = elementCode === ELEMENT_IMPORT || elementCode === ELEMENT_EXPORT;

    // Build record
    const record: TradeDataRecord = {
      reporting_country_iso3,
      partner_country_iso3: 'WLD', // FAOSTAT doesn't provide partner country in bulk data
      flow_type,
      commodity_slug,
      year,
      period_type: 'annual',
      source_code: 'faostat',
      source_dataset: 'Trade',
      retrieval_date: new Date().toISOString(),
    };

    // Set value or quantity
    if (isValue) {
      // FAOSTAT reports values in 1000 US$
      record.trade_value_usd = value * 1000;
    } else if (isQuantity) {
      // FAOSTAT reports quantities in kg (or tonnes for some items)
      if (unit === 'kg') {
        record.quantity_kg = value;
      } else if (unit === 'tonnes' || unit === 't') {
        record.quantity_kg = value * 1000;
      } else {
        record.quantity_kg = value; // Assume kg
      }
      record.quantity_unit_description = unit;
    }

    return record;
  }

  validateData(records: TradeDataRecord[]): ValidationResult[] {
    return validateTradeRecords(records);
  }

  /**
   * Convert ISO alpha-3 to M49 numeric code
   */
  private isoToM49(iso3: string): string | null {
    const mapping: Record<string, string> = {
      'NGA': '566',
      'GHA': '288',
      'KEN': '404',
      'ZAF': '710',
      'EGY': '818',
      'TZA': '834',
      'UGA': '800',
      'USA': '842',
      'CHN': '156',
      'IND': '356',
      'BRA': '76',
      'DEU': '276',
      'FRA': '250',
      'GBR': '826',
      'JPN': '392',
    };
    return mapping[iso3] || null;
  }

  /**
   * Convert M49 numeric code to ISO alpha-3
   */
  private m49ToIso(m49: string | number): string | null {
    const mapping: Record<string, string> = {
      '566': 'NGA',
      '288': 'GHA',
      '404': 'KEN',
      '710': 'ZAF',
      '818': 'EGY',
      '834': 'TZA',
      '800': 'UGA',
      '842': 'USA',
      '156': 'CHN',
      '356': 'IND',
      '76': 'BRA',
      '276': 'DEU',
      '250': 'FRA',
      '826': 'GBR',
      '392': 'JPN',
    };
    return mapping[m49.toString()] || null;
  }
}

/**
 * Singleton instance
 */
export const faostatTradeAdapter = new FAOSTATTradeAdapter();
