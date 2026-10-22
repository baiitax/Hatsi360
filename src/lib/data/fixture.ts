/**
 * Fixture data source — serves the migrated legacy dataset.
 *
 * This is what runs when no Supabase project is configured. It contains only
 * records that were publicly published on https://liveprice.pluckagro.com,
 * reconstructed by `scripts/build_legacy_dataset.py`.
 *
 * Every record it returns is marked `legacy_unverified` and carries
 * `collectedAtPrecision: 'date'`, because the legacy system recorded neither a
 * verification trail nor a collection time of day.
 */

import legacy from '@/data/legacy/production-observations.json';
import {
  commodityCategories,
  commodityGrades,
  commoditySynonyms,
  commodityVarieties,
  commodities,
  countries,
  legacyCategoryMap,
  markets,
  measurementUnits,
  states,
} from '@/data/seed/reference-data';
import type {
  Commodity,
  CommodityCategory,
  Country,
  Market,
  MeasurementUnit,
  ObservationQuery,
  Paginated,
  PriceObservation,
  State,
} from '@/types/domain';
import type { DataSource, Provenance } from './source';

interface LegacyProvenanceFile {
  source: string;
  collected_at: string;
  collection_method: string;
  reconstruction_note: string;
  known_unknowns: string[];
  observed_count: number;
  date_range: [string, string];
  validation: { published_latest_values_checked: number; mismatches: unknown[] };
}

interface LegacyFile {
  _provenance: LegacyProvenanceFile;
  markets: { legacy_id: number; name: string; location: string; published_entry_count: number }[];
  commodities: {
    legacy_id: number;
    name: string;
    category: string;
    description: string;
    published_market_count: number;
  }[];
  observations: {
    legacy_market_id: number;
    legacy_commodity_id: number;
    collection_date: string;
    sequence: number;
    reported_amount: number;
    source_group: Record<string, number>;
  }[];
}

const file = legacy as unknown as LegacyFile;

const UNSPECIFIED_UNIT_ID = 8;

const marketByLegacyId = new Map(file.markets.map((m) => [m.legacy_id, m]));
const commodityByLegacyId = new Map(file.commodities.map((c) => [c.legacy_id, c]));

/** Internal id assigned to each legacy market, in the reference-data order. */
const marketIdByLegacyId = new Map<number, number>();
for (const m of markets) if (m.legacyId != null) marketIdByLegacyId.set(m.legacyId, m.id);
const commodityIdByLegacyId = new Map<number, number>();
for (const c of file.commodities) {
  const ref = commodities.find((x) => x.legacyId === c.legacy_id);
  if (ref) commodityIdByLegacyId.set(c.legacy_id, ref.id);
}

const stateById = new Map(states.map((s) => [s.id, s]));
const categoryById = new Map(commodityCategories.map((c) => [c.id, c]));
const unitById = new Map(measurementUnits.map((u) => [u.id, u]));

function buildObservations(): PriceObservation[] {
  const out: PriceObservation[] = [];
  for (const o of file.observations) {
    const marketId = marketIdByLegacyId.get(o.legacy_market_id);
    const commodityId = commodityIdByLegacyId.get(o.legacy_commodity_id);
    if (marketId == null || commodityId == null) continue;

    const market = markets.find((m) => m.id === marketId)!;
    const state = stateById.get(market.stateId)!;
    const commodity = commodities.find((c) => c.id === commodityId)!;
    const legacyCommodity = commodityByLegacyId.get(o.legacy_commodity_id)!;
    const unit = unitById.get(UNSPECIFIED_UNIT_ID)!;

    out.push({
      id: `legacy-m${marketId}-c${commodityId}-${o.collection_date}-${o.sequence}`,
      commodityId,
      marketId,
      varietyId: null,
      gradeId: null,
      priceType: 'unspecified',
      reportedAmount: o.reported_amount,
      reportedUnitId: UNSPECIFIED_UNIT_ID,
      packageWeightKg: null,
      normalizedAmount: null,
      normalizedUnitId: null,
      currencyCode: 'NGN',
      currencySymbol: '₦',
      collectedAt: `${o.collection_date}T00:00:00.000Z`,
      collectedAtPrecision: 'date',
      submittedAt: null,
      verifiedAt: null,
      publishedAt: `${o.collection_date}T00:00:00.000Z`,
      agentUserId: null,
      verificationStatus: 'legacy_unverified',
      notes: null,
      qualityFlags: ['unit_conversion_unverified', 'timestamp_inconsistent', 'legacy_unverified'],
      sourceSystem: 'legacy_import',
      sourceReference: `https://liveprice.pluckagro.com/market-detail.php?market_id=${o.legacy_market_id}&commodity_id=${o.legacy_commodity_id}`,
      commodityName: commodity.name,
      commoditySlug: commodity.slug,
      marketName: market.name,
      marketSlug: market.slug,
      stateName: state.name,
      stateSlug: state.slug,
      countryCode: 'NG',
      gradeName: null,
      varietyName: null,
      unitCode: unit.code,
      unitName: unit.name,
      unitDimension: unit.dimension,
      unitIsSpecific: unit.isSpecific,
    });

    void legacyCommodity;
  }
  return out;
}

const OBSERVATIONS = buildObservations();

function decorateMarkets(): Market[] {
  return markets.map((m) => {
    const state = stateById.get(m.stateId)!;
    const mine = OBSERVATIONS.filter((o) => o.marketId === m.id);
    const latest = mine.reduce<string | null>(
      (acc, o) => (acc == null || o.collectedAt > acc ? o.collectedAt : acc),
      null,
    );
    return {
      ...m,
      stateName: state.name,
      stateSlug: state.slug,
      countryName: 'Nigeria',
      countryCode: 'NG',
      marketZoneName: null,
      latestObservationAt: latest,
      observationCount: mine.length,
    };
  });
}

function decorateCommodities(): Commodity[] {
  return commodities.map((c) => {
    const category = categoryById.get(c.categoryId);
    const mine = OBSERVATIONS.filter((o) => o.commodityId === c.id);
    const latest = mine.reduce<string | null>(
      (acc, o) => (acc == null || o.collectedAt > acc ? o.collectedAt : acc),
      null,
    );
    return {
      ...c,
      categoryName: category?.name ?? null,
      categorySlug: category?.slug ?? null,
      synonyms: commoditySynonyms[c.slug] ?? [],
      marketCount: new Set(mine.map((o) => o.marketId)).size,
      latestObservationAt: latest,
      observationCount: mine.length,
    };
  });
}

const MARKET_ROWS = decorateMarkets();
const COMMODITY_ROWS = decorateCommodities();

function matchesSearch(o: PriceObservation, term: string): boolean {
  const q = term.toLowerCase();
  const commodity = COMMODITY_ROWS.find((c) => c.id === o.commodityId);
  const market = MARKET_ROWS.find((m) => m.id === o.marketId);
  const haystack = [
    commodity?.name,
    commodity?.slug,
    ...(commodity?.synonyms ?? []),
    market?.name,
    o.stateName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

function applyFilters(query: ObservationQuery): PriceObservation[] {
  let rows = OBSERVATIONS.slice();

  if (query.commodityId != null) rows = rows.filter((o) => o.commodityId === query.commodityId);
  if (query.marketId != null) rows = rows.filter((o) => o.marketId === query.marketId);
  if (query.priceType) rows = rows.filter((o) => o.priceType === query.priceType);
  if (query.gradeId != null) rows = rows.filter((o) => o.gradeId === query.gradeId);
  if (query.varietyId != null) rows = rows.filter((o) => o.varietyId === query.varietyId);
  if (query.stateId != null) {
    const marketIds = new Set(MARKET_ROWS.filter((m) => m.stateId === query.stateId).map((m) => m.id));
    rows = rows.filter((o) => marketIds.has(o.marketId));
  }
  if (query.categoryId != null) {
    const commodityIds = new Set(
      COMMODITY_ROWS.filter((c) => c.categoryId === query.categoryId).map((c) => c.id),
    );
    rows = rows.filter((o) => commodityIds.has(o.commodityId));
  }
  if (query.collectedFrom) rows = rows.filter((o) => o.collectedAt >= query.collectedFrom!);
  if (query.collectedTo) rows = rows.filter((o) => o.collectedAt <= query.collectedTo!);
  if (query.search) rows = rows.filter((o) => matchesSearch(o, query.search!));

  return rows;
}

function sortRows(rows: PriceObservation[], sort: ObservationQuery['sort']): PriceObservation[] {
  const copy = [...rows];
  switch (sort) {
    case 'price_asc':
      copy.sort((a, b) => (a.reportedAmount ?? 0) - (b.reportedAmount ?? 0));
      break;
    case 'price_desc':
      copy.sort((a, b) => (b.reportedAmount ?? 0) - (a.reportedAmount ?? 0));
      break;
    case 'commodity':
      copy.sort((a, b) => (a.commodityName ?? '').localeCompare(b.commodityName ?? ''));
      break;
    case 'market':
      copy.sort((a, b) => (a.marketName ?? '').localeCompare(b.marketName ?? ''));
      break;
    case 'recent':
    default:
      copy.sort((a, b) => b.collectedAt.localeCompare(a.collectedAt));
  }
  return copy;
}

export const fixtureSource: DataSource = {
  kind: 'fixture',
  isMigrated: true,

  async listCountries() {
    return countries;
  },
  async listStates() {
    return states;
  },
  async listCategories() {
    return commodityCategories;
  },
  async listUnits() {
    return measurementUnits;
  },
  async listMarkets() {
    return MARKET_ROWS;
  },
  async getMarketBySlug(slug) {
    return MARKET_ROWS.find((m) => m.slug === slug) ?? null;
  },
  async listCommodities() {
    return COMMODITY_ROWS;
  },
  async getCommodityBySlug(slug) {
    return COMMODITY_ROWS.find((c) => c.slug === slug) ?? null;
  },
  async getCommodityById(id) {
    return COMMODITY_ROWS.find((c) => c.id === id) ?? null;
  },

  async listObservations(query) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 25));
    const filtered = sortRows(applyFilters(query), query.sort);
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    return {
      items: filtered.slice(start, start + pageSize),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },

  async listObservationsForAnalysis(query) {
    return applyFilters(query);
  },

  async getProvenance(): Promise<Provenance | null> {
    const p = file._provenance;
    return {
      source: p.source,
      collectedAt: p.collected_at,
      collectionMethod: p.collection_method,
      reconstructionNote: p.reconstruction_note,
      knownUnknowns: p.known_unknowns,
      observedCount: p.observed_count,
      dateRange: p.date_range,
      validation: {
        publishedLatestValuesChecked: p.validation.published_latest_values_checked,
        mismatches: p.validation.mismatches,
      },
    };
  },
};

export { commodityGrades, commodityVarieties, legacyCategoryMap };
