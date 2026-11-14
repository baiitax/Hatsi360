/**
 * Geographic Service
 *
 * Phase 07 Stage 2: Country, region, and trade bloc data access.
 *
 * Provides typed queries for the expanded countries table, trade bloc
 * memberships, and regional aggregations. Supports the Global Trade
 * Intelligence dashboard with evidence-grounded geographic data.
 */

import 'server-only';

import { createClient } from '@/lib/supabase/server';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Country {
  id: number;
  code: string;
  name: string;
  iso_alpha2: string | null;
  iso_alpha3: string | null;
  iso_numeric: string | null;
  region: string | null;
  subregion: string | null;
  continent: string | null;
  currency_code: string | null;
  currency_name: string | null;
  calling_code: string | null;
  latitude: number | null;
  longitude: number | null;
  is_african: boolean;
  is_afcfta_member: boolean;
  is_ecowas_member: boolean;
  population: number | null;
  gdp_usd: number | null;
  who_region: string | null;
  un_m49: string | null;
}

export interface TradeBloc {
  id: number;
  code: string;
  name: string;
  description: string | null;
  bloc_type: string | null;
  established_date: string | null;
  website: string | null;
  member_count: number;
  is_active: boolean;
}

export interface TradeBlocMembership {
  id: number;
  trade_bloc_id: number;
  country_id: number;
  membership_type: string;
  join_date: string | null;
  status: string;
  country: Pick<Country, 'id' | 'code' | 'name' | 'iso_alpha2' | 'iso_alpha3'>;
}

export interface TradeBlocWithMembers extends TradeBloc {
  members: TradeBlocMembership[];
}

export interface CountryWithBlocs extends Country {
  trade_blocs: Array<{
    trade_bloc_id: number;
    bloc_code: string;
    bloc_name: string;
    membership_type: string;
    join_date: string | null;
    status: string;
  }>;
}

export interface RegionSummary {
  continent: string;
  country_count: number;
  total_population: number;
  total_gdp: number;
}

export interface CountryListOptions {
  continent?: string;
  region?: string;
  subregion?: string;
  isAfrican?: boolean;
  isAfCFTA?: boolean;
  isECOWAS?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

// ── Country Queries ──────────────────────────────────────────────────────────

export async function getCountries(
  options: CountryListOptions = {},
): Promise<{ countries: Country[]; total: number }> {
  const supabase = await createClient();

  let query = supabase.from('countries').select('*', { count: 'exact' });

  if (options.continent) {
    query = query.eq('continent', options.continent);
  }
  if (options.region) {
    query = query.eq('region', options.region);
  }
  if (options.subregion) {
    query = query.eq('subregion', options.subregion);
  }
  if (options.isAfrican !== undefined) {
    query = query.eq('is_african', options.isAfrican);
  }
  if (options.isAfCFTA !== undefined) {
    query = query.eq('is_afcfta_member', options.isAfCFTA);
  }
  if (options.isECOWAS !== undefined) {
    query = query.eq('is_ecowas_member', options.isECOWAS);
  }
  if (options.search) {
    query = query.or(`name.ilike.%${options.search}%,code.ilike.%${options.search}%`);
  }

  query = query.order('name');

  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to fetch countries: ${error.message}`);

  return { countries: (data ?? []) as Country[], total: count ?? 0 };
}

export async function getCountryByCode(code: string): Promise<Country | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('countries')
    .select('*')
    .eq('code', code.toUpperCase())
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch country '${code}': ${error.message}`);
  return data as Country | null;
}

export async function getCountryByISO2(isoAlpha2: string): Promise<Country | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('countries')
    .select('*')
    .eq('iso_alpha2', isoAlpha2.toUpperCase())
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch country by ISO2 '${isoAlpha2}': ${error.message}`);
  return data as Country | null;
}

export async function getCountryWithBlocs(code: string): Promise<CountryWithBlocs | null> {
  const supabase = await createClient();
  const { data: country, error: countryError } = await supabase
    .from('countries')
    .select('*')
    .eq('code', code.toUpperCase())
    .maybeSingle();

  if (countryError) throw new Error(`Failed to fetch country: ${countryError.message}`);
  if (!country) return null;

  const { data: memberships, error: membError } = await supabase
    .from('trade_bloc_memberships')
    .select(`
      id,
      trade_bloc_id,
      membership_type,
      join_date,
      status,
      trade_blocs!inner(id, code, name)
    `)
    .eq('country_id', country.id)
    .eq('status', 'active');

  if (membError) throw new Error(`Failed to fetch memberships: ${membError.message}`);

  return {
    ...(country as Country),
    trade_blocs: (memberships ?? []).map((m: any) => ({
      trade_bloc_id: m.trade_bloc_id,
      bloc_code: m.trade_blocs.code,
      bloc_name: m.trade_blocs.name,
      membership_type: m.membership_type,
      join_date: m.join_date,
      status: m.status,
    })),
  };
}

// ── Trade Bloc Queries ───────────────────────────────────────────────────────

export async function getTradeBlocs(): Promise<TradeBloc[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('trade_blocs')
    .select('*')
    .eq('is_active', true)
    .order('member_count', { ascending: false });

  if (error) throw new Error(`Failed to fetch trade blocs: ${error.message}`);
  return (data ?? []) as TradeBloc[];
}

export async function getTradeBlocByCode(code: string): Promise<TradeBlocWithMembers | null> {
  const supabase = await createClient();

  const { data: bloc, error: blocError } = await supabase
    .from('trade_blocs')
    .select('*')
    .eq('code', code.toUpperCase())
    .maybeSingle();

  if (blocError) throw new Error(`Failed to fetch trade bloc: ${blocError.message}`);
  if (!bloc) return null;

  const { data: memberships, error: membError } = await supabase
    .from('trade_bloc_memberships')
    .select(`
      id,
      trade_bloc_id,
      country_id,
      membership_type,
      join_date,
      status,
      countries!inner(id, code, name, iso_alpha2, iso_alpha3)
    `)
    .eq('trade_bloc_id', bloc.id)
    .eq('status', 'active')
    .order('countries(name)');

  if (membError) throw new Error(`Failed to fetch memberships: ${membError.message}`);

  return {
    ...(bloc as TradeBloc),
    members: (memberships ?? []).map((m: any) => ({
      id: m.id,
      trade_bloc_id: m.trade_bloc_id,
      country_id: m.country_id,
      membership_type: m.membership_type,
      join_date: m.join_date,
      status: m.status,
      country: m.countries,
    })),
  };
}

export async function getBlocsForCountry(
  countryCode: string,
): Promise<TradeBloc[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('trade_bloc_memberships')
    .select(`
      trade_blocs!inner(*)
    `)
    .eq('countries.code', countryCode.toUpperCase())
    .eq('status', 'active');

  if (error) throw new Error(`Failed to fetch blocs for country: ${error.message}`);

  return (data ?? []).map((m: any) => m.trade_blocs as TradeBloc);
}

// ── Aggregation Queries ──────────────────────────────────────────────────────

export async function getRegionSummaries(): Promise<RegionSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('countries')
    .select('continent, population, gdp_usd');

  if (error) throw new Error(`Failed to fetch region summaries: ${error.message}`);

  const grouped = new Map<string, { count: number; population: number; gdp: number }>();
  for (const row of data ?? []) {
    const continent = row.continent ?? 'Unknown';
    const entry = grouped.get(continent) ?? { count: 0, population: 0, gdp: 0 };
    entry.count += 1;
    entry.population += row.population ?? 0;
    entry.gdp += Number(row.gdp_usd ?? 0);
    grouped.set(continent, entry);
  }

  return Array.from(grouped.entries()).map(([continent, stats]) => ({
    continent,
    country_count: stats.count,
    total_population: stats.population,
    total_gdp: stats.gdp,
  }));
}

export async function getContinentList(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('countries')
    .select('continent')
    .not('continent', 'is', null)
    .order('continent');

  if (error) throw new Error(`Failed to fetch continents: ${error.message}`);

  return [...new Set((data ?? []).map((r) => r.continent))].filter(Boolean) as string[];
}

export async function getSubregionList(continent?: string): Promise<string[]> {
  const supabase = await createClient();
  let query = supabase.from('countries').select('subregion').not('subregion', 'is', null);

  if (continent) {
    query = query.eq('continent', continent);
  }

  const { data, error } = await query.order('subregion');
  if (error) throw new Error(`Failed to fetch subregions: ${error.message}`);

  return [...new Set((data ?? []).map((r) => r.subregion))].filter(Boolean) as string[];
}
