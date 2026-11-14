/**
 * Classification Service
 *
 * Phase 07 Stage 2: HS code classification and commodity mapping.
 *
 * Provides typed queries for the Harmonized System code hierarchy,
 * commodity-to-HS-code mappings, and tariff classification lookups.
 * Supports the Global Trade Intelligence dashboard with standardized
 * trade classification data.
 */

import 'server-only';

import { createClient } from '@/lib/supabase/server';

// ── Types ────────────────────────────────────────────────────────────────────

export interface HSRevision {
  id: number;
  version: string;
  effective_date: string;
  is_current: boolean;
  description: string | null;
}

export interface HSCode {
  id: number;
  code: string;
  level: 'chapter' | 'heading' | 'subheading';
  parent_id: number | null;
  revision_id: number;
  description: string;
  primary_unit: string | null;
  is_agricultural: boolean;
  is_industrial: boolean;
  global_import_value_usd: number | null;
  global_export_value_usd: number | null;
  last_trade_data_year: number | null;
}

export interface HSCodeWithChildren extends HSCode {
  children: HSCode[];
}

export interface CommodityHSMapping {
  id: number;
  commodity_id: number;
  hs_code_id: number;
  mapping_confidence: 'high' | 'medium' | 'approximate';
  notes: string | null;
  is_primary: boolean;
  commodity: { id: number; name: string } | null;
  hs_code: HSCode | null;
}

export interface HSCodeWithMappings extends HSCode {
  commodities: Array<{
    commodity_id: number;
    commodity_name: string;
    mapping_confidence: string;
    is_primary: boolean;
  }>;
}

export interface HSCodeListOptions {
  level?: 'chapter' | 'heading' | 'subheading';
  search?: string;
  isAgricultural?: boolean;
  isIndustrial?: boolean;
  parentId?: number;
  revisionId?: number;
  limit?: number;
  offset?: number;
}

// ── HS Revision Queries ──────────────────────────────────────────────────────

export async function getCurrentRevision(): Promise<HSRevision | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('hs_revisions')
    .select('*')
    .eq('is_current', true)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch current revision: ${error.message}`);
  return data as HSRevision | null;
}

export async function getAllRevisions(): Promise<HSRevision[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('hs_revisions')
    .select('*')
    .order('effective_date', { ascending: false });

  if (error) throw new Error(`Failed to fetch revisions: ${error.message}`);
  return (data ?? []) as HSRevision[];
}

// ── HS Code Queries ──────────────────────────────────────────────────────────

export async function getHSCodes(
  options: HSCodeListOptions = {},
): Promise<{ codes: HSCode[]; total: number }> {
  const supabase = await createClient();

  // Get the current revision if not specified
  let revisionId = options.revisionId;
  if (!revisionId) {
    const revision = await getCurrentRevision();
    if (!revision) return { codes: [], total: 0 };
    revisionId = revision.id;
  }

  let query = supabase
    .from('hs_codes')
    .select('*', { count: 'exact' })
    .eq('revision_id', revisionId);

  if (options.level) {
    query = query.eq('level', options.level);
  }
  if (options.isAgricultural !== undefined) {
    query = query.eq('is_agricultural', options.isAgricultural);
  }
  if (options.isIndustrial !== undefined) {
    query = query.eq('is_industrial', options.isIndustrial);
  }
  if (options.parentId !== undefined) {
    query = query.eq('parent_id', options.parentId);
  }
  if (options.search) {
    query = query.or(
      `code.ilike.%${options.search}%,description.ilike.%${options.search}%`,
    );
  }

  query = query.order('code');

  const limit = options.limit ?? 100;
  const offset = options.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to fetch HS codes: ${error.message}`);

  return { codes: (data ?? []) as HSCode[], total: count ?? 0 };
}

export async function getHSCodeById(id: number): Promise<HSCodeWithChildren | null> {
  const supabase = await createClient();

  const { data: code, error: codeError } = await supabase
    .from('hs_codes')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (codeError) throw new Error(`Failed to fetch HS code: ${codeError.message}`);
  if (!code) return null;

  // Fetch children
  const { data: children, error: childrenError } = await supabase
    .from('hs_codes')
    .select('*')
    .eq('parent_id', code.id)
    .order('code');

  if (childrenError) throw new Error(`Failed to fetch children: ${childrenError.message}`);

  return {
    ...(code as HSCode),
    children: (children ?? []) as HSCode[],
  };
}

export async function getHSCodeByCode(
  codeStr: string,
): Promise<HSCodeWithChildren | null> {
  const supabase = await createClient();

  const revision = await getCurrentRevision();
  if (!revision) return null;

  const { data: code, error: codeError } = await supabase
    .from('hs_codes')
    .select('*')
    .eq('code', codeStr)
    .eq('revision_id', revision.id)
    .maybeSingle();

  if (codeError) throw new Error(`Failed to fetch HS code: ${codeError.message}`);
  if (!code) return null;

  const { data: children, error: childrenError } = await supabase
    .from('hs_codes')
    .select('*')
    .eq('parent_id', code.id)
    .order('code');

  if (childrenError) throw new Error(`Failed to fetch children: ${childrenError.message}`);

  return {
    ...(code as HSCode),
    children: (children ?? []) as HSCode[],
  };
}

export async function getHSTree(): Promise<HSCode[]> {
  /** Get all chapters with their headings as a flat list */
  const supabase = await createClient();
  const revision = await getCurrentRevision();
  if (!revision) return [];

  const { data, error } = await supabase
    .from('hs_codes')
    .select('*')
    .eq('revision_id', revision.id)
    .in('level', ['chapter', 'heading'])
    .order('code');

  if (error) throw new Error(`Failed to fetch HS tree: ${error.message}`);
  return (data ?? []) as HSCode[];
}

// ── Commodity Mapping Queries ────────────────────────────────────────────────

export async function getCommodityHSMappings(
  commodityId?: number,
): Promise<CommodityHSMapping[]> {
  const supabase = await createClient();

  let query = supabase.from('commodity_hs_mappings').select(`
    id,
    commodity_id,
    hs_code_id,
    mapping_confidence,
    notes,
    is_primary,
    commodities!inner(id, name),
    hs_codes!inner(*)
  `);

  if (commodityId !== undefined) {
    query = query.eq('commodity_id', commodityId);
  }

  query = query.order('is_primary', { ascending: false });

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch mappings: ${error.message}`);

  return (data ?? []).map((m: any) => ({
    id: m.id,
    commodity_id: m.commodity_id,
    hs_code_id: m.hs_code_id,
    mapping_confidence: m.mapping_confidence,
    notes: m.notes,
    is_primary: m.is_primary,
    commodity: m.commodities,
    hs_code: m.hs_codes,
  }));
}

export async function getHSCodeForCommodity(
  commodityId: number,
): Promise<{ primary: HSCode | null; alternatives: HSCode[] }> {
  const mappings = await getCommodityHSMappings(commodityId);

  const primaryMapping = mappings.find((m) => m.is_primary);
  const alternatives = mappings.filter((m) => !m.is_primary);

  return {
    primary: primaryMapping?.hs_code ?? null,
    alternatives: alternatives
      .filter((m): m is CommodityHSMapping & { hs_code: HSCode } => m.hs_code !== null)
      .map((m) => m.hs_code as HSCode),
  };
}

export async function getCommoditiesForHSCode(
  hsCodeId: number,
): Promise<HSCodeWithMappings | null> {
  const supabase = await createClient();

  const { data: code, error: codeError } = await supabase
    .from('hs_codes')
    .select('*')
    .eq('id', hsCodeId)
    .maybeSingle();

  if (codeError) throw new Error(`Failed to fetch HS code: ${codeError.message}`);
  if (!code) return null;

  const { data: mappings, error: mappingError } = await supabase
    .from('commodity_hs_mappings')
    .select(`
      commodity_id,
      mapping_confidence,
      is_primary,
      commodities!inner(id, name)
    `)
    .eq('hs_code_id', hsCodeId);

  if (mappingError) throw new Error(`Failed to fetch mappings: ${mappingError.message}`);

  return {
    ...(code as HSCode),
    commodities: (mappings ?? []).map((m: any) => ({
      commodity_id: m.commodity_id,
      commodity_name: m.commodities.name,
      mapping_confidence: m.mapping_confidence,
      is_primary: m.is_primary,
    })),
  };
}

// ── Lookup Helpers ───────────────────────────────────────────────────────────

export async function searchHSCodes(
  query: string,
  limit = 20,
): Promise<HSCode[]> {
  const supabase = await createClient();
  const revision = await getCurrentRevision();
  if (!revision) return [];

  const { data, error } = await supabase
    .from('hs_codes')
    .select('*')
    .eq('revision_id', revision.id)
    .or(`code.ilike.%${query}%,description.ilike.%${query}%`)
    .order('code')
    .limit(limit);

  if (error) throw new Error(`Failed to search HS codes: ${error.message}`);
  return (data ?? []) as HSCode[];
}

export async function getChapterCount(): Promise<number> {
  const supabase = await createClient();
  const revision = await getCurrentRevision();
  if (!revision) return 0;

  const { count, error } = await supabase
    .from('hs_codes')
    .select('*', { count: 'exact', head: true })
    .eq('revision_id', revision.id)
    .eq('level', 'chapter');

  if (error) throw new Error(`Failed to count chapters: ${error.message}`);
  return count ?? 0;
}

export async function getClassificationStats(): Promise<{
  total_codes: number;
  chapters: number;
  headings: number;
  subheadings: number;
  commodity_mappings: number;
  current_revision: string;
}> {
  const supabase = await createClient();
  const revision = await getCurrentRevision();
  if (!revision) {
    return { total_codes: 0, chapters: 0, headings: 0, subheadings: 0, commodity_mappings: 0, current_revision: 'none' };
  }

  const [codesResult, mappingResult] = await Promise.all([
    supabase.from('hs_codes').select('level').eq('revision_id', revision.id),
    supabase.from('commodity_hs_mappings').select('*', { count: 'exact', head: true }),
  ]);

  if (codesResult.error) throw new Error(`Failed to fetch stats: ${codesResult.error.message}`);

  const codes = codesResult.data ?? [];
  const chapters = codes.filter((c) => c.level === 'chapter').length;
  const headings = codes.filter((c) => c.level === 'heading').length;
  const subheadings = codes.filter((c) => c.level === 'subheading').length;

  return {
    total_codes: codes.length,
    chapters,
    headings,
    subheadings,
    commodity_mappings: mappingResult.count ?? 0,
    current_revision: revision.version,
  };
}
