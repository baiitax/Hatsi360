import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import {
  operationalToday,
  startOfOperationalDay,
  endOfOperationalDay,
} from '@/lib/analytics/format';

/**
 * Hatsi360 Field — the agent's operational data layer.
 *
 * Every query in this file runs through the signed-in Supabase client, so
 * Row Level Security is the first filter the data passes through. An agent
 * who changes a URL, a request payload or a query parameter gets nothing
 * they are not already entitled to. The queries below narrow the result
 * further for readability, never to widen it.
 *
 * The layer reads the real schema. Nothing here invents a figure: a counter
 * is a count of rows the agent is allowed to see, and a status is the status
 * the database stores.
 */

/* ------------------------------------------------------------------ types -- */

export interface FieldMarket {
  id: number;
  name: string;
  address: string | null;
  stateName: string | null;
  zoneName: string | null;
  isActive: boolean;
  collectionInstructions: string | null;
  commodityCount: number;
  commodityNames: string[];
  scheduled: boolean;
  deadlineTime: string | null;
  windowStart: string | null;
  windowEnd: string | null;
  frequency: string | null;
  requiredPriceTypes: string[];
  evidenceRequired: boolean;
  expectedObservations: number;
  priority: string | null;
  /** The agent's assignment status: active, paused or ended. */
  assignmentStatus: string | null;
  lastCollectionAt: string | null;
  collectedToday: number;
  openTaskCount: number;
}

export interface FieldAssignment {
  id: number;
  marketId: number;
  marketName: string;
  marketAddress: string | null;
  stateName: string | null;
  commodityNames: string[];
  dueOn: string;
  deadlineAt: string | null;
  priority: string | null;
  status: string;
  expectedCount: number;
  submittedCount: number;
  approvedCount: number;
  isOverdue: boolean;
  notes: string | null;
  scheduleId: number | null;
  startedAt: string | null;
  submittedAt: string | null;
  completedAt: string | null;
}

export interface FieldAssignmentDetail extends FieldAssignment {
  collectionInstructions: string | null;
  requiredPriceTypes: string[];
  evidenceRequired: boolean;
  frequency: string | null;
  windowStart: string | null;
  windowEnd: string | null;
  deadlineTime: string | null;
  gradeNames: string[];
  unitNames: string[];
  events: FieldTaskEvent[];
  observations: FieldObservationSummary[];
}

export interface FieldTaskEvent {
  id: number;
  eventType: string;
  fromStatus: string | null;
  toStatus: string | null;
  reason: string | null;
  createdAt: string;
}

export interface FieldObservationSummary {
  id: string;
  commodityId: number;
  commodityName: string;
  marketId: number;
  marketName: string;
  gradeName: string | null;
  unitName: string | null;
  priceType: string;
  reportedAmount: number | null;
  currencyCode: string;
  collectedAt: string;
  submittedAt: string | null;
  verifiedAt: string | null;
  publishedAt: string | null;
  verificationStatus: string;
  notes: string | null;
  reviewerNote: string | null;
  qualityFlags: string[];
  evidenceCount: number;
  isCurrent: boolean;
  supersedesId: string | null;
}

export interface FieldObservationDetail extends FieldObservationSummary {
  packageWeightKg: number | null;
  packageCount: number | null;
  varietyName: string | null;
  events: FieldTaskEvent[];
  revisions: FieldRevision[];
  evidence: FieldEvidence[];
  findings: FieldFinding[];
  /** True when the agent has something to do about this record. */
  requiresAction: boolean;
}

export interface FieldRevision {
  id: number;
  revisionNumber: number;
  changeReason: string | null;
  beforeData: Record<string, unknown>;
  afterData: Record<string, unknown>;
  createdAt: string;
}

export interface FieldEvidence {
  id: number;
  fileName: string;
  caption: string | null;
  contentType: string;
  byteSize: number;
  createdAt: string;
}

export interface FieldFinding {
  ruleCode: string;
  severity: string;
  message: string;
  evaluatedAt: string;
}

export interface FieldCorrection {
  observation: FieldObservationSummary;
  reason: string | null;
  requestedAt: string | null;
}

export interface FieldSession {
  id: number;
  reference: string;
  marketId: number;
  marketName: string;
  startedAt: string;
  completedAt: string | null;
  observationsCount: number;
  submittedCount: number;
  approvedCount: number;
  correctionCount: number;
  notes: string | null;
}

export interface FieldPerformance {
  periodLabel: string;
  from: string;
  to: string;
  assignedTasks: number;
  completedTasks: number;
  onTimeTasks: number;
  lateTasks: number;
  overdueTasks: number;
  observationsSubmitted: number;
  observationsApproved: number;
  observationsPending: number;
  observationsRejected: number;
  correctionsRequired: number;
  /** Share of submitted observations that were approved, as a percentage. */
  approvalRate: number | null;
  /** Share of submitted observations that needed a correction, as a percentage. */
  correctionRate: number | null;
  marketsCovered: number;
  commoditiesCovered: number;
  /** The daily counts behind the totals, for a simple trend. */
  daily: { date: string; submitted: number; approved: number }[];
}

export interface FieldHome {
  configured: boolean;
  today: string;
  agentName: string;
  region: string | null;
  employeeCode: string | null;
  alternatePhone: string | null;
  accountStatus: string | null;
  markets: FieldMarket[];
  tasksToday: FieldAssignment[];
  upcoming: FieldAssignment[];
  completedToday: number;
  pendingTasks: number;
  overdueTasks: number;
  corrections: FieldCorrection[];
  drafts: FieldObservationSummary[];
  pendingSubmissions: number;
  approvedCount: number;
  unreadNotifications: number;
  recentActivity: FieldActivityItem[];
  notices: FieldNotice[];
  lastSyncedAt: string | null;
}

export interface FieldActivityItem {
  id: string;
  kind: 'observation' | 'task' | 'notification';
  title: string;
  detail: string;
  status: string;
  at: string;
}

export interface FieldNotice {
  id: string;
  title: string;
  body: string | null;
  kind: string;
  severity: string;
  createdAt: string;
  actionUrl: string | null;
}

/* ------------------------------------------------------------- constants -- */

export {
  FIELD_PRICE_TYPES,
  FIELD_TASK_STATUS_LABEL,
  FIELD_VERIFICATION_LABEL,
  priceTypeLabel,
  priceTypeShort,
  taskStatusLabel,
  verificationLabel,
} from './field-constants';

import {
  FIELD_PRICE_TYPES,
  priceTypeLabel,
  priceTypeShort,
  taskStatusLabel,
  verificationLabel,
} from './field-constants';

/* --------------------------------------------------------------- helpers -- */

const EMPTY_MARKET: FieldMarket = {
  id: 0,
  name: '',
  address: null,
  stateName: null,
  zoneName: null,
  isActive: false,
  collectionInstructions: null,
  commodityCount: 0,
  commodityNames: [],
  scheduled: false,
  deadlineTime: null,
  windowStart: null,
  windowEnd: null,
  frequency: null,
  requiredPriceTypes: [],
  evidenceRequired: false,
  expectedObservations: 0,
  priority: null,
  assignmentStatus: null,
  lastCollectionAt: null,
  collectedToday: 0,
  openTaskCount: 0,
};

type Row = Record<string, unknown>;

function num(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}

function str(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function bool(value: unknown): boolean {
  return value === true;
}

function list<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/* ------------------------------------------------- shared reference reads -- */

interface ReferenceData {
  commodityNames: Map<number, string>;
  commodityCategories: Map<number, string>;
  marketNames: Map<number, string>;
  stateNames: Map<number, string>;
  unitNames: Map<number, string>;
  gradeNames: Map<number, string>;
  varietyNames: Map<number, string>;
}

async function loadReference(): Promise<ReferenceData> {
  const supabase = await createClient();
  const [commodities, categories, markets, states, units, grades, varieties] = await Promise.all([
    supabase.from('commodities').select('id, name, category_id').limit(1000),
    supabase.from('commodity_categories').select('id, name').limit(200),
    supabase.from('markets').select('id, name').limit(1000),
    supabase.from('states').select('id, name').limit(200),
    supabase.from('measurement_units').select('id, name').limit(200),
    supabase.from('commodity_grades').select('id, name').limit(500),
    supabase.from('commodity_varieties').select('id, name').limit(500),
  ]);

  return {
    commodityNames: new Map(
      (commodities.data ?? []).map((c) => [c.id as number, c.name as string]),
    ),
    commodityCategories: new Map(
      (categories.data ?? []).map((c) => [c.id as number, c.name as string]),
    ),
    marketNames: new Map((markets.data ?? []).map((m) => [m.id as number, m.name as string])),
    stateNames: new Map((states.data ?? []).map((s) => [s.id as number, s.name as string])),
    unitNames: new Map((units.data ?? []).map((u) => [u.id as number, u.name as string])),
    gradeNames: new Map((grades.data ?? []).map((g) => [g.id as number, g.name as string])),
    varietyNames: new Map((varieties.data ?? []).map((v) => [v.id as number, v.name as string])),
  };
}

/* --------------------------------------------------------------- markets -- */

/**
 * The markets the agent is assigned to, with the scope and the schedule.
 *
 * A paused or ended assignment is still returned, with its status, so the
 * agent can see that a market left their coverage rather than finding it
 * silently missing.
 */
export async function getFieldMarkets(userId: string): Promise<FieldMarket[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const today = operationalToday();

  const [assignments, states, zones, scope, schedules, observations, tasks] = await Promise.all([
    supabase
      .from('market_agent_assignments')
      .select('market_id, status, starts_on, ends_on')
      .eq('user_id', userId),
    supabase.from('states').select('id, name').limit(200),
    supabase.from('market_zones').select('id, name').limit(200),
    supabase.from('market_commodity_scope').select('market_id, commodity_id, is_primary'),
    supabase.from('market_collection_schedules').select(
      'market_id, frequency, window_start, window_end, deadline_time, required_price_types, evidence_required, expected_observations, priority, is_active',
    ),
    supabase
      .from('price_observations')
      .select('id, market_id, collected_at')
      .eq('agent_user_id', userId)
      .order('collected_at', { ascending: false })
      .limit(500),
    supabase
      .from('collection_tasks')
      .select('id, market_id, status, due_on')
      .eq('assigned_to', userId),
  ]);

  const assignmentRows = assignments.data ?? [];
  if (assignmentRows.length === 0) return [];

  const marketIds = assignmentRows.map((a) => a.market_id as number);

  const marketsResult = await supabase
    .from('markets')
    .select('id, name, address, state_id, market_zone_id, is_active, collection_instructions')
    .in('id', marketIds);

  const marketRows = (marketsResult.data ?? []) as Row[];
  if (marketRows.length === 0) return [];

  const stateNames = new Map(
    (states.data ?? []).map((s) => [s.id as number, s.name as string]),
  );
  const zoneNames = new Map((zones.data ?? []).map((z) => [z.id as number, z.name as string]));
  const reference = await loadReference();

  const scopeRows = (scope.data ?? []) as Row[];
  const scheduleRows = (schedules.data ?? []) as Row[];
  const observationRows = (observations.data ?? []) as Row[];
  const taskRows = (tasks.data ?? []) as Row[];

  return marketRows.map((market) => {
    const id = market.id as number;
    const marketScope = scopeRows.filter((row) => row.market_id === id);
    const schedule = scheduleRows.find(
      (row) => row.market_id === id && row.is_active === true,
    );
    const marketObservations = observationRows.filter((row) => row.market_id === id);
    const assignment = assignmentRows.find((row) => row.market_id === id);

    return {
      ...EMPTY_MARKET,
      id,
      name: (market.name as string) ?? `Market #${id}`,
      address: str(market.address),
      stateName: stateNames.get(market.state_id as number) ?? null,
      zoneName: zoneNames.get(market.market_zone_id as number) ?? null,
      isActive: bool(market.is_active),
      collectionInstructions: str(market.collection_instructions),
      commodityCount: marketScope.length,
      commodityNames: marketScope.map(
        (row) => reference.commodityNames.get(row.commodity_id as number) ?? '',
      ),
      scheduled: Boolean(schedule),
      frequency: schedule ? (schedule.frequency as string) : null,
      windowStart: schedule ? str(schedule.window_start) : null,
      windowEnd: schedule ? str(schedule.window_end) : null,
      deadlineTime: schedule ? str(schedule.deadline_time) : null,
      requiredPriceTypes: schedule ? list<string>(schedule.required_price_types) : [],
      evidenceRequired: schedule ? bool(schedule.evidence_required) : false,
      expectedObservations: schedule ? Number(schedule.expected_observations ?? 0) : 0,
      priority: schedule ? (schedule.priority as string) : null,
      assignmentStatus: assignment ? (assignment.status as string) : null,
      lastCollectionAt:
        marketObservations.length > 0 ? (marketObservations[0].collected_at as string) : null,
      collectedToday: marketObservations.filter(
        (row) => String(row.collected_at).slice(0, 10) === today,
      ).length,
      openTaskCount: taskRows.filter(
        (row) =>
          row.market_id === id &&
          !['completed', 'cancelled', 'skipped'].includes(String(row.status)),
      ).length,
    } satisfies FieldMarket;
  });
}

/* ----------------------------------------------------------- assignments -- */

/**
 * The agent's collection tasks, as assignments.
 *
 * A task and an assignment are different things and are kept apart
 * throughout: a task can be **submitted** — the agent did the work and sent
 * it — while its observations are still **awaiting review**. Nothing here
 * reports a task as verified because it was submitted.
 */
export async function getFieldAssignments(userId: string): Promise<FieldAssignment[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();

  const [tasks, observations] = await Promise.all([
    supabase
      .from('collection_tasks')
      .select(
        'id, market_id, commodity_id, assigned_to, due_on, deadline_at, status, priority, notes, schedule_id, expected_commodity_ids, started_at, submitted_at, completed_at',
      )
      .eq('assigned_to', userId)
      .order('due_on', { ascending: false })
      .limit(300),
    supabase
      .from('price_observations')
      .select('id, market_id, verification_status, submitted_at, collected_at')
      .eq('agent_user_id', userId)
      .limit(1000),
  ]);

  const taskRows = (tasks.data ?? []) as Row[];
  const observationRows = (observations.data ?? []) as Row[];
  const reference = await loadReference();

  const now = Date.now();

  return taskRows.map((task) => {
    const marketId = task.market_id as number;
    const commodityIds = list<number>(task.expected_commodity_ids);
    const ifCommodity = task.commodity_id ? [task.commodity_id as number] : [];
    const covered = commodityIds.length > 0 ? commodityIds : ifCommodity;

    const marketObservations = observationRows.filter((row) => row.market_id === marketId);
    const deadlineAt = str(task.deadline_at);
    const closed = ['completed', 'cancelled', 'skipped'].includes(String(task.status));

    return {
      id: task.id as number,
      marketId,
      marketName: reference.marketNames.get(marketId) ?? `Market #${marketId}`,
      marketAddress: null,
      stateName: null,
      commodityNames: covered.map(
        (id) => reference.commodityNames.get(id) ?? `Commodity #${id}`,
      ),
      dueOn: task.due_on as string,
      deadlineAt,
      priority: str(task.priority),
      status: task.status as string,
      expectedCount: covered.length,
      submittedCount: marketObservations.filter((row) => row.submitted_at).length,
      approvedCount: marketObservations.filter(
        (row) => row.verification_status === 'verified',
      ).length,
      isOverdue:
        Boolean(deadlineAt) && new Date(deadlineAt as string).getTime() < now && !closed,
      notes: str(task.notes),
      scheduleId: num(task.schedule_id),
      startedAt: str(task.started_at),
      submittedAt: str(task.submitted_at),
      completedAt: str(task.completed_at),
    } satisfies FieldAssignment;
  });
}

/** One assignment, with everything the agent needs to act on it. */
export async function getFieldAssignment(
  userId: string,
  taskId: number,
): Promise<FieldAssignmentDetail | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();

  const { data: task } = await supabase
    .from('collection_tasks')
    .select(
      'id, market_id, commodity_id, assigned_to, due_on, deadline_at, status, priority, notes, schedule_id, expected_commodity_ids, started_at, submitted_at, completed_at',
    )
    .eq('id', taskId)
    .eq('assigned_to', userId)
    .maybeSingle();

  if (!task) return null;
  const row = task as Row;
  const marketId = row.market_id as number;

  const [marketResult, scheduleResult, eventsResult, observationsResult, reference] =
    await Promise.all([
      supabase
        .from('markets')
        .select('id, name, address, state_id, collection_instructions')
        .eq('id', marketId)
        .maybeSingle(),
      row.schedule_id
        ? supabase
            .from('market_collection_schedules')
            .select(
              'frequency, window_start, window_end, deadline_time, required_price_types, evidence_required, expected_observations',
            )
            .eq('id', row.schedule_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from('collection_task_events')
        .select('id, event_type, from_status, to_status, reason, created_at')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('price_observations')
        .select(
          'id, commodity_id, market_id, grade_id, reported_unit_id, price_type, reported_amount, currency_code, collected_at, submitted_at, verified_at, published_at, verification_status, notes, quality_flags, is_current, supersedes_id',
        )
        .eq('agent_user_id', userId)
        .eq('market_id', marketId)
        .order('collected_at', { ascending: false })
        .limit(100),
      loadReference(),
    ]);

  const market = (marketResult.data ?? null) as Row | null;
  const schedule = (scheduleResult.data ?? null) as Row | null;
  const statesResult = await supabase.from('states').select('id, name').limit(200);
  const stateNames = new Map(
    (statesResult.data ?? []).map((s) => [s.id as number, s.name as string]),
  );

  const covered = list<number>(row.expected_commodity_ids);
  const ifCommodity = row.commodity_id ? [row.commodity_id as number] : [];
  const commodityIds = covered.length > 0 ? covered : ifCommodity;

  const observations = (observationsResult.data ?? []) as Row[];
  const events = (eventsResult.data ?? []) as Row[];

  const assignment: FieldAssignmentDetail = {
    id: row.id as number,
    marketId,
    marketName: (market?.name as string) ?? reference.marketNames.get(marketId) ?? `Market #${marketId}`,
    marketAddress: str(market?.address),
    stateName: market?.state_id ? (stateNames.get(market.state_id as number) ?? null) : null,
    commodityNames: commodityIds.map(
      (id) => reference.commodityNames.get(id) ?? `Commodity #${id}`,
    ),
    dueOn: row.due_on as string,
    deadlineAt: str(row.deadline_at),
    priority: str(row.priority),
    status: row.status as string,
    expectedCount: commodityIds.length,
    submittedCount: observations.filter((o) => o.submitted_at).length,
    approvedCount: observations.filter((o) => o.verification_status === 'verified').length,
    isOverdue:
      Boolean(row.deadline_at) &&
      new Date(row.deadline_at as string).getTime() < Date.now() &&
      !['completed', 'cancelled', 'skipped'].includes(String(row.status)),
    notes: str(row.notes),
    scheduleId: num(row.schedule_id),
    startedAt: str(row.started_at),
    submittedAt: str(row.submitted_at),
    completedAt: str(row.completed_at),
    collectionInstructions: str(market?.collection_instructions),
    requiredPriceTypes: schedule ? list<string>(schedule.required_price_types) : [],
    evidenceRequired: schedule ? bool(schedule.evidence_required) : false,
    frequency: schedule ? (schedule.frequency as string) : null,
    windowStart: schedule ? str(schedule.window_start) : null,
    windowEnd: schedule ? str(schedule.window_end) : null,
    deadlineTime: schedule ? str(schedule.deadline_time) : null,
    gradeNames: [],
    unitNames: [],
    events: events.map((event) => ({
      id: event.id as number,
      eventType: event.event_type as string,
      fromStatus: str(event.from_status),
      toStatus: str(event.to_status),
      reason: str(event.reason),
      createdAt: event.created_at as string,
    })),
    observations: observations.map((observation) => ({
      ...mapObservation(observation, reference),
    })),
  };

  // The grades and units the agent may use for this market's commodities.
  if (commodityIds.length > 0) {
    const [grades, units] = await Promise.all([
      supabase
        .from('commodity_grades')
        .select('id, name, commodity_id')
        .in('commodity_id', commodityIds)
        .limit(200),
      supabase.from('measurement_units').select('id, name').limit(200),
    ]);
    assignment.gradeNames = (grades.data ?? []).map((g) => g.name as string);
    assignment.unitNames = (units.data ?? []).map((u) => u.name as string);
  }

  return assignment;
}

function mapObservation(observation: Row, reference: ReferenceData): FieldObservationSummary {
  const gradeId = num(observation.grade_id);
  const unitId = num(observation.reported_unit_id);
  return {
    id: observation.id as string,
    commodityId: observation.commodity_id as number,
    commodityName:
      reference.commodityNames.get(observation.commodity_id as number) ??
      `Commodity #${observation.commodity_id}`,
    marketId: observation.market_id as number,
    marketName:
      reference.marketNames.get(observation.market_id as number) ??
      `Market #${observation.market_id}`,
    gradeName: gradeId ? (reference.gradeNames.get(gradeId) ?? null) : null,
    unitName: unitId ? (reference.unitNames.get(unitId) ?? null) : null,
    priceType: observation.price_type as string,
    reportedAmount: num(observation.reported_amount),
    currencyCode: (observation.currency_code as string) ?? 'NGN',
    collectedAt: observation.collected_at as string,
    submittedAt: str(observation.submitted_at),
    verifiedAt: str(observation.verified_at),
    publishedAt: str(observation.published_at),
    verificationStatus: observation.verification_status as string,
    notes: str(observation.notes),
    reviewerNote: null,
    qualityFlags: list<string>(observation.quality_flags),
    evidenceCount: 0,
    isCurrent: observation.is_current !== false,
    supersedesId: str(observation.supersedes_id),
  };
}

/* ---------------------------------------------------------- observations -- */

/**
 * The agent's observations, with the filters the brief asks for.
 *
 * The filters are applied in the query, not in the browser, so a large
 * history does not have to travel to the device to be narrowed down.
 */
export async function getFieldObservations(
  userId: string,
  filters: {
    query?: string;
    status?: string;
    marketId?: number;
    commodityId?: number;
    from?: string;
    to?: string;
    limit?: number;
  } = {},
): Promise<FieldObservationSummary[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const reference = await loadReference();

  let query = supabase
    .from('price_observations')
    .select(
      'id, commodity_id, market_id, grade_id, reported_unit_id, price_type, reported_amount, currency_code, collected_at, submitted_at, verified_at, published_at, verification_status, notes, quality_flags, is_current, supersedes_id',
    )
    .eq('agent_user_id', userId);

  if (filters.status && filters.status !== 'all') query = query.eq('verification_status', filters.status);
  if (filters.marketId) query = query.eq('market_id', filters.marketId);
  if (filters.commodityId) query = query.eq('commodity_id', filters.commodityId);
  if (filters.from) query = query.gte('collected_at', `${filters.from}T00:00:00.000Z`);
  if (filters.to) query = query.lte('collected_at', `${filters.to}T23:59:59.999Z`);

  const { data } = await query
    .order('collected_at', { ascending: false })
    .limit(Math.min(filters.limit ?? 100, 300));

  let rows = (data ?? []) as Row[];

  // A text search across the names, which the database cannot do for us
  // because the names live in other tables.
  if (filters.query) {
    const needle = filters.query.trim().toLowerCase();
    if (needle) {
      rows = rows.filter((row) => {
        const commodity = reference.commodityNames.get(row.commodity_id as number) ?? '';
        const market = reference.marketNames.get(row.market_id as number) ?? '';
        return (
          commodity.toLowerCase().includes(needle) || market.toLowerCase().includes(needle)
        );
      });
    }
  }

  return rows.map((row) => mapObservation(row, reference));
}

/** One observation, with its full history. */
export async function getFieldObservation(
  userId: string,
  observationId: string,
): Promise<FieldObservationDetail | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const reference = await loadReference();

  const { data: observation } = await supabase
    .from('price_observations')
    .select(
      'id, commodity_id, market_id, variety_id, grade_id, reported_unit_id, price_type, reported_amount, package_weight_kg, package_count, currency_code, collected_at, submitted_at, verified_at, published_at, verification_status, notes, quality_flags, is_current, supersedes_id',
    )
    .eq('id', observationId)
    .eq('agent_user_id', userId)
    .maybeSingle();

  if (!observation) return null;
  const row = observation as Row;

  const [eventsResult, revisionsResult, evidenceResult, findingsResult] = await Promise.all([
    supabase
      .from('price_verification_events')
      .select('id, action, reason, notes, created_at')
      .eq('observation_id', observationId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('price_revision_history')
      .select('id, revision_number, change_reason, before_data, after_data, created_at')
      .eq('observation_id', observationId)
      .order('revision_number', { ascending: false })
      .limit(20),
    supabase
      .from('price_observation_evidence')
      .select('id, file_name, caption, content_type, byte_size, created_at')
      .eq('observation_id', observationId)
      .limit(20),
    supabase
      .from('observation_quality_findings')
      .select('rule_code, severity, message, evaluated_at')
      .eq('observation_id', observationId)
      .limit(20),
  ]);

  const events = (eventsResult.data ?? []) as Row[];
  const corrections = events.filter((event) => event.action === 'correction_requested');
  const summary = mapObservation(row, reference);

  return {
    ...summary,
    packageWeightKg: num(row.package_weight_kg),
    packageCount: num(row.package_count),
    varietyName: row.variety_id
      ? (reference.varietyNames.get(row.variety_id as number) ?? null)
      : null,
    reviewerNote:
      (corrections[0]?.reason as string | undefined) ??
      (events.find((event) => event.action === 'rejected')?.reason as string | undefined) ??
      null,
    events: events.map((event) => ({
      id: event.id as number,
      eventType: event.action as string,
      fromStatus: null,
      toStatus: null,
      reason: str(event.reason) ?? str(event.notes),
      createdAt: event.created_at as string,
    })),
    revisions: (revisionsResult.data ?? []).map((revision) => ({
      id: revision.id as number,
      revisionNumber: revision.revision_number as number,
      changeReason: str(revision.change_reason),
      beforeData: (revision.before_data ?? {}) as Record<string, unknown>,
      afterData: (revision.after_data ?? {}) as Record<string, unknown>,
      createdAt: revision.created_at as string,
    })),
    evidence: (evidenceResult.data ?? []).map((evidence) => ({
      id: evidence.id as number,
      fileName: evidence.file_name as string,
      caption: str(evidence.caption),
      contentType: evidence.content_type as string,
      byteSize: evidence.byte_size as number,
      createdAt: evidence.created_at as string,
    })),
    findings: (findingsResult.data ?? []).map((finding) => ({
      ruleCode: finding.rule_code as string,
      severity: finding.severity as string,
      message: finding.message as string,
      evaluatedAt: finding.evaluated_at as string,
    })),
    requiresAction: summary.verificationStatus === 'correction_requested',
  };
}

/* ----------------------------------------------------------- corrections -- */

/** The correction requests waiting for the agent. */
export async function getFieldCorrections(userId: string): Promise<FieldCorrection[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const reference = await loadReference();

  const { data } = await supabase
    .from('price_observations')
    .select(
      'id, commodity_id, market_id, grade_id, reported_unit_id, price_type, reported_amount, currency_code, collected_at, submitted_at, verified_at, published_at, verification_status, notes, quality_flags, is_current, supersedes_id',
    )
    .eq('agent_user_id', userId)
    .eq('verification_status', 'correction_requested')
    .order('collected_at', { ascending: false })
    .limit(100);

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id as string);
  const eventsResult = await supabase
    .from('price_verification_events')
    .select('observation_id, action, reason, created_at')
    .in('observation_id', ids)
    .eq('action', 'correction_requested')
    .order('created_at', { ascending: false });

  const reasons = new Map<string, { reason: string | null; at: string | null }>();
  for (const event of (eventsResult.data ?? []) as Row[]) {
    const key = event.observation_id as string;
    if (!reasons.has(key)) {
      reasons.set(key, { reason: str(event.reason), at: str(event.created_at) });
    }
  }

  return rows.map((row) => {
    const summary = mapObservation(row, reference);
    const feedback = reasons.get(summary.id);
    return {
      observation: summary,
      reason: feedback?.reason ?? null,
      requestedAt: feedback?.at ?? null,
    };
  });
}

/* --------------------------------------------------------------- history -- */

/**
 * The agent's collection sessions.
 *
 * A session is one market visit. The application records one in
 * `collection_batches`; the counts beside it come from the observations the
 * agent submitted at that market.
 */
export async function getFieldHistory(userId: string): Promise<FieldSession[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const reference = await loadReference();

  const [batches, visits, observations] = await Promise.all([
    supabase
      .from('collection_batches')
      .select('id, reference, market_id, started_at, completed_at, notes')
      .eq('agent_user_id', userId)
      .order('started_at', { ascending: false })
      .limit(100),
    supabase
      .from('market_visit_records')
      .select('id, market_id, visited_at, observations_count, market_conditions, notes')
      .eq('agent_user_id', userId)
      .order('visited_at', { ascending: false })
      .limit(100),
    supabase
      .from('price_observations')
      .select('id, market_id, verification_status, collected_at')
      .eq('agent_user_id', userId)
      .limit(1000),
  ]);

  const observationRows = (observations.data ?? []) as Row[];

  const sessionRows = (batches.data ?? []) as Row[];
  if (sessionRows.length > 0) {
    return sessionRows.map((batch) => {
      const marketId = batch.market_id as number;
      const marketObservations = observationRows.filter((row) => row.market_id === marketId);
      return {
        id: batch.id as number,
        reference: batch.reference as string,
        marketId,
        marketName: reference.marketNames.get(marketId) ?? `Market #${marketId}`,
        startedAt: batch.started_at as string,
        completedAt: str(batch.completed_at),
        observationsCount: marketObservations.length,
        submittedCount: marketObservations.filter((row) => row.submitted_at).length,
        approvedCount: marketObservations.filter(
          (row) => row.verification_status === 'verified',
        ).length,
        correctionCount: marketObservations.filter(
          (row) => row.verification_status === 'correction_requested',
        ).length,
        notes: str(batch.notes),
      } satisfies FieldSession;
    });
  }

  // Before a session object existed, the market visit is the record of a
  // market visit. It is shown rather than an empty page.
  return ((visits.data ?? []) as Row[]).map((visit) => {
    const marketId = visit.market_id as number;
    const marketObservations = observationRows.filter((row) => row.market_id === marketId);
    return {
      id: visit.id as number,
      reference: `VISIT-${visit.id}`,
      marketId,
      marketName: reference.marketNames.get(marketId) ?? `Market #${marketId}`,
      startedAt: visit.visited_at as string,
      completedAt: null,
      observationsCount:
        num(visit.observations_count) ?? marketObservations.length,
      submittedCount: marketObservations.filter((row) => row.submitted_at).length,
      approvedCount: marketObservations.filter(
        (row) => row.verification_status === 'verified',
      ).length,
      correctionCount: marketObservations.filter(
        (row) => row.verification_status === 'correction_requested',
      ).length,
      notes: str(visit.notes),
    } satisfies FieldSession;
  });
}

/* ---------------------------------------------------------- performance -- */

/**
 * The agent's performance, measured from the records.
 *
 * Every figure is a count of rows. There is no score, no benchmark and no
 * invented target: the brief is explicit that performance must not encourage
 * inaccurate submissions, so a composite score is deliberately absent. The
 * period is stated on the surface so the figures can be interpreted.
 */
export async function getFieldPerformance(
  userId: string,
  from: string,
  to: string,
): Promise<FieldPerformance> {
  const periodLabel = `${from} to ${to}`;

  const empty: FieldPerformance = {
    periodLabel,
    from,
    to,
    assignedTasks: 0,
    completedTasks: 0,
    onTimeTasks: 0,
    lateTasks: 0,
    overdueTasks: 0,
    observationsSubmitted: 0,
    observationsApproved: 0,
    observationsPending: 0,
    observationsRejected: 0,
    correctionsRequired: 0,
    approvalRate: null,
    correctionRate: null,
    marketsCovered: 0,
    commoditiesCovered: 0,
    daily: [],
  };

  if (!isSupabaseConfigured()) return empty;

  const supabase = await createClient();

  const [tasksResult, observationsResult] = await Promise.all([
    supabase
      .from('collection_tasks')
      .select('id, market_id, status, due_on, deadline_at, submitted_at, completed_at, expected_commodity_ids')
      .eq('assigned_to', userId)
      .gte('due_on', from)
      .lte('due_on', to),
    supabase
      .from('price_observations')
      .select('id, market_id, commodity_id, verification_status, submitted_at, collected_at')
      .eq('agent_user_id', userId)
      .gte('collected_at', `${from}T00:00:00.000Z`)
      .lte('collected_at', `${to}T23:59:59.999Z`),
  ]);

  const tasks = (tasksResult.data ?? []) as Row[];
  const observations = (observationsResult.data ?? []) as Row[];

  const closed = ['completed', 'cancelled', 'skipped'];
  const completedTasks = tasks.filter((task) => !closed.includes(String(task.status)));
  const onTime = completedTasks.filter((task) => {
    const deadline = str(task.deadline_at);
    const submitted = str(task.submitted_at) ?? str(task.completed_at);
    if (!deadline || !submitted) return false;
    return new Date(submitted).getTime() <= new Date(deadline).getTime();
  });

  const submitted = observations.filter((row) => row.submitted_at);
  const approved = observations.filter((row) => row.verification_status === 'verified');
  const pending = observations.filter((row) =>
    ['submitted', 'pending_verification', 'awaiting_review'].includes(
      String(row.verification_status),
    ),
  );
  const rejected = observations.filter((row) => row.verification_status === 'rejected');
  const corrections = observations.filter(
    (row) => row.verification_status === 'correction_requested',
  );

  const dailyMap = new Map<string, { submitted: number; approved: number }>();
  for (const row of observations) {
    const date = String(row.collected_at).slice(0, 10);
    if (!dailyMap.has(date)) dailyMap.set(date, { submitted: 0, approved: 0 });
    const entry = dailyMap.get(date)!;
    if (row.submitted_at) entry.submitted += 1;
    if (row.verification_status === 'verified') entry.approved += 1;
  }

  const daily = [...dailyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }));

  return {
    periodLabel,
    from,
    to,
    assignedTasks: tasks.length,
    completedTasks: completedTasks.length,
    onTimeTasks: onTime.length,
    lateTasks: completedTasks.length - onTime.length,
    overdueTasks: tasks.filter((task) => {
      const deadline = str(task.deadline_at);
      return (
        Boolean(deadline) &&
        new Date(deadline as string).getTime() < Date.now() &&
        closed.includes(String(task.status))
      );
    }).length,
    observationsSubmitted: submitted.length,
    observationsApproved: approved.length,
    observationsPending: pending.length,
    observationsRejected: rejected.length,
    correctionsRequired: corrections.length,
    approvalRate:
      submitted.length > 0 ? Math.round((approved.length / submitted.length) * 100) : null,
    correctionRate:
      submitted.length > 0 ? Math.round((corrections.length / submitted.length) * 100) : null,
    marketsCovered: new Set(observations.map((row) => row.market_id)).size,
    commoditiesCovered: new Set(observations.map((row) => row.commodity_id)).size,
    daily,
  };
}

/* ------------------------------------------------------------------ home -- */

/**
 * The agent's operations overview.
 *
 * Every figure is derived from the records the agent is allowed to see. The
 * counters are grouped so the agent can tell "not yet collected" apart from
 * "collected but not yet reviewed" — the distinction the brief asks for.
 */
export async function getFieldHome(userId: string): Promise<FieldHome> {
  const today = operationalToday();

  const home: FieldHome = {
    configured: isSupabaseConfigured(),
    today,
    agentName: 'Agent',
    region: null,
    employeeCode: null,
    alternatePhone: null,
    accountStatus: null,
    markets: [],
    tasksToday: [],
    upcoming: [],
    completedToday: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    corrections: [],
    drafts: [],
    pendingSubmissions: 0,
    approvedCount: 0,
    unreadNotifications: 0,
    recentActivity: [],
    notices: [],
    lastSyncedAt: null,
  };

  if (!home.configured) return home;

  const supabase = await createClient();

  const [profileResult, agentProfileResult, observationsResult, notificationsResult] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('full_name, account_status')
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('agent_profiles')
        .select('employee_code, region, employment_status, alternate_phone')
        .eq('profile_id', userId)
        .maybeSingle(),
      supabase
        .from('price_observations')
        .select(
          'id, commodity_id, market_id, grade_id, reported_unit_id, price_type, reported_amount, currency_code, collected_at, submitted_at, verified_at, published_at, verification_status, notes, quality_flags, is_current, supersedes_id',
        )
        .eq('agent_user_id', userId)
        .order('collected_at', { ascending: false })
        .limit(200),
      supabase
        .from('notifications')
        .select('id, kind, severity, title, body, action_url, read_at, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

  home.agentName = (profileResult.data?.full_name as string) ?? 'Agent';
  home.accountStatus = (profileResult.data?.account_status as string) ?? null;
  home.employeeCode = (agentProfileResult.data?.employee_code as string) ?? null;
  home.region = (agentProfileResult.data?.region as string) ?? null;
  home.alternatePhone = (agentProfileResult.data?.alternate_phone as string) ?? null;

  const [markets, assignments, corrections] = await Promise.all([
    getFieldMarkets(userId),
    getFieldAssignments(userId),
    getFieldCorrections(userId),
  ]);

  home.markets = markets;
  home.corrections = corrections;

  home.tasksToday = assignments.filter((task) => task.dueOn === today);
  home.upcoming = assignments
    .filter((task) => task.dueOn > today && !['completed', 'cancelled', 'skipped'].includes(task.status))
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn))
    .slice(0, 8);
  home.completedToday = home.tasksToday.filter((task) => task.status === 'completed').length;
  home.pendingTasks = home.tasksToday.filter(
    (task) => !['completed', 'cancelled', 'skipped'].includes(task.status),
  ).length;
  home.overdueTasks = assignments.filter(
    (task) => task.isOverdue && !['completed', 'cancelled', 'skipped'].includes(task.status),
  ).length;

  const reference = await loadReference();
  const observations = (observationsResult.data ?? []) as Row[];
  const summaries = observations.map((row) => mapObservation(row, reference));

  home.drafts = summaries.filter((row) => row.verificationStatus === 'draft');
  home.pendingSubmissions = summaries.filter((row) =>
    ['submitted', 'pending_verification'].includes(row.verificationStatus),
  ).length;
  home.approvedCount = summaries.filter((row) => row.verificationStatus === 'verified').length;
  home.lastSyncedAt = summaries.find((row) => row.submittedAt)?.submittedAt ?? null;

  const notifications = (notificationsResult.data ?? []) as Row[];
  home.unreadNotifications = notifications.filter((row) => !row.read_at).length;

  // Operational notices: the administrator's announcements and instructions.
  home.notices = notifications
    .filter((row) =>
      ['system_alert', 'assignment_changed', 'market_unassigned', 'coverage_gap'].includes(
        String(row.kind),
      ),
    )
    .slice(0, 5)
    .map((row) => ({
      id: row.id as string,
      title: row.title as string,
      body: str(row.body),
      kind: row.kind as string,
      severity: (row.severity as string) ?? 'normal',
      createdAt: row.created_at as string,
      actionUrl: str(row.action_url),
    }));

  // Recent activity: the agent's own latest actions, newest first.
  const taskEvents = assignments.slice(0, 3).map((task) => ({
    id: `task-${task.id}`,
    kind: 'task' as const,
    title: task.marketName,
    detail:
      task.status === 'completed'
        ? 'Collection task completed'
        : task.status === 'submitted'
          ? 'Collection task submitted for review'
          : 'Collection task assigned',
    status: task.status,
    at: task.completedAt ?? task.submittedAt ?? task.startedAt ?? task.dueOn,
  }));

  const observationActivity = summaries.slice(0, 5).map((row) => ({
    id: row.id,
    kind: 'observation' as const,
    title: `${row.commodityName} · ${row.marketName}`,
    detail:
      row.reportedAmount === null
        ? 'Price recorded'
        : `${row.currencyCode} ${row.reportedAmount.toLocaleString('en-NG')}${
            row.unitName ? ` per ${row.unitName}` : ''
          }`,
    status: row.verificationStatus,
    at: row.submittedAt ?? row.collectedAt,
  }));

  home.recentActivity = [...observationActivity, ...taskEvents]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 8);

  return home;
}

/* ------------------------------------------------------------- reference -- */

/** The measurement units an agent can record a price in. */
export async function getFieldUnits() {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('measurement_units')
    .select('id, code, name, is_specific, dimension')
    .order('code');
  return (data ?? []) as {
    id: number;
    code: string;
    name: string;
    is_specific: boolean;
    dimension: string;
  }[];
}

/** The grades available for a commodity. */
export async function getFieldGrades(commodityIds?: number[]) {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  // `commodity_grades` has no `is_active` and no `grade_code`. It used to be
  // filtered and selected on both, so this query failed outright and the
  // collection form opened with no grades to choose from. The catalogue is the
  // 58 rows migration 0023 seeded; every one of them is a grade the agent may
  // use, so there is nothing to filter out.
  const base = supabase
    .from('commodity_grades')
    .select('id, name, commodity_id')
    .order('name')
    .limit(500);

  const result =
    commodityIds && commodityIds.length > 0
      ? await base.in('commodity_id', commodityIds)
      : await base;

  return (result.data ?? []) as {
    id: number;
    name: string;
    commodity_id: number;
  }[];
}

/**
 * The commodities the agent may record.
 *
 * The list is the live catalogue, not a hard-coded set, and the commodities
 * the assigned market covers are listed first.
 */
export async function getFieldCommodities(marketId?: number) {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();

  const [commoditiesResult, scopeResult] = await Promise.all([
    supabase
      .from('commodities')
      .select('id, name, slug, category_id, is_active')
      .eq('is_active', true)
      .order('name')
      .limit(500),
    marketId
      ? supabase.from('market_commodity_scope').select('commodity_id').eq('market_id', marketId)
      : Promise.resolve({ data: [] as { commodity_id: number }[] }),
  ]);

  const scoped = new Set(
    ((scopeResult.data ?? []) as { commodity_id: number }[]).map((s) => s.commodity_id),
  );

  return ((commoditiesResult.data ?? []) as {
    id: number;
    name: string;
    slug: string;
    category_id: number;
    is_active: boolean;
  }[])
    .map((commodity) => ({ ...commodity, inScope: scoped.has(commodity.id) }))
    .sort((a, b) => Number(b.inScope) - Number(a.inScope) || a.name.localeCompare(b.name));
}

/** The commodities the agent collected today, for the freshness check. */
export async function getFieldTodaysCollected(userId: string) {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const today = operationalToday();
  const { data } = await supabase
    .from('price_observations')
    .select('id, commodity_id, market_id, reported_amount, submitted_at')
    .eq('agent_user_id', userId)
    .gte('collected_at', startOfOperationalDay(today))
    .lte('collected_at', endOfOperationalDay(today));
  return (data ?? []) as {
    id: string;
    commodity_id: number;
    market_id: number;
    reported_amount: number | null;
    submitted_at: string | null;
  }[];
}

/* ------------------------------------------------------- the session ----- */

export interface FieldSessionDetail {
  id: number;
  reference: string;
  marketId: number;
  marketName: string;
  startedAt: string;
  completedAt: string | null;
  notes: string | null;
  taskId: number | null;
  taskDueOn: string | null;
  observations: {
    id: string;
    commodityId: number;
    commodityName: string;
    gradeName: string | null;
    priceType: string;
    amount: number | null;
    unitName: string | null;
    currencyCode: string;
    collectedAt: string;
    submittedAt: string | null;
    verificationStatus: string;
    notes: string | null;
    qualityFlags: string[];
    evidenceCount: number;
    evidence: {
      id: number;
      fileName: string;
      caption: string | null;
      contentType: string;
      byteSize: number;
    }[];
    intelligence: {
      availability: string | null;
      supplyLevel: string | null;
      demandLevel: string | null;
      priceDirection: string | null;
      marketActivity: string | null;
      sentiment: string | null;
      developments: string | null;
    } | null;
  }[];
  expectedCommodities: { id: number; name: string; collected: boolean }[];
}

/**
 * One collection session, with everything in it.
 *
 * The session is read through the agent's own rows, so a session belonging to
 * somebody else returns nothing at all. The expected commodities come from
 * the market's scope and its schedule, so "have I covered everything" is
 * answered from the plan rather than from a guess.
 */
export async function getFieldSession(
  userId: string,
  batchId: number,
): Promise<FieldSessionDetail | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const reference = await loadReference();

  const { data: batch } = await supabase
    .from('collection_batches')
    .select('id, reference, market_id, agent_user_id, started_at, completed_at, notes')
    .eq('id', batchId)
    .eq('agent_user_id', userId)
    .maybeSingle();

  if (!batch) return null;

  const marketId = batch.market_id as number;

  const [taskResult, observationResult, scopeResult, scheduleResult] = await Promise.all([
    supabase
      .from('collection_tasks')
      .select('id, due_on, commodity_id, schedule_id')
      .eq('batch_id', batchId)
      .eq('assigned_to', userId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('price_observations')
      .select(
        'id, commodity_id, grade_id, price_type, reported_amount, reported_unit_id, currency_code, collected_at, submitted_at, verification_status, notes, collection_batch_id',
      )
      .eq('collection_batch_id', batchId)
      .eq('agent_user_id', userId)
      .order('collected_at', { ascending: true }),
    supabase.from('market_commodity_scope').select('commodity_id').eq('market_id', marketId),
    supabase
      .from('market_collection_schedules')
      .select('commodity_id, expected_observations')
      .eq('market_id', marketId)
      .eq('is_active', true),
  ]);

  const observations = (observationResult.data ?? []) as {
    id: string;
    commodity_id: number;
    grade_id: number | null;
    price_type: string;
    reported_amount: number | null;
    reported_unit_id: number | null;
    currency_code: string;
    collected_at: string;
    submitted_at: string | null;
    verification_status: string;
    notes: string | null;
  }[];

  const observationIds = observations.map((observation) => observation.id);

  const [evidenceResult, intelligenceResult, findingsResult] = await Promise.all([
    observationIds.length > 0
      ? supabase
          .from('price_observation_evidence')
          .select('id, observation_id, file_name, caption, content_type, byte_size')
          .in('observation_id', observationIds)
      : Promise.resolve({
          data: [] as {
            id: number;
            observation_id: string;
            file_name: string;
            caption: string | null;
            content_type: string;
            byte_size: number;
          }[],
        }),
    observationIds.length > 0
      ? supabase
          .from('observation_market_intelligence')
          .select(
            'observation_id, availability, supply_level, demand_level, price_direction, market_activity, sentiment, developments',
          )
          .in('observation_id', observationIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    observationIds.length > 0
      ? supabase
          .from('observation_quality_findings')
          .select('observation_id, rule_code')
          .in('observation_id', observationIds)
      : Promise.resolve({ data: [] as { observation_id: string; rule_code: string }[] }),
  ]);

  const evidenceCounts = new Map<string, number>();
  const evidenceByObservation = new Map<
    string,
    FieldSessionDetail['observations'][number]['evidence']
  >();
  for (const row of (evidenceResult.data ?? []) as {
    id: number;
    observation_id: string;
    file_name: string;
    caption: string | null;
    content_type: string;
    byte_size: number;
  }[]) {
    evidenceCounts.set(
      row.observation_id,
      (evidenceCounts.get(row.observation_id) ?? 0) + 1,
    );
    const list = evidenceByObservation.get(row.observation_id) ?? [];
    list.push({
      id: row.id,
      fileName: row.file_name,
      caption: row.caption,
      contentType: row.content_type,
      byteSize: row.byte_size,
    });
    evidenceByObservation.set(row.observation_id, list);
  }

  const findingsByObservation = new Map<string, string[]>();
  for (const row of (findingsResult.data ?? []) as {
    observation_id: string;
    rule_code: string;
  }[]) {
    const list = findingsByObservation.get(row.observation_id) ?? [];
    list.push(row.rule_code);
    findingsByObservation.set(row.observation_id, list);
  }

  const intelligenceByObservation = new Map<
    string,
    NonNullable<FieldSessionDetail['observations'][number]['intelligence']>
  >();
  for (const row of (intelligenceResult.data ?? []) as {
    observation_id: string;
    availability: string | null;
    supply_level: string | null;
    demand_level: string | null;
    price_direction: string | null;
    market_activity: string | null;
    sentiment: string | null;
    developments: string | null;
  }[]) {
    intelligenceByObservation.set(row.observation_id, {
      availability: row.availability,
      supplyLevel: row.supply_level,
      demandLevel: row.demand_level,
      priceDirection: row.price_direction,
      marketActivity: row.market_activity,
      sentiment: row.sentiment,
      developments: row.developments,
    });
  }

  const collected = new Set(observations.map((observation) => observation.commodity_id));

  const scopedIds = new Set(
    ((scopeResult.data ?? []) as { commodity_id: number }[]).map((row) => row.commodity_id),
  );
  const scheduledIds = (
    (scheduleResult.data ?? []) as { commodity_id: number | null }[]
  )
    .map((row) => row.commodity_id)
    .filter((id): id is number => typeof id === 'number');

  const expectedIds = new Set<number>([...scopedIds, ...scheduledIds]);

  let expectedCommodities: { id: number; name: string; collected: boolean }[] = [];
  if (expectedIds.size > 0) {
    const { data: expectedRows } = await supabase
      .from('commodities')
      .select('id, name')
      .in('id', [...expectedIds])
      .order('name');
    expectedCommodities = ((expectedRows ?? []) as { id: number; name: string }[]).map(
      (commodity) => ({
        id: commodity.id,
        name: commodity.name,
        collected: collected.has(commodity.id),
      }),
    );
  }

  const task = taskResult.data as {
    id: number;
    due_on: string | null;
    commodity_id: number | null;
    schedule_id: number | null;
  } | null;

  return {
    id: batch.id as number,
    reference: batch.reference as string,
    marketId,
    marketName: reference.marketNames.get(marketId) ?? 'Unknown market',
    startedAt: batch.started_at as string,
    completedAt: (batch.completed_at as string | null) ?? null,
    notes: (batch.notes as string | null) ?? null,
    taskId: task?.id ?? null,
    taskDueOn: task?.due_on ?? null,
    observations: observations.map((observation) => ({
      id: observation.id,
      commodityId: observation.commodity_id,
      commodityName:
        reference.commodityNames.get(observation.commodity_id) ?? 'Unknown commodity',
      gradeName: observation.grade_id
        ? (reference.gradeNames.get(observation.grade_id) ?? null)
        : null,
      priceType: observation.price_type,
      amount: observation.reported_amount,
      unitName: observation.reported_unit_id
        ? (reference.unitNames.get(observation.reported_unit_id) ?? null)
        : null,
      currencyCode: observation.currency_code,
      collectedAt: observation.collected_at,
      submittedAt: observation.submitted_at ?? null,
      verificationStatus: observation.verification_status,
      notes: observation.notes ?? null,
      qualityFlags: findingsByObservation.get(observation.id) ?? [],
      evidenceCount: evidenceCounts.get(observation.id) ?? 0,
      evidence: evidenceByObservation.get(observation.id) ?? [],
      intelligence: intelligenceByObservation.get(observation.id) ?? null,
    })),
    expectedCommodities,
  };
}

/** The sessions this agent has opened, newest first. */
export async function getFieldSessions(userId: string, limit = 20) {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const reference = await loadReference();
  const { data } = await supabase
    .from('collection_batches')
    .select('id, reference, market_id, started_at, completed_at, notes')
    .eq('agent_user_id', userId)
    .order('started_at', { ascending: false })
    .limit(limit);

  return ((data ?? []) as {
    id: number;
    reference: string;
    market_id: number;
    started_at: string;
    completed_at: string | null;
    notes: string | null;
  }[]).map((row) => ({
    id: row.id,
    reference: row.reference,
    marketId: row.market_id,
    marketName: reference.marketNames.get(row.market_id) ?? 'Unknown market',
    startedAt: row.started_at,
    completedAt: row.completed_at,
    notes: row.notes,
  }));
}
