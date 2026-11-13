import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { authEmailsFor } from '@/lib/auth/emails';

/**
 * Hatsi360 — the admin console's read model.
 *
 * One module, one data source, server-side pagination and filtering for every
 * directory. The queries run as the signed-in administrator, so Row Level
 * Security still decides what they can see: an analyst cannot read the audit
 * log, and a verification officer cannot read an export job.
 */

export interface Page<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface ListFilters {
  page?: number;
  pageSize?: number;
  q?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
}

const DEFAULT_PAGE_SIZE = 25;

function paginate<T>(rows: T[], total: number, filters: ListFilters): Page<T> {
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const page = Math.max(1, filters.page ?? 1);
  return {
    rows,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

const emptyPage = <T>(filters: ListFilters): Page<T> =>
  paginate<T>([], 0, filters);

/**
 * An empty stand-in for a Supabase response.
 *
 * Used so a query can be skipped without the surrounding code having to
 * special-case `undefined`. The row type is always spelled out at the call
 * site so the cast at the point of use stays honest.
 */
function emptyRows<T>(): { data: T[] } {
  return { data: [] };
}

/* ---------------------------------------------------------------- agents -- */

export interface AgentDirectoryRow {
  id: string;
  fullName: string | null;
  email: string | null;
  role: string;
  accountStatus: string;
  employeeCode: string | null;
  region: string | null;
  joinedOn: string | null;
  assignedMarkets: number;
  marketNames: string[];
  assignedMarketIds: number[];
  lastActivityAt: string | null;
  lastSignInAt: string | null;
  submitted: number;
  accepted: number;
  rejected: number;
}

export async function listAgents(filters: ListFilters = {}): Promise<Page<AgentDirectoryRow>> {
  if (!isSupabaseConfigured()) return emptyPage(filters);
  const supabase = await createClient();
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const page = Math.max(1, filters.page ?? 1);

  let query = supabase
    .from('profiles')
    .select('id, full_name, role, account_status, created_at', { count: 'exact' })
    .eq('role', 'agent')
    .order('full_name', { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (filters.q) {
    query = query.ilike('full_name', `%${filters.q}%`);
  }

  const { data, count } = await query;
  const rows = data ?? [];
  const ids = rows.map((row) => row.id as string);

  const [assignmentsResult, marketsResult, observationsResult, agentProfilesResult] =
    await Promise.all([
      ids.length
        ? supabase.from('market_agent_assignments').select('user_id, market_id, status').in('user_id', ids)
        : Promise.resolve(emptyRows<{ user_id: string; market_id: number; status: string }>()),
      supabase.from('markets').select('id, name').limit(1000),
      ids.length
        ? supabase
            .from('price_observations')
            .select('agent_user_id, verification_status, submitted_at')
            .in('agent_user_id', ids)
            .limit(5000)
        : Promise.resolve(
            emptyRows<{ agent_user_id: string; verification_status: string; submitted_at: string | null }>(),
          ),
      ids.length
        ? supabase.from('agent_profiles').select('profile_id, employee_code, region, joined_on').in('profile_id', ids)
        : Promise.resolve(
            emptyRows<{
              profile_id: string;
              employee_code: string | null;
              region: string | null;
              joined_on: string | null;
            }>(),
          ),
    ]);

  const marketNames = new Map(
    (marketsResult.data ?? []).map((m) => [m.id as number, m.name as string]),
  );
  const agentDetails = new Map(
    (agentProfilesResult.data ?? []).map((p) => [p.profile_id as string, p]),
  );

  const rowsWithDetails: AgentDirectoryRow[] = rows.map((row) => {
    const id = row.id as string;
    const assignments = (assignmentsResult.data as { user_id: string; market_id: number; status: string }[]).filter(
      (a) => a.user_id === id && a.status === 'active',
    );
    const observations = (observationsResult.data as {
      agent_user_id: string;
      verification_status: string;
      submitted_at: string | null;
    }[]).filter((o) => o.agent_user_id === id);
    const detail = agentDetails.get(id);

    return {
      id,
      fullName: (row.full_name as string | null) ?? null,
      email: null,
      role: row.role as string,
      accountStatus: (row.account_status as string | null) ?? 'active',
      employeeCode: (detail?.employee_code as string | null) ?? null,
      region: (detail?.region as string | null) ?? null,
      joinedOn: (detail?.joined_on as string | null) ?? null,
      assignedMarkets: assignments.length,
      marketNames: assignments.map((a) => marketNames.get(a.market_id) ?? `Market #${a.market_id}`),
      assignedMarketIds: assignments.map((a) => a.market_id),
      lastActivityAt:
        observations
          .map((o) => o.submitted_at)
          .filter((d): d is string => Boolean(d))
          .sort()
          .at(-1) ?? null,
      lastSignInAt: null,
      submitted: observations.length,
      accepted: observations.filter((o) => o.verification_status === 'verified').length,
      rejected: observations.filter((o) => o.verification_status === 'rejected').length,
    };
  });

  return paginate(rowsWithDetails, count ?? rowsWithDetails.length, filters);
}

/* --------------------------------------------------------------- markets -- */

export interface MarketDirectoryRow {
  id: number;
  name: string;
  slug: string;
  stateName: string | null;
  marketZoneName: string | null;
  address: string | null;
  isActive: boolean;
  priority: string | null;
  coverageTarget: number | null;
  assignedAgents: number;
  observations: number;
  latestCollectedAt: string | null;
  latitude: number | null;
  longitude: number | null;
}

export async function listMarkets(filters: ListFilters = {}): Promise<Page<MarketDirectoryRow>> {
  if (!isSupabaseConfigured()) return emptyPage(filters);
  const supabase = await createClient();
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const page = Math.max(1, filters.page ?? 1);

  let query = supabase
    .from('markets')
    .select(
      'id, name, slug, state_id, market_zone_id, address, is_active, priority, coverage_target, latitude, longitude',
      { count: 'exact' },
    )
    .order('name', { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (filters.q) query = query.ilike('name', `%${filters.q}%`);

  const { data, count } = await query;
  const rows = data ?? [];
  const ids = rows.map((row) => row.id as number);

  const [statesResult, zonesResult, assignmentsResult, observationsResult] = await Promise.all([
    supabase.from('states').select('id, name').limit(200),
    supabase.from('market_zones').select('id, name').limit(200),
    ids.length
      ? supabase.from('market_agent_assignments').select('market_id, status').in('market_id', ids)
      : Promise.resolve(emptyRows<{ market_id: number; status: string }>()),
    ids.length
      ? supabase
          .from('price_observations')
          .select('market_id, collected_at')
          .in('market_id', ids)
          .limit(5000)
      : Promise.resolve(emptyRows<{ market_id: number; collected_at: string }>()),
  ]);

  const stateNames = new Map((statesResult.data ?? []).map((s) => [s.id as number, s.name as string]));
  const zoneNames = new Map((zonesResult.data ?? []).map((z) => [z.id as number, z.name as string]));

  const result: MarketDirectoryRow[] = rows.map((row) => {
    const id = row.id as number;
    const observations = (observationsResult.data as { market_id: number; collected_at: string }[]).filter(
      (o) => o.market_id === id,
    );
    return {
      id,
      name: row.name as string,
      slug: row.slug as string,
      stateName: stateNames.get(row.state_id as number) ?? null,
      marketZoneName: row.market_zone_id ? (zoneNames.get(row.market_zone_id as number) ?? null) : null,
      address: (row.address as string | null) ?? null,
      isActive: row.is_active as boolean,
      priority: (row.priority as string | null) ?? null,
      coverageTarget: (row.coverage_target as number | null) ?? null,
      assignedAgents: new Set(
        (assignmentsResult.data as { market_id: number; status: string }[])
          .filter((a) => a.market_id === id && a.status === 'active')
          .map((a) => a.market_id),
      ).size,
      observations: observations.length,
      latestCollectedAt:
        observations.map((o) => o.collected_at).sort().at(-1) ?? null,
      latitude: (row.latitude as number | null) ?? null,
      longitude: (row.longitude as number | null) ?? null,
    };
  });

  return paginate(result, count ?? result.length, filters);
}

export async function getMarketRecord(id: number) {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();

  const [marketResult, assignmentsResult, schedulesResult, scopeResult, observationResult] =
    await Promise.all([
      supabase.from('markets').select('*').eq('id', id).maybeSingle(),
      supabase.from('market_agent_assignments').select('*').eq('market_id', id),
      supabase.from('market_collection_schedules').select('*').eq('market_id', id),
      supabase.from('market_commodity_scope').select('*').eq('market_id', id),
      supabase
        .from('price_observations')
        .select('id, commodity_id, verification_status, published_at, collected_at')
        .eq('market_id', id)
        .order('collected_at', { ascending: false })
        .limit(200),
    ]);

  if (!marketResult.data) return null;

  return {
    market: marketResult.data,
    assignments: assignmentsResult.data ?? [],
    schedules: schedulesResult.data ?? [],
    scope: scopeResult.data ?? [],
    observations: observationResult.data ?? [],
  };
}

/* ----------------------------------------------------------- assignments -- */

export interface AssignmentRow {
  id: number;
  marketId: number;
  marketName: string;
  agentId: string;
  agentName: string;
  status: string;
  startsOn: string | null;
  endsOn: string | null;
}

export async function listAssignments(): Promise<AssignmentRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();

  const [assignmentsResult, marketsResult, agentsResult] = await Promise.all([
    supabase.from('market_agent_assignments').select('*').order('status').limit(2000),
    supabase.from('markets').select('id, name').limit(1000),
    supabase.from('profiles').select('id, full_name').eq('role', 'agent').limit(1000),
  ]);

  const marketNames = new Map((marketsResult.data ?? []).map((m) => [m.id as number, m.name as string]));
  const agentNames = new Map(
    (agentsResult.data ?? []).map((a) => [a.id as string, (a.full_name as string | null) ?? 'Unnamed agent']),
  );

  return ((assignmentsResult.data ?? []) as {
    id: number;
    market_id: number;
    user_id: string;
    status: string;
    starts_on: string | null;
    ends_on: string | null;
  }[]).map((assignment) => ({
    id: assignment.id,
    marketId: assignment.market_id,
    marketName: marketNames.get(assignment.market_id) ?? `Market #${assignment.market_id}`,
    agentId: assignment.user_id,
    agentName: agentNames.get(assignment.user_id) ?? 'Unknown agent',
    status: assignment.status,
    startsOn: assignment.starts_on,
    endsOn: assignment.ends_on,
  }));
}

/* ------------------------------------------------------------- schedules -- */

export interface ScheduleRow {
  id: number;
  marketId: number;
  marketName: string;
  commodityId: number | null;
  commodityName: string | null;
  frequency: string;
  daysOfWeek: number[];
  deadlineTime: string | null;
  expectedObservations: number | null;
  priority: string | null;
  evidenceRequired: boolean;
  assignedAgentId: string | null;
  assignedAgentName: string | null;
  isActive: boolean;
}

export async function listSchedules(): Promise<ScheduleRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();

  const [schedulesResult, marketsResult, commoditiesResult, agentsResult] = await Promise.all([
    supabase.from('market_collection_schedules').select('*').order('market_id').limit(1000),
    supabase.from('markets').select('id, name').limit(1000),
    supabase.from('commodities').select('id, name').limit(1000),
    supabase.from('profiles').select('id, full_name').eq('role', 'agent').limit(1000),
  ]);

  const marketNames = new Map((marketsResult.data ?? []).map((m) => [m.id as number, m.name as string]));
  const commodityNames = new Map(
    (commoditiesResult.data ?? []).map((c) => [c.id as number, c.name as string]),
  );
  const agentNames = new Map(
    (agentsResult.data ?? []).map((a) => [a.id as string, (a.full_name as string | null) ?? 'Unnamed agent']),
  );

  return ((schedulesResult.data ?? []) as {
    id: number;
    market_id: number;
    commodity_id: number | null;
    frequency: string;
    days_of_week: number[] | null;
    deadline_time: string | null;
    expected_observations: number | null;
    priority: string | null;
    evidence_required: boolean;
    assigned_agent_id: string | null;
    is_active: boolean;
  }[]).map((schedule) => ({
    id: schedule.id,
    marketId: schedule.market_id,
    marketName: marketNames.get(schedule.market_id) ?? `Market #${schedule.market_id}`,
    commodityId: schedule.commodity_id,
    commodityName: schedule.commodity_id
      ? (commodityNames.get(schedule.commodity_id) ?? null)
      : null,
    frequency: schedule.frequency,
    daysOfWeek: schedule.days_of_week ?? [],
    deadlineTime: schedule.deadline_time,
    expectedObservations: schedule.expected_observations,
    priority: schedule.priority,
    evidenceRequired: schedule.evidence_required,
    assignedAgentId: schedule.assigned_agent_id,
    assignedAgentName: schedule.assigned_agent_id
      ? (agentNames.get(schedule.assigned_agent_id) ?? null)
      : null,
    isActive: schedule.is_active,
  }));
}

/* ---------------------------------------------------------------- tasks -- */

export interface TaskDirectoryRow {
  id: number;
  marketId: number;
  marketName: string;
  commodityNames: string;
  assignedTo: string | null;
  agentName: string;
  dueOn: string;
  status: string;
  priority: string | null;
  deadlineAt: string | null;
  startedAt: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  isOverdue: boolean;
}

export interface TaskFilters extends ListFilters {
  status?: string;
  marketId?: number;
  agentId?: string;
  overdueOnly?: boolean;
}

export async function listTasks(filters: TaskFilters = {}): Promise<Page<TaskDirectoryRow>> {
  if (!isSupabaseConfigured()) return emptyPage(filters);
  const supabase = await createClient();
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const page = Math.max(1, filters.page ?? 1);

  let query = supabase
    .from('collection_tasks')
    .select(
      'id, market_id, commodity_id, assigned_to, due_on, status, priority, deadline_at, started_at, submitted_at, completed_at',
      { count: 'exact' },
    )
    .order('due_on', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.marketId) query = query.eq('market_id', filters.marketId);
  if (filters.agentId) query = query.eq('assigned_to', filters.agentId);
  if (filters.overdueOnly) query = query.lt('deadline_at', new Date().toISOString());

  const { data, count } = await query;
  const rows = data ?? [];
  const marketIds = [...new Set(rows.map((row) => row.market_id as number))];
  const agentIds = [...new Set(rows.map((row) => row.assigned_to).filter(Boolean))] as string[];

  const [marketsResult, agentsResult, commoditiesResult] = await Promise.all([
    marketIds.length
      ? supabase.from('markets').select('id, name').in('id', marketIds)
      : Promise.resolve(emptyRows<{ id: number; name: string }>()),
    agentIds.length
      ? supabase.from('profiles').select('id, full_name').in('id', agentIds)
      : Promise.resolve(emptyRows<{ id: string; full_name: string | null }>()),
    supabase.from('commodities').select('id, name').limit(1000),
  ]);

  const marketNames = new Map((marketsResult.data ?? []).map((m) => [m.id as number, m.name as string]));
  const agentNames = new Map(
    (agentsResult.data ?? []).map((a) => [a.id as string, (a.full_name as string | null) ?? 'Unnamed agent']),
  );
  const commodityNames = new Map(
    (commoditiesResult.data ?? []).map((c) => [c.id as number, c.name as string]),
  );

  const now = Date.now();
  const result: TaskDirectoryRow[] = rows.map((row) => ({
    id: row.id as number,
    marketId: row.market_id as number,
    marketName: marketNames.get(row.market_id as number) ?? `Market #${row.market_id}`,
    commodityNames:
      row.commodity_id
        ? (commodityNames.get(row.commodity_id as number) ?? `Commodity #${row.commodity_id}`)
        : 'Market round',
    assignedTo: (row.assigned_to as string | null) ?? null,
    agentName: row.assigned_to
      ? (agentNames.get(row.assigned_to as string) ?? 'Unknown agent')
      : 'Unassigned',
    dueOn: row.due_on as string,
    status: row.status as string,
    priority: (row.priority as string | null) ?? null,
    deadlineAt: (row.deadline_at as string | null) ?? null,
    startedAt: (row.started_at as string | null) ?? null,
    submittedAt: (row.submitted_at as string | null) ?? null,
    completedAt: (row.completed_at as string | null) ?? null,
    isOverdue:
      Boolean(row.deadline_at) &&
      new Date(row.deadline_at as string).getTime() < now &&
      !['completed', 'submitted', 'cancelled'].includes(row.status as string),
  }));

  return paginate(result, count ?? result.length, filters);
}

/* ---------------------------------------------------------- observations -- */

export interface ObservationFilters extends ListFilters {
  status?: string;
  marketId?: number;
  commodityId?: number;
  agentId?: string;
  published?: 'yes' | 'no';
  flagged?: boolean;
}

export interface ObservationDirectoryRow {
  id: string;
  commodityName: string;
  marketName: string;
  agentName: string;
  priceType: string;
  reportedAmount: number | null;
  unitCode: string | null;
  collectedAt: string;
  submittedAt: string | null;
  verifiedAt: string | null;
  publishedAt: string | null;
  verificationStatus: string;
  qualityFlags: string[];
}

export async function listObservations(
  filters: ObservationFilters = {},
): Promise<Page<ObservationDirectoryRow>> {
  if (!isSupabaseConfigured()) return emptyPage(filters);
  const supabase = await createClient();
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const page = Math.max(1, filters.page ?? 1);

  let query = supabase
    .from('price_observations')
    .select(
      'id, commodity_id, market_id, agent_user_id, price_type, reported_amount, reported_unit_id, collected_at, submitted_at, verified_at, published_at, verification_status, quality_flags',
      { count: 'exact' },
    )
    .order('collected_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (filters.status) query = query.eq('verification_status', filters.status);
  if (filters.marketId) query = query.eq('market_id', filters.marketId);
  if (filters.commodityId) query = query.eq('commodity_id', filters.commodityId);
  if (filters.agentId) query = query.eq('agent_user_id', filters.agentId);
  if (filters.published === 'yes') query = query.not('published_at', 'is', null);
  if (filters.published === 'no') query = query.is('published_at', null);

  const { data, count } = await query;
  const rows = data ?? [];

  const commodityIds = [...new Set(rows.map((r) => r.commodity_id as number))];
  const marketIds = [...new Set(rows.map((r) => r.market_id as number))];
  const agentIds = [...new Set(rows.map((r) => r.agent_user_id).filter(Boolean))] as string[];

  const [commoditiesResult, marketsResult, agentsResult, unitsResult] = await Promise.all([
    commodityIds.length
      ? supabase.from('commodities').select('id, name').in('id', commodityIds)
      : Promise.resolve(emptyRows<{ id: number; name: string }>()),
    marketIds.length
      ? supabase.from('markets').select('id, name').in('id', marketIds)
      : Promise.resolve(emptyRows<{ id: number; name: string }>()),
    agentIds.length
      ? supabase.from('profiles').select('id, full_name').in('id', agentIds)
      : Promise.resolve(emptyRows<{ id: string; full_name: string | null }>()),
    supabase.from('measurement_units').select('id, code').limit(100),
  ]);

  const commodityNames = new Map((commoditiesResult.data ?? []).map((c) => [c.id as number, c.name as string]));
  const marketNames = new Map((marketsResult.data ?? []).map((m) => [m.id as number, m.name as string]));
  const agentNames = new Map(
    (agentsResult.data ?? []).map((a) => [a.id as string, (a.full_name as string | null) ?? 'Unknown agent']),
  );
  const unitCodes = new Map((unitsResult.data ?? []).map((u) => [u.id as number, u.code as string]));

  let result: ObservationDirectoryRow[] = rows.map((row) => ({
    id: row.id as string,
    commodityName:
      commodityNames.get(row.commodity_id as number) ?? `Commodity #${row.commodity_id}`,
    marketName: marketNames.get(row.market_id as number) ?? `Market #${row.market_id}`,
    agentName: row.agent_user_id
      ? (agentNames.get(row.agent_user_id as string) ?? 'Unknown agent')
      : 'Unknown agent',
    priceType: row.price_type as string,
    reportedAmount: (row.reported_amount as number | null) ?? null,
    unitCode: row.reported_unit_id ? (unitCodes.get(row.reported_unit_id as number) ?? null) : null,
    collectedAt: row.collected_at as string,
    submittedAt: (row.submitted_at as string | null) ?? null,
    verifiedAt: (row.verified_at as string | null) ?? null,
    publishedAt: (row.published_at as string | null) ?? null,
    verificationStatus: row.verification_status as string,
    qualityFlags: (row.quality_flags as string[] | null) ?? [],
  }));

  if (filters.flagged) {
    result = result.filter((row) => row.qualityFlags.length > 0);
  }

  return paginate(result, count ?? result.length, filters);
}

export async function getObservationDetail(id: string) {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();

  const [observationResult, eventsResult, revisionsResult, flagsResult, evidenceResult] =
    await Promise.all([
      supabase.from('price_observations').select('*').eq('id', id).maybeSingle(),
      supabase
        .from('price_verification_events')
        .select('*')
        .eq('observation_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('price_revision_history')
        .select('*')
        .eq('observation_id', id)
        .order('revision_number', { ascending: false }),
      supabase.from('data_quality_flags').select('*').eq('observation_id', id),
      supabase.from('price_observation_evidence').select('*').eq('observation_id', id),
    ]);

  if (!observationResult.data) return null;

  return {
    observation: observationResult.data,
    events: eventsResult.data ?? [],
    revisions: revisionsResult.data ?? [],
    flags: flagsResult.data ?? [],
    evidence: evidenceResult.data ?? [],
  };
}

/* -------------------------------------------------------------- quality -- */

export async function listQualityFlags(limit = 100) {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('data_quality_flags')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

/* ------------------------------------------------------------ audit log -- */

export interface AuditFilters extends ListFilters {
  action?: string;
  entityType?: string;
  actorId?: string;
}

export async function listAuditLogs(filters: AuditFilters = {}): Promise<Page<Record<string, unknown>>> {
  if (!isSupabaseConfigured()) return emptyPage(filters);
  const supabase = await createClient();
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const page = Math.max(1, filters.page ?? 1);

  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (filters.action) query = query.eq('action', filters.action);
  if (filters.entityType) query = query.eq('entity_type', filters.entityType);
  if (filters.actorId) query = query.eq('actor_id', filters.actorId);

  const { data, count } = await query;
  return paginate((data ?? []) as Record<string, unknown>[], count ?? 0, filters);
}

/* ------------------------------------------------------------- settings -- */

export async function getSystemSettings(): Promise<Record<string, unknown>> {
  if (!isSupabaseConfigured()) return {};
  const supabase = await createClient();
  const { data } = await supabase.from('system_settings').select('*');
  const settings: Record<string, unknown> = {};
  for (const row of data ?? []) {
    settings[row.key as string] = row.value;
  }
  return settings;
}

export async function saveSystemSetting(key: string, value: unknown, description?: string) {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase is not configured.' };
  const supabase = await createClient();
  const { error } = await supabase.from('system_settings').upsert(
    { key, value, description: description ?? null },
    { onConflict: 'key' },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/* ------------------------------------------------------------ reference -- */

export async function listReferenceData() {
  if (!isSupabaseConfigured()) {
    return {
      categories: [],
      commodities: [],
      varieties: [],
      grades: [],
      units: [],
      zones: [],
      markets: [],
    };
  }
  const supabase = await createClient();

  const [categories, commodities, varieties, grades, units, zones, markets] = await Promise.all([
    supabase.from('commodity_categories').select('*').order('sort_order'),
    supabase.from('commodities').select('*').order('name'),
    supabase.from('commodity_varieties').select('*').order('name'),
    supabase.from('commodity_grades').select('*').order('name'),
    supabase.from('measurement_units').select('*').order('code'),
    supabase.from('market_zones').select('*').order('name'),
    supabase.from('markets').select('id, name, slug, is_active').order('name'),
  ]);

  return {
    categories: categories.data ?? [],
    commodities: commodities.data ?? [],
    varieties: varieties.data ?? [],
    grades: grades.data ?? [],
    units: units.data ?? [],
    zones: zones.data ?? [],
    markets: markets.data ?? [],
  };
}

/* --------------------------------------------------------------- exports -- */

export async function listExportJobs(limit = 50) {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('export_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

/* ------------------------------------------------------- the agent record -- */

export interface AgentObservationRow {
  id: string;
  commodityName: string;
  marketName: string;
  amount: number | null;
  unitName: string | null;
  priceType: string;
  gradeName: string | null;
  currencyCode: string;
  collectedAt: string;
  submittedAt: string | null;
  verificationStatus: string;
  evidenceCount: number;
}

export interface AgentSessionRow {
  id: number;
  reference: string;
  marketName: string;
  startedAt: string;
  completedAt: string | null;
  observationCount: number;
}

export interface AgentTaskRow {
  id: number;
  marketName: string;
  dueOn: string;
  status: string;
  expectedCount: number;
  commodityNames: string[];
}

export interface AgentRecord {
  id: string;
  fullName: string | null;
  email: string | null;
  role: string;
  accountStatus: string;
  employeeCode: string | null;
  region: string | null;
  joinedOn: string | null;
  alternatePhone: string | null;
  supervisorNotes: string | null;
  employmentStatus: string;
  createdAt: string | null;
  assignedMarkets: { id: number; name: string; status: string }[];
  /** Counts by verification outcome. Null until the query has run. */
  submitted: number;
  verified: number;
  rejected: number;
  correctionRequested: number;
  published: number;
  draft: number;
  observations: AgentObservationRow[];
  sessions: AgentSessionRow[];
  tasks: AgentTaskRow[];
}

/**
 * One agent, in full.
 *
 * Everything here runs as the signed-in administrator, so RLS decides what
 * they may see. The counts are computed from the same rows the tables below
 * are built from — there is no separate aggregate query that could disagree
 * with the list beside it.
 *
 * The screen shows what the agent has actually done. No performance score is
 * invented and no volume is rewarded over accuracy: an agent with many
 * rejections and an agent with few submissions are both shown as they are.
 */
export async function getAgentRecord(userId: string): Promise<AgentRecord | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();

  const profileResult = await supabase
    .from('profiles')
    .select('id, full_name, role, account_status, created_at')
    .eq('id', userId)
    .maybeSingle();

  if (!profileResult.data) return null;
  const profile = profileResult.data;

  // The address is not a column of `profiles` — it belongs to `auth.users`.
  // Reading it here is what keeps the detail screen from reporting an agent
  // that exists as missing.
  const emails = await authEmailsFor([userId]);

  const [agentProfileResult, assignmentsResult, observationsResult, sessionsResult, tasksResult] =
    await Promise.all([
      supabase
        .from('agent_profiles')
        .select('employee_code, region, joined_on, alternate_phone, supervisor_notes, employment_status')
        .eq('profile_id', userId)
        .maybeSingle(),
      supabase
        .from('market_agent_assignments')
        .select('market_id, status')
        .eq('user_id', userId),
      supabase
        .from('price_observations')
        .select(
          'id, commodity_id, market_id, reported_amount, reported_unit_id, price_type, grade_id, currency_code, collected_at, submitted_at, verification_status, collection_batch_id',
        )
        .eq('agent_user_id', userId)
        .order('collected_at', { ascending: false })
        .limit(200),
      supabase
        .from('collection_batches')
        .select('id, reference, market_id, started_at, completed_at')
        .eq('agent_user_id', userId)
        .order('started_at', { ascending: false })
        .limit(25),
      supabase
        .from('collection_tasks')
        .select('id, market_id, due_on, status, commodity_id')
        .eq('assigned_to', userId)
        .order('due_on', { ascending: false })
        .limit(50),
    ]);

  const observations = observationsResult.data ?? [];
  const sessions = sessionsResult.data ?? [];
  const tasks = tasksResult.data ?? [];
  const assignments = assignmentsResult.data ?? [];

  // Resolve the names these rows refer to, in one pass each.
  const marketIds = [
    ...new Set([
      ...assignments.map((a) => a.market_id as number),
      ...observations.map((o) => o.market_id as number),
      ...sessions.map((s) => s.market_id as number),
      ...tasks.map((t) => t.market_id as number),
    ]),
  ];
  const commodityIds = [
    ...new Set([
      ...observations.map((o) => o.commodity_id as number),
      ...tasks.map((t) => t.commodity_id as number | null).filter(Boolean) as number[],
    ]),
  ];
  const gradeIds = [
    ...new Set(observations.map((o) => o.grade_id as number | null).filter(Boolean) as number[]),
  ];

  const [marketsResult, commoditiesResult, gradesResult, unitsResult, evidenceResult] =
    await Promise.all([
      marketIds.length
        ? supabase.from('markets').select('id, name').in('id', marketIds)
        : Promise.resolve(emptyRows<{ id: number; name: string }>()),
      commodityIds.length
        ? supabase.from('commodities').select('id, name').in('id', commodityIds)
        : Promise.resolve(emptyRows<{ id: number; name: string }>()),
      gradeIds.length
        ? supabase.from('commodity_grades').select('id, name').in('id', gradeIds)
        : Promise.resolve(emptyRows<{ id: number; name: string }>()),
      supabase.from('measurement_units').select('id, name').limit(1000),
      observations.length
        ? supabase
            .from('price_observation_evidence')
            .select('observation_id')
            .in(
              'observation_id',
              observations.map((o) => o.id as string),
            )
        : Promise.resolve(emptyRows<{ observation_id: string }>()),
    ]);

  const marketNames = new Map((marketsResult.data ?? []).map((m) => [m.id as number, m.name as string]));
  const commodityNames = new Map(
    (commoditiesResult.data ?? []).map((c) => [c.id as number, c.name as string]),
  );
  const gradeNames = new Map((gradesResult.data ?? []).map((g) => [g.id as number, g.name as string]));

  // The unit each observation was reported in. The observation stores the unit
  // id on the row; the directory above resolves it.
  const unitNames = new Map((unitsResult.data ?? []).map((u) => [u.id as number, u.name as string]));

  const evidenceCounts = new Map<string, number>();
  for (const row of evidenceResult.data ?? []) {
    const key = row.observation_id as string;
    evidenceCounts.set(key, (evidenceCounts.get(key) ?? 0) + 1);
  }

  const observationRows: AgentObservationRow[] = observations.map((row) => ({
    id: row.id as string,
    commodityName: commodityNames.get(row.commodity_id as number) ?? 'Unknown commodity',
    marketName: marketNames.get(row.market_id as number) ?? 'Unknown market',
    amount: (row.reported_amount as number | null) ?? null,
    unitName: row.reported_unit_id
      ? unitNames.get(row.reported_unit_id as number) ?? null
      : null,
    priceType: row.price_type as string,
    gradeName: row.grade_id ? gradeNames.get(row.grade_id as number) ?? null : null,
    currencyCode: (row.currency_code as string | null) ?? 'NGN',
    collectedAt: row.collected_at as string,
    submittedAt: (row.submitted_at as string | null) ?? null,
    verificationStatus: row.verification_status as string,
    evidenceCount: evidenceCounts.get(row.id as string) ?? 0,
  }));

  // Count the observations that point at each session. A session with no
  // observations is a real state — an agent who opened a session and recorded
  // nothing — and is shown as zero rather than hidden.
  const observationsByBatch = new Map<number, number>();
  for (const observation of observations) {
    const batchId = observation.collection_batch_id as number | null;
    if (batchId == null) continue;
    observationsByBatch.set(batchId, (observationsByBatch.get(batchId) ?? 0) + 1);
  }

  const sessionRows: AgentSessionRow[] = sessions.map((row) => ({
    id: row.id as number,
    reference: row.reference as string,
    marketName: marketNames.get(row.market_id as number) ?? 'Unknown market',
    startedAt: row.started_at as string,
    completedAt: (row.completed_at as string | null) ?? null,
    observationCount: observationsByBatch.get(row.id as number) ?? 0,
  }));

  // A task's expected commodities. The schema links a task to one commodity,
  // so a multi-commodity task is represented by its own row per commodity in
  // the collection plan; the names are grouped here for display.
  const taskCommodityNames = new Map<number, string[]>();
  for (const task of tasks) {
    if (task.commodity_id) {
      const name = commodityNames.get(task.commodity_id as number);
      if (name) {
        const list = taskCommodityNames.get(task.id as number) ?? [];
        list.push(name);
        taskCommodityNames.set(task.id as number, list);
      }
    }
  }

  const taskRows: AgentTaskRow[] = tasks.map((row) => ({
    id: row.id as number,
    marketName: marketNames.get(row.market_id as number) ?? 'Unknown market',
    dueOn: row.due_on as string,
    status: row.status as string,
    expectedCount: (taskCommodityNames.get(row.id as number) ?? []).length,
    commodityNames: taskCommodityNames.get(row.id as number) ?? [],
  }));

  const byStatus = (status: string) =>
    observations.filter((o) => o.verification_status === status).length;

  const agentProfile = agentProfileResult.data;

  return {
    id: profile.id as string,
    fullName: (profile.full_name as string | null) ?? null,
    email: emails.get(userId) ?? null,
    role: profile.role as string,
    accountStatus: (profile.account_status as string | null) ?? 'unknown',
    employeeCode: (agentProfile?.employee_code as string | null) ?? null,
    region: (agentProfile?.region as string | null) ?? null,
    joinedOn: (agentProfile?.joined_on as string | null) ?? null,
    alternatePhone: (agentProfile?.alternate_phone as string | null) ?? null,
    supervisorNotes: (agentProfile?.supervisor_notes as string | null) ?? null,
    employmentStatus: (agentProfile?.employment_status as string | null) ?? 'active',
    createdAt: (profile.created_at as string | null) ?? null,
    assignedMarkets: assignments.map((a) => ({
      id: a.market_id as number,
      name: marketNames.get(a.market_id as number) ?? 'Unknown market',
      status: a.status as string,
    })),
    submitted: observations.length,
    verified: byStatus('verified'),
    rejected: byStatus('rejected'),
    correctionRequested: byStatus('correction_requested'),
    published: byStatus('published'),
    draft: byStatus('draft'),
    observations: observationRows,
    sessions: sessionRows,
    tasks: taskRows,
  };
}
