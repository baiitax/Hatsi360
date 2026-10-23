import type { PeriodComparison } from './format';

/** The rows the dashboard is computed from. */
export interface SnapshotMarket {
  id: number;
  name: string;
  slug: string;
  state_id: number | null;
  market_zone_id: number | null;
  is_active: boolean;
  priority: string | null;
  coverage_target: number | null;
}

export interface SnapshotAgent {
  id: string;
  full_name: string | null;
  role: string;
  account_status: string | null;
}

export interface SnapshotAssignment {
  id: number;
  user_id: string;
  market_id: number;
  status: string;
  starts_on: string | null;
  ends_on: string | null;
}

export interface SnapshotTask {
  id: number;
  market_id: number;
  commodity_id: number | null;
  assigned_to: string | null;
  due_on: string;
  status: string;
  priority: string | null;
  deadline_at: string | null;
  started_at: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  created_at: string | null;
  expected_commodity_ids: number[] | null;
}

export interface SnapshotObservation {
  id: string;
  market_id: number;
  commodity_id: number;
  agent_user_id: string | null;
  verification_status: string;
  published_at: string | null;
  submitted_at: string | null;
  verified_at: string | null;
  collected_at: string;
  reported_amount: number | null;
  reported_unit_id: number | null;
  price_type: string;
  is_current: boolean;
  quality_flags: string[] | null;
}

export interface SnapshotSchedule {
  id: number;
  market_id: number;
  commodity_id: number | null;
  frequency: string;
  days_of_week: number[] | null;
  deadline_time: string | null;
  priority: string | null;
  assigned_agent_id: string | null;
  is_active: boolean;
  expected_observations: number | null;
  evidence_required: boolean;
}

export interface OperationalSnapshot {
  /** When the snapshot was taken. Every card shows this. */
  generatedAt: string;
  timezone: string;
  windows: {
    today: string;
    currentFrom: string;
    currentTo: string;
    previousFrom: string;
    previousTo: string;
    days: number;
  };
  /** False when no Supabase project is configured. */
  configured: boolean;
  /** True when a table exceeded the read limit. */
  truncated: { observations: boolean; tasks: boolean };
  markets: SnapshotMarket[];
  agents: SnapshotAgent[];
  assignments: SnapshotAssignment[];
  tasks: SnapshotTask[];
  observations: SnapshotObservation[];
  /** Observations *submitted* in the window (submitted_at), not collected. */
  submissions: SnapshotObservation[];
  schedules: SnapshotSchedule[];
  counts: {
    marketsTotal: number | null;
    marketsActive: number | null;
    agentsTotal: number | null;
    agentsActive: number | null;
    observationsTotal: number | null;
    observationsPublished: number | null;
    observationsPending: number | null;
    observationsApproved: number | null;
    observationsRejected: number | null;
    qualityFlagsOpen: number | null;
    commoditiesWithCurrent: number | null;
  };
}

/** A metric with its comparison against the previous period. */
export interface MetricValue {
  id: string;
  label: string;
  value: number | null;
  comparison: PeriodComparison;
  /** Where the number came from, for the "definition" affordance. */
  source: string;
  formula: string;
  caveats?: string;
  /** The route that lists the underlying records. */
  drilldown?: string;
}
