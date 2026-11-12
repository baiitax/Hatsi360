import { METRIC_DEFINITIONS } from './definitions';
import {
  comparePeriods,
  operationalTimeOfDay,
  operationalToday,
  percentage,
  round,
} from './format';
import type {
  MetricValue,
  OperationalSnapshot,
  SnapshotAgent,
  SnapshotMarket,
  SnapshotObservation,
  SnapshotTask,
} from './types';

/**
 * GonaPulse — metric computation.
 *
 * Pure functions over a snapshot. No database, no React. Every number the
 * admin console shows is produced here, and every one of them is defined in
 * `definitions.ts`.
 *
 * The rules that keep the console honest:
 *   * A metric with no underlying records is `null`, not `0`.
 *   * A percentage with a zero denominator is `null`.
 *   * Cancelled tasks are excluded from every denominator.
 *   * The snapshot's own truncation is reported, never hidden.
 */

const TODAY = (snapshot: OperationalSnapshot) => operationalToday(new Date(snapshot.generatedAt));

/** Is this observation part of the current period? */
function isCurrentPeriod(observation: SnapshotObservation, snapshot: OperationalSnapshot): boolean {
  const day = observation.collected_at.slice(0, 10);
  return day >= snapshot.windows.currentFrom && day <= snapshot.windows.currentTo;
}

function agentName(snapshot: OperationalSnapshot, id: string | null): string {
  if (!id) return 'Unassigned';
  const agent = snapshot.agents.find((a) => a.id === id);
  return agent?.full_name ?? 'Unknown agent';
}

function marketName(snapshot: OperationalSnapshot, id: number): string {
  const market = snapshot.markets.find((m) => m.id === id);
  return market?.name ?? `Market #${id}`;
}

/** Tasks that count towards an agent's workload: cancelled work never does. */
function eligibleTasks(tasks: SnapshotTask[]): SnapshotTask[] {
  return tasks.filter((task) => task.status !== 'cancelled');
}

/* -------------------------------------------------------------- overview -- */

/** The observations collected inside a period. */
function observationsInPeriod(
  snapshot: OperationalSnapshot,
  from: string,
  to: string,
): SnapshotObservation[] {
  return snapshot.observations.filter((o) => {
    const day = o.collected_at.slice(0, 10);
    return day >= from && day <= to;
  });
}

/** The submissions made inside a period. */
function submissionsInPeriod(
  snapshot: OperationalSnapshot,
  from: string,
  to: string,
) {
  return snapshot.submissions.filter((s) => {
    if (!s.submitted_at) return false;
    const day = s.submitted_at.slice(0, 10);
    return day >= from && day <= to;
  });
}

/**
 * The raw numbers behind the overview cards, for one period.
 *
 * `referenceDay` is the "today" of the period being measured, so the previous
 * period is compared with itself rather than with a moving target.
 */
function overviewValues(
  snapshot: OperationalSnapshot,
  from: string,
  to: string,
  referenceDay: string,
): Record<string, number | null> {
  const observations = observationsInPeriod(snapshot, from, to);
  const submissions = submissionsInPeriod(snapshot, from, to);

  const observedMarketIds = new Set(
    observations.filter((o) => o.collected_at.slice(0, 10) === referenceDay).map((o) => o.market_id),
  );

  const marketsWithSchedule = new Set(snapshot.schedules.map((s) => s.market_id));
  const nowTime = operationalTimeOfDay(new Date(snapshot.generatedAt));
  const marketsOverdue = [...marketsWithSchedule].filter((marketId) => {
    if (observedMarketIds.has(marketId)) return false;
    const schedules = snapshot.schedules.filter((s) => s.market_id === marketId);
    return schedules.some((schedule) => (schedule.deadline_time ?? '16:00:00') < nowTime);
  }).length;

  const assignedMarketIds = new Set(
    snapshot.assignments.filter((a) => a.status === 'active').map((a) => a.market_id),
  );
  const marketsWithoutAgent = snapshot.markets.filter(
    (m) => m.is_active && !assignedMarketIds.has(m.id),
  ).length;

  const tasksInPeriod = eligibleTasks(snapshot.tasks).filter(
    (t) => t.due_on >= from && t.due_on <= to,
  );
  const tasksOnReferenceDay = tasksInPeriod.filter((t) => t.due_on === referenceDay);
  const agentsWithTasks = new Set(tasksOnReferenceDay.map((t) => t.assigned_to).filter(Boolean)).size;

  const submittedOnReferenceDay = submissions.filter(
    (s) => s.submitted_at && s.submitted_at.slice(0, 10) === referenceDay,
  );
  const agentsSubmitted = new Set(submittedOnReferenceDay.map((s) => s.agent_user_id).filter(Boolean)).size;

  return {
    markets_total: snapshot.counts.marketsTotal,
    markets_active: snapshot.counts.marketsActive,
    markets_observed_today: observedMarketIds.size,
    markets_overdue: marketsOverdue,
    markets_without_agent: marketsWithoutAgent,
    agents_total: snapshot.counts.agentsTotal,
    agents_active: snapshot.counts.agentsActive,
    agents_with_tasks_today: agentsWithTasks,
    agents_submitted_today: agentsSubmitted,
    observations_today: observations.filter((o) => o.collected_at.slice(0, 10) === referenceDay).length,
    observations_in_period: observations.length,
    observations_pending_verification: snapshot.counts.observationsPending,
    observations_approved: snapshot.counts.observationsApproved,
    observations_published: snapshot.counts.observationsPublished,
    observations_rejected: snapshot.counts.observationsRejected,
    records_flagged: snapshot.counts.qualityFlagsOpen,
    commodities_with_current_observations: snapshot.counts.commoditiesWithCurrent,
    markets_with_insufficient_coverage: null,
  };
}

/**
 * The overview metrics, each with its comparison against the previous period.
 *
 * Counters that describe the whole estate (how many markets exist, how many
 * agents there are) are point-in-time facts: they are compared with the same
 * fact, and the comparison is null because there is nothing meaningful to
 * compare them with.
 */
export function overviewMetrics(snapshot: OperationalSnapshot): MetricValue[] {
  const current = overviewValues(
    snapshot,
    snapshot.windows.currentFrom,
    snapshot.windows.currentTo,
    snapshot.windows.today,
  );
  const previous = overviewValues(
    snapshot,
    snapshot.windows.previousFrom,
    snapshot.windows.previousTo,
    snapshot.windows.previousTo,
  );

  return buildMetricValues(current, previous, 'overview');
}

/* ----------------------------------------------------------- productivity -- */

export interface AgentPerformanceRow {
  agentId: string;
  name: string;
  accountStatus: string;
  assignedMarkets: number;
  tasksEligible: number;
  tasksCompleted: number;
  taskCompletionRate: number | null;
  observationsSubmitted: number;
  observationsAccepted: number;
  observationsRejected: number;
  correctionsRequested: number;
  verificationAcceptanceRate: number | null;
  avgHoursToSubmission: number | null;
  avgHoursToVerification: number | null;
  reportingConsistency: number | null;
  consecutiveReportingDays: number;
  missedDeadlines: number;
  qualityWarningRate: number | null;
  duplicateRate: number | null;
  lastActivityAt: string | null;
}

export function agentPerformance(
  snapshot: OperationalSnapshot,
  agentId?: string,
): AgentPerformanceRow[] {
  const agents = snapshot.agents.filter((a) => (agentId ? a.id === agentId : true));

  return agents
    .map((agent) => buildAgentRow(snapshot, agent))
    .sort((a, b) => (b.observationsSubmitted ?? 0) - (a.observationsSubmitted ?? 0));
}

function buildAgentRow(snapshot: OperationalSnapshot, agent: SnapshotAgent): AgentPerformanceRow {
  const tasks = eligibleTasks(snapshot.tasks).filter((t) => t.assigned_to === agent.id);
  const submissions = snapshot.submissions.filter((s) => s.agent_user_id === agent.id);

  const completed = tasks.filter((t) => t.status === 'completed').length;
  const rejected = submissions.filter((s) => s.verification_status === 'rejected').length;
  const corrections = submissions.filter(
    (s) => s.verification_status === 'correction_requested',
  ).length;
  const accepted = submissions.filter((s) => s.verification_status === 'verified').length;

  const reviewed = accepted + rejected + corrections;

  const submissionHours = tasks
    .filter((t) => t.started_at && t.submitted_at)
    .map(
      (t) =>
        (new Date(t.submitted_at!).getTime() - new Date(t.started_at!).getTime()) / 3_600_000,
    );
  const verificationHours = submissions
    .filter((s) => s.submitted_at && s.verified_at)
    .map(
      (s) => (new Date(s.verified_at!).getTime() - new Date(s.submitted_at!).getTime()) / 3_600_000,
    );

  // Reporting consistency: the days the agent had work for, against the days
  // the agent actually reported on.
  const eligibleDays = new Set(tasks.map((t) => t.due_on));
  const reportedDays = new Set(
    submissions.map((s) => (s.collected_at ?? s.submitted_at ?? '').slice(0, 10)),
  );
  const consistency =
    eligibleDays.size === 0
      ? null
      : percentage([...eligibleDays].filter((d) => reportedDays.has(d)).length, eligibleDays.size);

  const missedDeadlines = tasks.filter(
    (t) =>
      t.deadline_at &&
      new Date(t.deadline_at).getTime() < Date.now() &&
      t.status !== 'completed' &&
      t.status !== 'submitted',
  ).length;

  const flagged = submissions.filter((s) => (s.quality_flags?.length ?? 0) > 0).length;
  const duplicates = submissions.filter((s) =>
    (s.quality_flags ?? []).includes('duplicate_suspected'),
  ).length;

  const lastActivityAt =
    submissions
      .map((s) => s.submitted_at)
      .filter((d): d is string => Boolean(d))
      .sort()
      .at(-1) ?? null;

  return {
    agentId: agent.id,
    name: agent.full_name ?? agentName(snapshot, agent.id),
    accountStatus: agent.account_status ?? 'active',
    assignedMarkets: new Set(
      snapshot.assignments.filter((a) => a.user_id === agent.id && a.status === 'active').map((a) => a.market_id),
    ).size,
    tasksEligible: tasks.length,
    tasksCompleted: completed,
    taskCompletionRate: percentage(completed, tasks.length),
    observationsSubmitted: submissions.length,
    observationsAccepted: accepted,
    observationsRejected: rejected,
    correctionsRequested: corrections,
    verificationAcceptanceRate: percentage(accepted, reviewed),
    avgHoursToSubmission: submissionHours.length
      ? round(submissionHours.reduce((a, b) => a + b, 0) / submissionHours.length, 1)
      : null,
    avgHoursToVerification: verificationHours.length
      ? round(verificationHours.reduce((a, b) => a + b, 0) / verificationHours.length, 1)
      : null,
    reportingConsistency: consistency,
    consecutiveReportingDays: consecutiveReportingDays([...eligibleDays], [...reportedDays]),
    missedDeadlines,
    qualityWarningRate: percentage(flagged, submissions.length),
    duplicateRate: percentage(duplicates, submissions.length),
    lastActivityAt,
  };
}

/**
 * The length of the unbroken run of reporting days, counting back from the
 * most recent reported day. Days with no eligible task are skipped rather
 * than breaking the run — an agent is not penalised for a market closure.
 */
export function consecutiveReportingDays(eligibleDays: string[], reportedDays: string[]): number {
  if (eligibleDays.length === 0) return 0;
  const sortedEligible = [...eligibleDays].sort();
  const reported = new Set(reportedDays);
  const lastEligible = sortedEligible.at(-1)!;
  if (!reported.has(lastEligible)) {
    // The most recent eligible day has not been reported yet: count back from
    // the last day that was.
    const reportedEligible = sortedEligible.filter((d) => reported.has(d));
    if (reportedEligible.length === 0) return 0;
    return consecutiveReportingDays(reportedEligible, reportedDays);
  }

  let streak = 0;
  for (let i = sortedEligible.length - 1; i >= 0; i -= 1) {
    if (reported.has(sortedEligible[i]!)) streak += 1;
    else break;
  }
  return streak;
}

/* -------------------------------------------------------------- coverage -- */

export interface MarketCoverageRow {
  marketId: number;
  name: string;
  active: boolean;
  priority: string | null;
  assignedAgents: number;
  scheduled: boolean;
  expected: number;
  collected: number;
  coverageRate: number | null;
  openTasks: number;
  overdueTasks: number;
  latestCollectionAt: string | null;
  latestPublicationAt: string | null;
  missingCommodities: number;
}

export function marketCoverage(snapshot: OperationalSnapshot): MarketCoverageRow[] {
  const today = TODAY(snapshot);

  return snapshot.markets
    .map((market) => {
      const schedules = snapshot.schedules.filter((s) => s.market_id === market.id);
      const tasks = eligibleTasks(snapshot.tasks).filter((t) => t.market_id === market.id);
      const observations = snapshot.observations.filter((o) => o.market_id === market.id);

      const expected = tasks.reduce(
        (sum, task) => sum + (task.expected_commodity_ids?.length ?? 1),
        0,
      );
      const collected = observations.length;
      const openTasks = tasks.filter((t) => t.status === 'open' || t.status === 'in_progress').length;
      const overdueTasks = tasks.filter(
        (t) =>
          t.due_on < today &&
          t.status !== 'completed' &&
          t.status !== 'submitted' &&
          t.status !== 'cancelled',
      ).length;

      const expectedCommodities = new Set(
        schedules.flatMap((s) => (s.commodity_id ? [s.commodity_id] : [])),
      );
      const reportedCommodities = new Set(observations.map((o) => o.commodity_id));

      return {
        marketId: market.id,
        name: market.name,
        active: market.is_active,
        priority: market.priority ?? 'normal',
        assignedAgents: new Set(
          snapshot.assignments
            .filter((a) => a.market_id === market.id && a.status === 'active')
            .map((a) => a.user_id),
        ).size,
        scheduled: schedules.length > 0,
        expected,
        collected,
        coverageRate: percentage(collected, expected),
        openTasks,
        overdueTasks,
        latestCollectionAt:
          observations.map((o) => o.collected_at).sort().at(-1) ?? null,
        latestPublicationAt:
          observations
            .filter((o) => o.published_at)
            .map((o) => o.published_at!)
            .sort()
            .at(-1) ?? null,
        missingCommodities: [...expectedCommodities].filter((c) => !reportedCommodities.has(c)).length,
      };
    })
    .sort((a, b) => (a.coverageRate ?? -1) - (b.coverageRate ?? -1));
}

/* --------------------------------------------------------------- trends -- */

export interface TrendPoint {
  date: string;
  collected: number;
  submitted: number;
  approved: number;
  rejected: number;
  medianHoursToVerification: number | null;
}

export function collectionTrends(snapshot: OperationalSnapshot): TrendPoint[] {
  const days: string[] = [];
  for (let i = 0; i < snapshot.windows.days; i += 1) {
    const day = new Date(
      new Date(`${snapshot.windows.currentFrom}T00:00:00Z`).getTime() + i * 86_400_000,
    )
      .toISOString()
      .slice(0, 10);
    days.push(day);
  }

  return days.map((date) => {
    const collected = snapshot.observations.filter((o) => o.collected_at.slice(0, 10) === date);
    const submitted = snapshot.submissions.filter((s) => s.submitted_at?.slice(0, 10) === date);
    const approved = submitted.filter((s) => s.verification_status === 'verified').length;
    const rejected = submitted.filter((s) => s.verification_status === 'rejected').length;

    const durations = submitted
      .filter((s) => s.submitted_at && s.verified_at)
      .map(
        (s) =>
          (new Date(s.verified_at!).getTime() - new Date(s.submitted_at!).getTime()) / 3_600_000,
      );

    return {
      date,
      collected: collected.length,
      submitted: submitted.length,
      approved,
      rejected,
      medianHoursToVerification: durations.length
        ? round(
            durations.slice().sort((a, b) => a - b)[Math.floor(durations.length / 2)]!,
            1,
          )
        : null,
    };
  });
}

/* ---------------------------------------------------- live operations feed -- */

export type OperationSeverity = 'info' | 'warning' | 'critical';

export interface OperationEvent {
  id: string;
  severity: OperationSeverity;
  kind: string;
  title: string;
  detail: string;
  at: string;
  market: string | null;
  agent: string | null;
  actionUrl: string | null;
}

export function liveOperationsFeed(snapshot: OperationalSnapshot): OperationEvent[] {
  const today = TODAY(snapshot);
  const events: OperationEvent[] = [];

  // New submissions waiting for a reviewer.
  for (const submission of snapshot.submissions.filter(
    (s) => s.verification_status === 'submitted' || s.verification_status === 'pending_verification',
  )) {
    events.push({
      id: `submission-${submission.id}`,
      severity: 'warning',
      kind: 'Submission awaiting review',
      title: `${agentName(snapshot, submission.agent_user_id)} submitted a price`,
      detail: `Collected ${submission.collected_at.slice(0, 10)} at ${marketName(snapshot, submission.market_id)}.`,
      at: submission.submitted_at ?? submission.collected_at,
      market: marketName(snapshot, submission.market_id),
      agent: agentName(snapshot, submission.agent_user_id),
      actionUrl: '/admin/verification',
    });
  }

  // Corrections waiting for the agent.
  for (const submission of snapshot.submissions.filter(
    (s) => s.verification_status === 'correction_requested',
  )) {
    events.push({
      id: `correction-${submission.id}`,
      severity: 'critical',
      kind: 'Correction required',
      title: `${agentName(snapshot, submission.agent_user_id)} must correct a submission`,
      detail: `At ${marketName(snapshot, submission.market_id)}.`,
      at: submission.submitted_at ?? submission.collected_at,
      market: marketName(snapshot, submission.market_id),
      agent: agentName(snapshot, submission.agent_user_id),
      actionUrl: '/admin/verification',
    });
  }

  // Agents who have not submitted against a task that is due today.
  for (const task of eligibleTasks(snapshot.tasks)) {
    if (task.due_on !== today) continue;
    const submitted = snapshot.submissions.some(
      (s) => s.agent_user_id === task.assigned_to && s.collected_at.slice(0, 10) === today,
    );
    if (submitted) continue;
    events.push({
      id: `missing-${task.id}`,
      severity: 'warning',
      kind: 'Missing submission',
      title: `${agentName(snapshot, task.assigned_to)} has not reported for ${marketName(snapshot, task.market_id)}`,
      detail: 'A task is due today and no price was collected.',
      at: task.deadline_at ?? `${task.due_on}T00:00:00.000Z`,
      market: marketName(snapshot, task.market_id),
      agent: agentName(snapshot, task.assigned_to),
      actionUrl: '/admin/collection-tasks',
    });
  }

  // Markets with no agent at all.
  const assigned = new Set(
    snapshot.assignments.filter((a) => a.status === 'active').map((a) => a.market_id),
  );
  for (const market of snapshot.markets.filter((m) => m.is_active && !assigned.has(m.id))) {
    events.push({
      id: `unassigned-${market.id}`,
      severity: 'critical',
      kind: 'Market without an agent',
      title: `${market.name} has no assigned agent`,
      detail: 'No agent is currently responsible for this market.',
      at: snapshot.generatedAt,
      market: market.name,
      agent: null,
      actionUrl: '/admin/assignments',
    });
  }

  // Duplicate submissions.
  for (const submission of snapshot.submissions.filter((s) =>
    (s.quality_flags ?? []).includes('duplicate_suspected'),
  )) {
    events.push({
      id: `duplicate-${submission.id}`,
      severity: 'warning',
      kind: 'Possible duplicate',
      title: `A duplicate price may have been submitted at ${marketName(snapshot, submission.market_id)}`,
      detail: 'The same commodity, market and price type appear more than once in the window.',
      at: submission.submitted_at ?? submission.collected_at,
      market: marketName(snapshot, submission.market_id),
      agent: agentName(snapshot, submission.agent_user_id),
      actionUrl: '/admin/data-quality',
    });
  }

  return events.sort((a, b) => {
    const rank = { critical: 0, warning: 1, info: 2 } as const;
    if (rank[a.severity] !== rank[b.severity]) return rank[a.severity] - rank[b.severity];
    return b.at.localeCompare(a.at);
  });
}

/* --------------------------------------------------------------- helpers -- */

function buildMetricValues(
  values: Record<string, number | null>,
  previous: Record<string, number | null> | null,
  surface: 'overview' | 'live-operations' | 'analytics' | 'agents' | 'markets' | 'quality',
): MetricValue[] {
  return Object.entries(values).map(([id, value]) => {
    const definition = METRIC_DEFINITIONS[id as keyof typeof METRIC_DEFINITIONS];
    return {
      id,
      label: definition?.label ?? id,
      value,
      comparison: comparePeriods(value, previous ? (previous[id] ?? null) : null),
      source: definition?.source ?? '',
      formula: definition?.formula ?? '',
      caveats: definition?.caveats,
    };
  });
}

/** Group the snapshot's observations by commodity, for the commodity analytics. */
export function commodityCoverage(snapshot: OperationalSnapshot) {
  const byCommodity = new Map<
    number,
    { observations: number; markets: Set<number>; latest: string | null; flagged: number }
  >();

  for (const observation of snapshot.observations) {
    const entry = byCommodity.get(observation.commodity_id) ?? {
      observations: 0,
      markets: new Set<number>(),
      latest: null,
      flagged: 0,
    };
    entry.observations += 1;
    entry.markets.add(observation.market_id);
    if (!entry.latest || observation.collected_at > entry.latest) {
      entry.latest = observation.collected_at;
    }
    if ((observation.quality_flags?.length ?? 0) > 0) entry.flagged += 1;
    byCommodity.set(observation.commodity_id, entry);
  }

  return [...byCommodity.entries()]
    .map(([commodityId, entry]) => ({
      commodityId,
      observations: entry.observations,
      markets: entry.markets.size,
      latestCollectedAt: entry.latest,
      flagged: entry.flagged,
    }))
    .sort((a, b) => b.observations - a.observations);
}

/** The markets in the snapshot, for the coverage map. */
export function marketsWithCoordinates(snapshot: OperationalSnapshot): SnapshotMarket[] {
  return snapshot.markets;
}
