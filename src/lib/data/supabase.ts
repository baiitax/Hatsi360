/**
 * Supabase-backed data source.
 *
 * Reads go through the `published_price_observations` view, which applies the
 * same Row Level Security policies as the underlying tables (the view is
 * created with `security_invoker = true`).
 *
 * The mapping functions convert the view's snake_case columns into the
 * camelCase domain types used by the UI.
 */

import 'server-only';

import { createClient } from '@/lib/supabase/server';
import type {
  Commodity,
  CommodityCategory,
  Country,
  Market,
  MeasurementUnit,
  ObservationQuery,
  Paginated,
  PriceObservation,
  PriceType,
  State,
  VerificationStatus,
} from '@/types/domain';
import type { DataSource } from './source';

/* --------------------------------------------------------------- row types */

interface ObservationRow {
  id: string;
  commodity_id: number;
  market_id: number;
  variety_id: number | null;
  grade_id: number | null;
  price_type: PriceType;
  reported_amount: number | null;
  reported_unit_id: number | null;
  package_weight_kg: number | null;
  normalized_amount: number | null;
  normalized_unit_id: number | null;
  currency_code: string;
  collected_at: string;
  collected_at_precision: 'minute' | 'date';
  submitted_at: string | null;
  verified_at: string | null;
  published_at: string | null;
  agent_user_id: string | null;
  verified_by: string | null;
  verification_status: VerificationStatus;
  notes: string | null;
  source_system: 'legacy_import' | 'agent_app' | 'manual_entry';
  source_reference: string | null;
  commodity_name: string;
  commodity_slug: string;
  category_id: number;
  category_name: string;
  category_slug: string;
  market_name: string;
  market_slug: string;
  state_id: number;
  state_name: string;
  state_slug: string;
  country_code: string;
  grade_name: string | null;
  variety_name: string | null;
  unit_code: string | null;
  unit_name: string | null;
  unit_dimension: MeasurementUnit['dimension'] | null;
  unit_is_specific: boolean | null;
  display_amount: number | null;
  display_unit_id: number | null;
  freshness_window_hours: number;
}

const CURRENCY_SYMBOLS: Record<string, string> = { NGN: '₦', USD: '$', GBP: '£', EUR: '€' };

function toObservation(row: ObservationRow): PriceObservation {
  return {
    id: row.id,
    commodityId: row.commodity_id,
    marketId: row.market_id,
    varietyId: row.variety_id,
    gradeId: row.grade_id,
    priceType: row.price_type,
    reportedAmount: row.reported_amount,
    reportedUnitId: row.reported_unit_id,
    packageWeightKg: row.package_weight_kg,
    normalizedAmount: row.normalized_amount,
    normalizedUnitId: row.normalized_unit_id,
    currencyCode: row.currency_code,
    currencySymbol: CURRENCY_SYMBOLS[row.currency_code] ?? row.currency_code,
    collectedAt: row.collected_at,
    collectedAtPrecision: row.collected_at_precision,
    submittedAt: row.submitted_at,
    verifiedAt: row.verified_at,
    publishedAt: row.published_at,
    agentUserId: row.agent_user_id,
    verificationStatus: row.verification_status,
    notes: row.notes,
    qualityFlags: [],
    sourceSystem: row.source_system,
    sourceReference: row.source_reference,
    commodityName: row.commodity_name,
    commoditySlug: row.commodity_slug,
    marketName: row.market_name,
    marketSlug: row.market_slug,
    stateName: row.state_name,
    stateSlug: row.state_slug,
    countryCode: row.country_code,
    gradeName: row.grade_name,
    varietyName: row.variety_name,
    unitCode: row.unit_code,
    unitName: row.unit_name,
    unitDimension: row.unit_dimension ?? 'unknown',
    unitIsSpecific: row.unit_is_specific ?? false,
  };
}

/* ------------------------------------------------------------------ source */

const OBSERVATION_COLUMNS = '*';

type Filter =
  | { column: string; op: 'eq' | 'gte' | 'lte'; value: unknown }
  | { column: string; op: 'like'; value: string };

/**
 * Translate an ObservationQuery into column filters.
 *
 * Search is expanded to a case-insensitive match across the commodity, market
 * and state names, which are the fields a visitor actually searches by.
 */
function buildFilters(query: ObservationQuery): { filters: Filter[]; or: string[] } {
  const filters: Filter[] = [];
  const or: string[] = [];

  if (query.commodityId != null) filters.push({ column: 'commodity_id', op: 'eq', value: query.commodityId });
  if (query.marketId != null) filters.push({ column: 'market_id', op: 'eq', value: query.marketId });
  if (query.priceType) filters.push({ column: 'price_type', op: 'eq', value: query.priceType });
  if (query.gradeId != null) filters.push({ column: 'grade_id', op: 'eq', value: query.gradeId });
  if (query.varietyId != null) filters.push({ column: 'variety_id', op: 'eq', value: query.varietyId });
  if (query.stateId != null) filters.push({ column: 'state_id', op: 'eq', value: query.stateId });
  if (query.categoryId != null) filters.push({ column: 'category_id', op: 'eq', value: query.categoryId });
  if (query.collectedFrom) filters.push({ column: 'collected_at', op: 'gte', value: query.collectedFrom });
  if (query.collectedTo) filters.push({ column: 'collected_at', op: 'lte', value: query.collectedTo });

  if (query.search) {
    const term = query.search.replace(/[,%()]/g, ' ').trim();
    if (term) {
      or.push(
        `commodity_name.ilike.%${term}%`,
        `market_name.ilike.%${term}%`,
        `state_name.ilike.%${term}%`,
        `commodity_slug.ilike.%${term}%`,
        `market_slug.ilike.%${term}%`,
      );
    }
  }

  return { filters, or };
}

export const supabaseSource: DataSource = {
  kind: 'supabase',
  isMigrated: false,

  async listCountries(): Promise<Country[]> {
    const supabase = await createClient();
    const { data } = await supabase.from('countries').select('*').order('name');
    return (data ?? []).map((c) => ({
      id: c.id as number,
      code: c.code as string,
      name: c.name as string,
      currencyCode: c.currency_code as string,
      currencySymbol: c.currency_symbol as string,
    }));
  },

  async listStates(): Promise<State[]> {
    const supabase = await createClient();
    const { data } = await supabase.from('states').select('*').order('name');
    return (data ?? []).map((s) => ({
      id: s.id as number,
      countryId: s.country_id as number,
      code: s.code as string | null,
      name: s.name as string,
      slug: s.slug as string,
    }));
  },

  async listCategories(): Promise<CommodityCategory[]> {
    const supabase = await createClient();
    const { data } = await supabase
      .from('commodity_categories')
      .select('*')
      .order('sort_order');
    return (data ?? []).map((c) => ({
      id: c.id as number,
      slug: c.slug as string,
      name: c.name as string,
      description: c.description as string | null,
      sortOrder: c.sort_order as number,
    }));
  },

  async listUnits(): Promise<MeasurementUnit[]> {
    const supabase = await createClient();
    const { data } = await supabase.from('measurement_units').select('*').order('id');
    return (data ?? []).map((u) => ({
      id: u.id as number,
      code: u.code as string,
      name: u.name as string,
      pluralName: u.plural_name as string | null,
      dimension: u.dimension as MeasurementUnit['dimension'],
      baseUnitId: u.base_unit_id as number | null,
      baseFactor: u.base_factor == null ? null : Number(u.base_factor),
      isSpecific: u.is_specific as boolean,
    }));
  },

  async listMarkets(): Promise<Market[]> {
    const supabase = await createClient();
    const [{ data: markets }, { data: states }] = await Promise.all([
      supabase.from('markets').select('*').eq('is_active', true).order('name'),
      supabase.from('states').select('*'),
    ]);

    const stateMap = new Map((states ?? []).map((s) => [s.id as number, s]));
    const { data: counts } = await supabase
      .from('published_price_observations')
      .select('market_id, collected_at');

    const perMarket = new Map<number, { count: number; latest: string }>();
    for (const row of counts ?? []) {
      const id = row.market_id as number;
      const entry = perMarket.get(id) ?? { count: 0, latest: '' };
      entry.count += 1;
      const at = row.collected_at as string;
      if (at > entry.latest) entry.latest = at;
      perMarket.set(id, entry);
    }

    return (markets ?? []).map((m) => {
      const state = stateMap.get(m.state_id as number);
      const stats = perMarket.get(m.id as number);
      return {
        id: m.id as number,
        legacyId: m.legacy_id as number | null,
        marketZoneId: m.market_zone_id as number | null,
        stateId: m.state_id as number,
        name: m.name as string,
        slug: m.slug as string,
        description: m.description as string | null,
        address: m.address as string | null,
        latitude: m.latitude == null ? null : Number(m.latitude),
        longitude: m.longitude == null ? null : Number(m.longitude),
        isActive: m.is_active as boolean,
        stateName: (state?.name as string) ?? '',
        stateSlug: (state?.slug as string) ?? '',
        countryName: 'Nigeria',
        countryCode: 'NG',
        marketZoneName: null,
        latestObservationAt: stats?.latest ?? null,
        observationCount: stats?.count ?? 0,
      };
    });
  },

  async getMarketBySlug(slug) {
    const markets = await this.listMarkets();
    return markets.find((m) => m.slug === slug) ?? null;
  },

  async listCommodities(): Promise<Commodity[]> {
    const supabase = await createClient();
    const [{ data: commodities }, { data: categories }, { data: synonyms }] = await Promise.all([
      supabase.from('commodities').select('*').eq('is_active', true).order('name'),
      supabase.from('commodity_categories').select('*'),
      supabase.from('commodity_synonyms').select('*'),
    ]);

    const categoryMap = new Map((categories ?? []).map((c) => [c.id as number, c]));
    const synonymMap = new Map<number, string[]>();
    for (const s of synonyms ?? []) {
      const id = s.commodity_id as number;
      const list = synonymMap.get(id) ?? [];
      list.push(s.synonym as string);
      synonymMap.set(id, list);
    }

    const { data: counts } = await supabase
      .from('published_price_observations')
      .select('commodity_id, market_id, collected_at');

    const perCommodity = new Map<number, { count: number; markets: Set<number>; latest: string }>();
    for (const row of counts ?? []) {
      const id = row.commodity_id as number;
      const entry = perCommodity.get(id) ?? { count: 0, markets: new Set<number>(), latest: '' };
      entry.count += 1;
      entry.markets.add(row.market_id as number);
      const at = row.collected_at as string;
      if (at > entry.latest) entry.latest = at;
      perCommodity.set(id, entry);
    }

    return (commodities ?? []).map((c) => {
      const category = categoryMap.get(c.category_id as number);
      const stats = perCommodity.get(c.id as number);
      return {
        id: c.id as number,
        legacyId: c.legacy_id as number | null,
        categoryId: c.category_id as number,
        name: c.name as string,
        slug: c.slug as string,
        description: c.description as string | null,
        isActive: c.is_active as boolean,
        defaultVarietyId: c.default_variety_id as number | null,
        categoryName: (category?.name as string) ?? null,
        categorySlug: (category?.slug as string) ?? null,
        freshnessWindowHours: (c.freshness_window_hours as number) ?? 72,
        synonyms: synonymMap.get(c.id as number) ?? [],
        marketCount: stats?.markets.size ?? 0,
        latestObservationAt: stats?.latest ?? null,
        observationCount: stats?.count ?? 0,
      };
    });
  },

  async getCommodityBySlug(slug) {
    const commodities = await this.listCommodities();
    return commodities.find((c) => c.slug === slug) ?? null;
  },

  async getCommodityById(id) {
    const commodities = await this.listCommodities();
    return commodities.find((c) => c.id === id) ?? null;
  },

  async listObservations(query: ObservationQuery): Promise<Paginated<PriceObservation>> {
    const supabase = await createClient();
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 25));

    let builder = supabase
      .from('published_price_observations')
      .select(OBSERVATION_COLUMNS, { count: 'exact' });

    const { filters, or } = buildFilters(query);
    for (const filter of filters) {
      if (filter.op === 'eq') builder = builder.eq(filter.column, filter.value);
      else if (filter.op === 'gte') builder = builder.gte(filter.column, filter.value);
      else builder = builder.lte(filter.column, filter.value);
    }
    if (or.length) builder = builder.or(or.join(','));

    const sortMap: Record<string, { column: string; ascending: boolean }> = {
      recent: { column: 'collected_at', ascending: false },
      price_asc: { column: 'display_amount', ascending: true },
      price_desc: { column: 'display_amount', ascending: false },
      commodity: { column: 'commodity_name', ascending: true },
      market: { column: 'market_name', ascending: true },
    };
    const chosen = sortMap[query.sort ?? 'recent']!;
    builder = builder.order(chosen.column, { ascending: chosen.ascending });
    builder = builder.range((page - 1) * pageSize, page * pageSize - 1);

    const { data, count } = await builder;
    const total = count ?? 0;

    return {
      items: (data ?? []).map((row) => toObservation(row as unknown as ObservationRow)),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },

  async listObservationsForAnalysis(query) {
    const supabase = await createClient();
    let builder = supabase.from('published_price_observations').select(OBSERVATION_COLUMNS);

    const { filters, or } = buildFilters(query);
    for (const filter of filters) {
      if (filter.op === 'eq') builder = builder.eq(filter.column, filter.value);
      else if (filter.op === 'gte') builder = builder.gte(filter.column, filter.value);
      else builder = builder.lte(filter.column, filter.value);
    }
    if (or.length) builder = builder.or(or.join(','));

    builder = builder.order('collected_at', { ascending: true });

    const { data } = await builder;
    return (data ?? []).map((row) => toObservation(row as unknown as ObservationRow));
  },

  async getProvenance() {
    return null;
  },
};
