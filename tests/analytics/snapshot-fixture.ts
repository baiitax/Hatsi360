import type {
  OperationalSnapshot,
  SnapshotAgent,
  SnapshotAssignment,
  SnapshotMarket,
  SnapshotObservation,
  SnapshotSchedule,
  SnapshotTask,
} from '@/lib/analytics/types';

/**
 * A synthetic operational snapshot.
 *
 * The fixtures are clearly labelled test data. They are never written to the
 * database and they never appear as genuine market observations.
 */

export interface SnapshotFixtureOptions {
  today?: string;
  days?: number;
  markets?: SnapshotMarket[];
  agents?: SnapshotAgent[];
  assignments?: SnapshotAssignment[];
  tasks?: SnapshotTask[];
  observations?: SnapshotObservation[];
  submissions?: SnapshotObservation[];
  schedules?: SnapshotSchedule[];
  counts?: Partial<OperationalSnapshot['counts']>;
  generatedAt?: string;
}

export function makeSnapshot(options: SnapshotFixtureOptions = {}): OperationalSnapshot {
  const today = options.today ?? '2026-10-22';
  const days = options.days ?? 7;

  const shift = (day: string, by: number): string => {
    const [year, month, date] = day.split('-').map(Number);
    const utc = Date.UTC(year!, month! - 1, date!) + by * 86_400_000;
    return new Date(utc).toISOString().slice(0, 10);
  };

  return {
    generatedAt: options.generatedAt ?? `${today}T09:00:00.000Z`,
    timezone: 'Africa/Lagos',
    windows: {
      today,
      currentFrom: shift(today, -(days - 1)),
      currentTo: today,
      previousFrom: shift(today, -(days * 2 - 1)),
      previousTo: shift(today, -days),
      days,
    },
    configured: true,
    truncated: { observations: false, tasks: false },
    markets: options.markets ?? [],
    agents: options.agents ?? [],
    assignments: options.assignments ?? [],
    tasks: options.tasks ?? [],
    observations: options.observations ?? [],
    submissions: options.submissions ?? [],
    schedules: options.schedules ?? [],
    counts: {
      marketsTotal: options.counts?.marketsTotal ?? null,
      marketsActive: options.counts?.marketsActive ?? null,
      agentsTotal: options.counts?.agentsTotal ?? null,
      agentsActive: options.counts?.agentsActive ?? null,
      observationsTotal: options.counts?.observationsTotal ?? null,
      observationsPublished: options.counts?.observationsPublished ?? null,
      observationsPending: options.counts?.observationsPending ?? null,
      observationsApproved: options.counts?.observationsApproved ?? null,
      observationsRejected: options.counts?.observationsRejected ?? null,
      qualityFlagsOpen: options.counts?.qualityFlagsOpen ?? null,
      commoditiesWithCurrent: options.counts?.commoditiesWithCurrent ?? null,
    },
  };
}

export function makeMarket(overrides: Partial<SnapshotMarket> = {}): SnapshotMarket {
  return {
    id: 1,
    name: 'Dawanau',
    slug: 'dawanau',
    state_id: 1,
    market_zone_id: null,
    is_active: true,
    priority: 'normal',
    coverage_target: null,
    ...overrides,
  };
}

export function makeAgent(overrides: Partial<SnapshotAgent> = {}): SnapshotAgent {
  return {
    id: 'agent-1',
    full_name: 'Amina Bello',
    role: 'agent',
    account_status: 'active',
    ...overrides,
  };
}

export function makeAssignment(
  overrides: Partial<SnapshotAssignment> = {},
): SnapshotAssignment {
  return {
    id: 1,
    user_id: 'agent-1',
    market_id: 1,
    status: 'active',
    starts_on: '2026-01-01',
    ends_on: null,
    ...overrides,
  };
}

export function makeSchedule(overrides: Partial<SnapshotSchedule> = {}): SnapshotSchedule {
  return {
    id: 1,
    market_id: 1,
    commodity_id: 10,
    frequency: 'daily',
    days_of_week: [1, 2, 3, 4, 5],
    deadline_time: '16:00:00',
    priority: 'normal',
    assigned_agent_id: 'agent-1',
    is_active: true,
    expected_observations: 1,
    evidence_required: false,
    ...overrides,
  };
}

export function makeTask(overrides: Partial<SnapshotTask> = {}): SnapshotTask {
  return {
    id: 1,
    market_id: 1,
    commodity_id: 10,
    assigned_to: 'agent-1',
    due_on: '2026-10-22',
    status: 'open',
    priority: 'normal',
    deadline_at: '2026-10-22T15:00:00.000Z',
    started_at: null,
    submitted_at: null,
    completed_at: null,
    created_at: '2026-10-21T08:00:00.000Z',
    expected_commodity_ids: [10],
    ...overrides,
  };
}

export function makeObservation(
  overrides: Partial<SnapshotObservation> = {},
): SnapshotObservation {
  return {
    id: 'obs-1',
    market_id: 1,
    commodity_id: 10,
    agent_user_id: 'agent-1',
    verification_status: 'submitted',
    published_at: null,
    submitted_at: '2026-10-22T08:00:00.000Z',
    verified_at: null,
    collected_at: '2026-10-22T07:30:00.000Z',
    reported_amount: 40000,
    reported_unit_id: 1,
    price_type: 'wholesale_transaction',
    is_current: true,
    quality_flags: [],
    ...overrides,
  };
}
