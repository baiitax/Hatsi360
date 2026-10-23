import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { operationalToday, endOfOperationalDay, startOfOperationalDay } from '@/lib/analytics/format';

/**
 * Pluck Live — the agent's own operational data.
 *
 * Every query here is scoped to the signed-in agent by the database as well as
 * by the query: the agent's session is used, so Row Level Security applies.
 * An agent who changes a URL or a request payload gets nothing.
 */

export interface AgentMarket {
  id: number;
  name: string;
  address: string | null;
  stateName: string | null;
  isActive: boolean;
  commodityCount: number;
  scheduled: boolean;
  deadlineTime: string | null;
}

export interface AgentTask {
  id: number;
  marketId: number;
  marketName: string;
  commodityIds: number[];
  commodityNames: string[];
  dueOn: string;
  status: string;
  priority: string | null;
  deadlineAt: string | null;
  startedAt: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  expectedCount: number;
  isOverdue: boolean;
}

export interface AgentSubmission {
  id: string;
  commodityName: string;
  marketName: string;
  priceType: string;
  reportedAmount: number | null;
  unitCode: string | null;
  collectedAt: string;
  submittedAt: string | null;
  verificationStatus: string;
  reviewerNote: string | null;
  qualityFlags: string[];
}

export interface AgentHome {
  configured: boolean;
  today: string;
  agentName: string;
  markets: AgentMarket[];
  tasksToday: AgentTask[];
  openTasks: AgentTask[];
  completedToday: number;
  pendingTasks: number;
  corrections: AgentSubmission[];
  recentSubmissions: AgentSubmission[];
  lastSyncedAt: string | null;
}

const TASK_STATUS_LABELS: Record<string, string> = {
  open: 'To do',
  in_progress: 'In progress',
  submitted: 'Submitted',
  awaiting_review: 'Awaiting review',
  correction_required: 'Correction required',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function taskStatusLabel(status: string): string {
  return TASK_STATUS_LABELS[status] ?? status;
}

export async function getAgentHome(userId: string): Promise<AgentHome> {
  const today = operationalToday();

  const home: AgentHome = {
    configured: isSupabaseConfigured(),
    today,
    agentName: 'Agent',
    markets: [],
    tasksToday: [],
    openTasks: [],
    completedToday: 0,
    pendingTasks: 0,
    corrections: [],
    recentSubmissions: [],
    lastSyncedAt: null,
  };

  if (!home.configured) return home;

  const supabase = await createClient();

  const [profileResult, assignmentsResult, tasksResult, submissionsResult, commoditiesResult] =
    await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
      supabase
        .from('market_agent_assignments')
        .select('market_id, status, starts_on, ends_on')
        .eq('user_id', userId)
        .eq('status', 'active'),
      supabase
        .from('collection_tasks')
        .select(
          'id, market_id, commodity_id, assigned_to, due_on, status, priority, deadline_at, started_at, submitted_at, completed_at, expected_commodity_ids',
        )
        .eq('assigned_to', userId)
        .gte('due_on', today)
        .lte('due_on', today)
        .order('deadline_at', { ascending: true }),
      supabase
        .from('price_observations')
        .select(
          'id, commodity_id, market_id, price_type, reported_amount, reported_unit_id, collected_at, submitted_at, verification_status, notes, quality_flags',
        )
        .eq('agent_user_id', userId)
        .order('collected_at', { ascending: false })
        .limit(50),
      supabase.from('commodities').select('id, name, slug').limit(500),
    ]);

  home.agentName = profileResult.data?.full_name ?? 'Agent';

  const marketIds = (assignmentsResult.data ?? []).map((a) => a.market_id);
  const commodityNames = new Map(
    (commoditiesResult.data ?? []).map((c) => [c.id as number, c.name as string]),
  );

  const marketsResult = marketIds.length
    ? await supabase
        .from('markets')
        .select('id, name, address, state_id, is_active')
        .in('id', marketIds)
    : { data: [] as unknown[] };

  const statesResult = await supabase.from('states').select('id, name');
  const stateNames = new Map(
    (statesResult.data ?? []).map((s) => [s.id as number, s.name as string]),
  );

  const schedulesResult = marketIds.length
    ? await supabase
        .from('market_collection_schedules')
        .select('market_id, deadline_time, is_active, commodity_id')
        .in('market_id', marketIds)
        .eq('is_active', true)
    : { data: [] as unknown[] };

  const scopeResult = marketIds.length
    ? await supabase
        .from('market_commodity_scope')
        .select('market_id, commodity_id')
        .in('market_id', marketIds)
    : { data: [] as unknown[] };

  home.markets = (marketsResult.data as { id: number; name: string; address: string | null; state_id: number; is_active: boolean }[]).map(
    (market) => ({
      id: market.id,
      name: market.name,
      address: market.address,
      stateName: stateNames.get(market.state_id) ?? null,
      isActive: market.is_active,
      commodityCount: (scopeResult.data as { market_id: number; commodity_id: number }[]).filter(
        (s) => s.market_id === market.id,
      ).length,
      scheduled: (schedulesResult.data as { market_id: number }[]).some(
        (s) => s.market_id === market.id,
      ),
      deadlineTime:
        (schedulesResult.data as { market_id: number; deadline_time: string | null }[]).find(
          (s) => s.market_id === market.id,
        )?.deadline_time ?? null,
    }),
  );

  const marketNames = new Map(home.markets.map((m) => [m.id, m.name]));

  const tasks = (tasksResult.data ?? []) as {
    id: number;
    market_id: number;
    commodity_id: number | null;
    due_on: string;
    status: string;
    priority: string | null;
    deadline_at: string | null;
    started_at: string | null;
    submitted_at: string | null;
    completed_at: string | null;
    expected_commodity_ids: number[] | null;
  }[];

  const mapTask = (task: (typeof tasks)[number]): AgentTask => {
    const commodityIds = task.expected_commodity_ids?.length
      ? task.expected_commodity_ids
      : task.commodity_id
        ? [task.commodity_id]
        : [];
    return {
      id: task.id,
      marketId: task.market_id,
      marketName: marketNames.get(task.market_id) ?? `Market #${task.market_id}`,
      commodityIds,
      commodityNames: commodityIds.map((id) => commodityNames.get(id) ?? `Commodity #${id}`),
      dueOn: task.due_on,
      status: task.status,
      priority: task.priority,
      deadlineAt: task.deadline_at,
      startedAt: task.started_at,
      submittedAt: task.submitted_at,
      completedAt: task.completed_at,
      expectedCount: commodityIds.length,
      isOverdue:
        Boolean(task.deadline_at) &&
        new Date(task.deadline_at!).getTime() < Date.now() &&
        !['completed', 'submitted', 'cancelled'].includes(task.status),
    };
  };

  home.tasksToday = tasks.map(mapTask);
  home.openTasks = home.tasksToday.filter((t) => !['completed', 'cancelled'].includes(t.status));
  home.completedToday = home.tasksToday.filter((t) => t.status === 'completed').length;
  home.pendingTasks = home.openTasks.length;

  const submissions = (submissionsResult.data ?? []) as {
    id: string;
    commodity_id: number;
    market_id: number;
    price_type: string;
    reported_amount: number | null;
    reported_unit_id: number | null;
    collected_at: string;
    submitted_at: string | null;
    verification_status: string;
    notes: string | null;
    quality_flags: string[] | null;
  }[];

  const marketNamesAll = new Map(
    (
      await supabase.from('markets').select('id, name').limit(1000)
    ).data?.map((m) => [m.id as number, m.name as string]) ?? [],
  );

  home.recentSubmissions = submissions.slice(0, 10).map((s) => ({
    id: s.id,
    commodityName: commodityNames.get(s.commodity_id) ?? `Commodity #${s.commodity_id}`,
    marketName: marketNamesAll.get(s.market_id) ?? `Market #${s.market_id}`,
    priceType: s.price_type,
    reportedAmount: s.reported_amount,
    unitCode: null,
    collectedAt: s.collected_at,
    submittedAt: s.submitted_at,
    verificationStatus: s.verification_status,
    reviewerNote: s.notes,
    qualityFlags: s.quality_flags ?? [],
  }));

  home.corrections = home.recentSubmissions.filter(
    (s) => s.verificationStatus === 'correction_requested',
  );

  home.lastSyncedAt = submissions[0]?.submitted_at ?? null;

  return home;
}

/** Every task assigned to the agent, past and future. */
export async function getAgentTasks(userId: string): Promise<AgentTask[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();

  const [tasksResult, commoditiesResult, marketsResult] = await Promise.all([
    supabase
      .from('collection_tasks')
      .select(
        'id, market_id, commodity_id, assigned_to, due_on, status, priority, deadline_at, started_at, submitted_at, completed_at, expected_commodity_ids',
      )
      .eq('assigned_to', userId)
      .order('due_on', { ascending: false })
      .limit(200),
    supabase.from('commodities').select('id, name').limit(500),
    supabase.from('markets').select('id, name').limit(500),
  ]);

  const commodityNames = new Map(
    (commoditiesResult.data ?? []).map((c) => [c.id as number, c.name as string]),
  );
  const marketNames = new Map(
    (marketsResult.data ?? []).map((m) => [m.id as number, m.name as string]),
  );

  const today = operationalToday();

  return ((tasksResult.data ?? []) as {
    id: number;
    market_id: number;
    commodity_id: number | null;
    due_on: string;
    status: string;
    priority: string | null;
    deadline_at: string | null;
    started_at: string | null;
    submitted_at: string | null;
    completed_at: string | null;
    expected_commodity_ids: number[] | null;
  }[]).map((task) => {
    const commodityIds = task.expected_commodity_ids?.length
      ? task.expected_commodity_ids
      : task.commodity_id
        ? [task.commodity_id]
        : [];
    return {
      id: task.id,
      marketId: task.market_id,
      marketName: marketNames.get(task.market_id) ?? `Market #${task.market_id}`,
      commodityIds,
      commodityNames: commodityIds.map((id) => commodityNames.get(id) ?? `Commodity #${id}`),
      dueOn: task.due_on,
      status: task.status,
      priority: task.priority,
      deadlineAt: task.deadline_at,
      startedAt: task.started_at,
      submittedAt: task.submitted_at,
      completedAt: task.completed_at,
      expectedCount: commodityIds.length,
      isOverdue:
        Boolean(task.deadline_at) &&
        new Date(task.deadline_at!).getTime() < Date.now() &&
        !['completed', 'submitted', 'cancelled'].includes(task.status),
    };
  });
}

/** The agent's own submissions, with the reviewer's feedback. */
export async function getAgentSubmissions(userId: string): Promise<AgentSubmission[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();

  const [observationsResult, commoditiesResult, marketsResult, eventsResult] = await Promise.all([
    supabase
      .from('price_observations')
      .select(
        'id, commodity_id, market_id, price_type, reported_amount, reported_unit_id, collected_at, submitted_at, verification_status, notes, quality_flags',
      )
      .eq('agent_user_id', userId)
      .order('submitted_at', { ascending: false, nullsFirst: false })
      .limit(200),
    supabase.from('commodities').select('id, name').limit(500),
    supabase.from('markets').select('id, name').limit(500),
    supabase
      .from('price_verification_events')
      .select('observation_id, action, reason, created_at')
      .order('created_at', { ascending: false })
      .limit(500),
  ]);

  const commodityNames = new Map(
    (commoditiesResult.data ?? []).map((c) => [c.id as number, c.name as string]),
  );
  const marketNames = new Map(
    (marketsResult.data ?? []).map((m) => [m.id as number, m.name as string]),
  );

  const feedback = new Map<string, string>();
  for (const event of (eventsResult.data ?? []) as {
    observation_id: string;
    action: string;
    reason: string | null;
  }[]) {
    if (!feedback.has(event.observation_id) && event.reason) {
      feedback.set(event.observation_id, event.reason);
    }
  }

  return ((observationsResult.data ?? []) as {
    id: string;
    commodity_id: number;
    market_id: number;
    price_type: string;
    reported_amount: number | null;
    reported_unit_id: number | null;
    collected_at: string;
    submitted_at: string | null;
    verification_status: string;
    notes: string | null;
    quality_flags: string[] | null;
  }[]).map((observation) => ({
    id: observation.id,
    commodityName: commodityNames.get(observation.commodity_id) ?? `Commodity #${observation.commodity_id}`,
    marketName: marketNames.get(observation.market_id) ?? `Market #${observation.market_id}`,
    priceType: observation.price_type,
    reportedAmount: observation.reported_amount,
    unitCode: null,
    collectedAt: observation.collected_at,
    submittedAt: observation.submitted_at,
    verificationStatus: observation.verification_status,
    reviewerNote: feedback.get(observation.id) ?? observation.notes,
    qualityFlags: observation.quality_flags ?? [],
  }));
}

/** The commodity list an agent can choose from, with the market's scope first. */
export async function getAgentCommodities(marketId?: number) {
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
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  const scoped = new Set(
    (scopeResult.data as { commodity_id: number }[]).map((s) => s.commodity_id),
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

/** The measurement units an agent can choose from. */
export async function getAgentUnits() {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('measurement_units')
    .select('id, code, name, is_specific, dimension')
    .order('code');
  return data ?? [];
}

/** The commodities an agent collected today, for the freshness check. */
export async function getTodaysCollected(userId: string) {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const today = operationalToday();
  const { data } = await supabase
    .from('price_observations')
    .select('id, commodity_id, market_id, reported_amount, submitted_at')
    .eq('agent_user_id', userId)
    .gte('collected_at', startOfOperationalDay(today))
    .lte('collected_at', endOfOperationalDay(today));
  return data ?? [];
}
