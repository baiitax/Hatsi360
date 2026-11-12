/**
 * GonaPulse — operational metric definitions.
 *
 * Every number that appears in the admin console is defined here: what it
 * counts, the formula, the table it is read from, and the caveats a reader
 * needs in order not to be misled.
 *
 * Two rules are absolute:
 *
 *  1. A metric that cannot be computed returns `null`, never `0`. "No data"
 *     and "zero activity" are different facts and the interface must show
 *     the difference.
 *  2. A metric never invents activity. If the underlying records do not
 *     exist, the metric is null and the page says so.
 *
 * The operational timezone is Africa/Lagos. All "today" boundaries are
 * computed in that timezone and converted to UTC before they reach the
 * database.
 */

export const OPERATIONAL_TIMEZONE = 'Africa/Lagos';

export type MetricId =
  /* ---------------------------------------------------------- overview -- */
  | 'markets_total'
  | 'markets_active'
  | 'markets_observed_today'
  | 'markets_overdue'
  | 'markets_without_agent'
  | 'agents_total'
  | 'agents_active'
  | 'agents_with_tasks_today'
  | 'agents_submitted_today'
  | 'observations_today'
  | 'observations_pending_verification'
  | 'observations_approved'
  | 'observations_published'
  | 'observations_rejected'
  | 'records_flagged'
  | 'commodities_with_current_observations'
  | 'markets_with_insufficient_coverage'
  /* ------------------------------------------------------- productivity -- */
  | 'tasks_assigned'
  | 'tasks_completed'
  | 'task_completion_rate'
  | 'observations_submitted'
  | 'observations_accepted'
  | 'observations_rejected_by_agent'
  | 'corrections_requested'
  | 'verification_acceptance_rate'
  | 'avg_hours_assignment_to_submission'
  | 'avg_hours_submission_to_verification'
  | 'agent_active_markets'
  | 'reporting_consistency'
  | 'consecutive_reporting_days'
  | 'missed_deadlines'
  | 'duplicate_submission_rate'
  | 'quality_warning_rate'
  /* ------------------------------------------------------------ coverage -- */
  | 'expected_observations'
  | 'actual_observations'
  | 'current_verified_observations'
  | 'coverage_completion_rate'
  | 'missing_commodity_coverage'
  /* ------------------------------------------------------------- quality -- */
  | 'duplicate_rate'
  | 'missing_field_rate'
  | 'invalid_unit_rate'
  | 'large_price_change_rate'
  | 'rejection_rate'
  | 'correction_rate'
  | 'evidence_completeness'
  | 'stale_records'
  | 'conflicting_observations'
  | 'unresolved_quality_flags';

export interface MetricDefinition {
  id: MetricId;
  label: string;
  /** The formula, in words. Shown in the interface next to the metric. */
  formula: string;
  /** Where the number comes from. */
  source: string;
  /** Anything a reader must know before acting on the number. */
  caveats?: string;
  /** Which page the metric belongs on. */
  surface: 'overview' | 'live-operations' | 'analytics' | 'agents' | 'markets' | 'quality';
}

export const METRIC_DEFINITIONS: Record<MetricId, MetricDefinition> = {
  /* ---------------------------------------------------------- overview -- */
  markets_total: {
    id: 'markets_total',
    label: 'Registered markets',
    formula: 'Count of rows in markets.',
    source: 'public.markets',
    surface: 'overview',
  },
  markets_active: {
    id: 'markets_active',
    label: 'Active markets',
    formula: 'Count of markets where is_active is true.',
    source: 'public.markets',
    surface: 'overview',
    caveats: 'A deactivated market keeps its history and its price records.',
  },
  markets_observed_today: {
    id: 'markets_observed_today',
    label: 'Markets with an observation today',
    formula:
      'Distinct markets with at least one observation whose collected_at falls on the current operational day (Africa/Lagos).',
    source: 'public.price_observations',
    surface: 'overview',
    caveats: 'Counts collection activity, not publication. A submitted price counts once it is collected.',
  },
  markets_overdue: {
    id: 'markets_overdue',
    label: 'Markets overdue for collection',
    formula:
      'Distinct markets with an active collection schedule where the deadline for today has passed and no observation was collected for that market today.',
    source: 'public.market_collection_schedules + public.price_observations',
    surface: 'overview',
  },
  markets_without_agent: {
    id: 'markets_without_agent',
    label: 'Markets without an assigned agent',
    formula: 'Active markets with no active market_agent_assignments row.',
    source: 'public.markets + public.market_agent_assignments',
    surface: 'overview',
  },
  agents_total: {
    id: 'agents_total',
    label: 'Registered agents',
    formula: 'Count of profiles whose role is agent.',
    source: 'public.profiles',
    surface: 'overview',
  },
  agents_active: {
    id: 'agents_active',
    label: 'Active agents',
    formula: "Count of agent profiles whose account_status is 'active'.",
    source: 'public.profiles',
    surface: 'overview',
  },
  agents_with_tasks_today: {
    id: 'agents_with_tasks_today',
    label: 'Agents with tasks today',
    formula: 'Distinct agents assigned a collection task due today that is not cancelled.',
    source: 'public.collection_tasks',
    surface: 'overview',
  },
  agents_submitted_today: {
    id: 'agents_submitted_today',
    label: 'Agents who submitted today',
    formula:
      'Distinct agents with at least one observation submitted today. This is activity, not presence: an agent is never reported as "online" on this evidence.',
    source: 'public.price_observations',
    surface: 'overview',
    caveats: 'A submission is not proof that an agent is at the market right now.',
  },
  observations_today: {
    id: 'observations_today',
    label: 'Observations collected today',
    formula: 'Count of observations whose collected_at falls on the current operational day.',
    source: 'public.price_observations',
    surface: 'overview',
  },
  observations_pending_verification: {
    id: 'observations_pending_verification',
    label: 'Awaiting verification',
    formula:
      "Count of observations whose verification_status is 'submitted' or 'pending_verification'.",
    source: 'public.price_observations',
    surface: 'overview',
  },
  observations_approved: {
    id: 'observations_approved',
    label: 'Approved, not yet published',
    formula:
      "Count of observations with verification_status 'verified' and published_at is null.",
    source: 'public.price_observations',
    surface: 'overview',
  },
  observations_published: {
    id: 'observations_published',
    label: 'Published observations',
    formula: 'Count of observations whose published_at is not null.',
    source: 'public.price_observations',
    surface: 'overview',
  },
  observations_rejected: {
    id: 'observations_rejected',
    label: 'Rejected observations',
    formula: "Count of observations whose verification_status is 'rejected'.",
    source: 'public.price_observations',
    surface: 'overview',
  },
  records_flagged: {
    id: 'records_flagged',
    label: 'Records flagged for review',
    formula: 'Count of data_quality_flags rows that have not been resolved.',
    source: 'public.data_quality_flags',
    surface: 'overview',
  },
  commodities_with_current_observations: {
    id: 'commodities_with_current_observations',
    label: 'Commodities with current prices',
    formula:
      'Distinct commodities with at least one published, current observation inside its freshness window.',
    source: 'public.price_observations + public.commodities',
    surface: 'overview',
  },
  markets_with_insufficient_coverage: {
    id: 'markets_with_insufficient_coverage',
    label: 'Markets with thin coverage',
    formula:
      'Active markets whose published observation count over the last 7 days is below the coverage target, or which have no coverage target configured and fewer than 3 published observations.',
    source: 'public.price_observations + public.markets',
    surface: 'overview',
  },

  /* ------------------------------------------------------- productivity -- */
  tasks_assigned: {
    id: 'tasks_assigned',
    label: 'Eligible tasks',
    formula:
      'Collection tasks assigned in the period, excluding cancelled tasks. Cancelled work is never counted as missed work.',
    source: 'public.collection_tasks',
    surface: 'agents',
  },
  tasks_completed: {
    id: 'tasks_completed',
    label: 'Completed tasks',
    formula: "Tasks with status 'completed' in the period.",
    source: 'public.collection_tasks',
    surface: 'agents',
  },
  task_completion_rate: {
    id: 'task_completion_rate',
    label: 'Task completion rate',
    formula: 'completed eligible tasks / eligible tasks x 100. Null when no task was eligible.',
    source: 'public.collection_tasks',
    surface: 'agents',
    caveats: 'A reassigned task is counted against the agent who actually worked it.',
  },
  observations_submitted: {
    id: 'observations_submitted',
    label: 'Observations submitted',
    formula: 'Observations with the agent as the collector, submitted in the period.',
    source: 'public.price_observations',
    surface: 'agents',
  },
  observations_accepted: {
    id: 'observations_accepted',
    label: 'Observations accepted',
    formula: "Submitted observations whose verification_status is 'verified'.",
    source: 'public.price_observations',
    surface: 'agents',
  },
  observations_rejected_by_agent: {
    id: 'observations_rejected_by_agent',
    label: 'Observations rejected',
    formula: "Submitted observations whose verification_status is 'rejected'.",
    source: 'public.price_observations',
    surface: 'agents',
  },
  corrections_requested: {
    id: 'corrections_requested',
    label: 'Corrections requested',
    formula: "Submitted observations whose verification_status is 'correction_requested'.",
    source: 'public.price_observations',
    surface: 'agents',
  },
  verification_acceptance_rate: {
    id: 'verification_acceptance_rate',
    label: 'Verification acceptance rate',
    formula:
      'accepted / (accepted + rejected + correction_requested) x 100. Null when nothing was reviewed.',
    source: 'public.price_observations',
    surface: 'agents',
  },
  avg_hours_assignment_to_submission: {
    id: 'avg_hours_assignment_to_submission',
    label: 'Hours from assignment to submission',
    formula: 'Average of submitted_at minus started_at over submitted tasks.',
    source: 'public.collection_tasks',
    surface: 'agents',
  },
  avg_hours_submission_to_verification: {
    id: 'avg_hours_submission_to_verification',
    label: 'Hours from submission to verification',
    formula: 'Average of verified_at minus submitted_at over reviewed observations.',
    source: 'public.price_observations',
    surface: 'agents',
  },
  agent_active_markets: {
    id: 'agent_active_markets',
    label: 'Assigned markets',
    formula: 'Count of active market_agent_assignments for the agent.',
    source: 'public.market_agent_assignments',
    surface: 'agents',
  },
  reporting_consistency: {
    id: 'reporting_consistency',
    label: 'Reporting consistency',
    formula:
      'Days with at least one submission / days on which the agent had an eligible task, x 100. Null when no task was eligible.',
    source: 'public.collection_tasks + public.price_observations',
    surface: 'agents',
    caveats: 'An agent covering fewer commodities is not penalised: the denominator is the agent\'s own eligible days.',
  },
  consecutive_reporting_days: {
    id: 'consecutive_reporting_days',
    label: 'Consecutive reporting days',
    formula:
      'The length of the unbroken run of eligible task days ending at the last day with a submission.',
    source: 'public.collection_tasks + public.price_observations',
    surface: 'agents',
  },
  missed_deadlines: {
    id: 'missed_deadlines',
    label: 'Missed deadlines',
    formula:
      'Eligible tasks whose deadline passed without the task being completed or cancelled.',
    source: 'public.collection_tasks',
    surface: 'agents',
  },
  duplicate_submission_rate: {
    id: 'duplicate_submission_rate',
    label: 'Duplicate submission rate',
    formula:
      'Observations carrying the duplicate_suspected quality flag / submitted observations x 100.',
    source: 'public.price_observations + public.data_quality_flags',
    surface: 'agents',
  },
  quality_warning_rate: {
    id: 'quality_warning_rate',
    label: 'Quality warning rate',
    formula:
      'Submitted observations carrying at least one quality flag / submitted observations x 100.',
    source: 'public.price_observations + public.data_quality_flags',
    surface: 'agents',
  },

  /* ------------------------------------------------------------ coverage -- */
  expected_observations: {
    id: 'expected_observations',
    label: 'Expected observations',
    formula:
      'The sum of expected_observations across the collection tasks generated for the period.',
    source: 'public.collection_tasks + public.market_collection_schedules',
    surface: 'markets',
  },
  actual_observations: {
    id: 'actual_observations',
    label: 'Collected observations',
    formula: 'Observations collected in the market during the period.',
    source: 'public.price_observations',
    surface: 'markets',
  },
  current_verified_observations: {
    id: 'current_verified_observations',
    label: 'Current verified observations',
    formula:
      'Published, current observations in the market whose collected_at falls inside the commodity freshness window.',
    source: 'public.price_observations + public.commodities',
    surface: 'markets',
  },
  coverage_completion_rate: {
    id: 'coverage_completion_rate',
    label: 'Coverage completion',
    formula:
      'collected observations / expected observations x 100. Null when nothing was expected.',
    source: 'public.collection_tasks + public.price_observations',
    surface: 'markets',
    caveats: 'A market is never marked fully covered because one commodity was reported when the plan expects several.',
  },
  missing_commodity_coverage: {
    id: 'missing_commodity_coverage',
    label: 'Commodities missing from the plan',
    formula:
      'The commodities in the market scope that have no observation in the period.',
    source: 'public.market_commodity_scope + public.price_observations',
    surface: 'markets',
  },

  /* ------------------------------------------------------------- quality -- */
  duplicate_rate: {
    id: 'duplicate_rate',
    label: 'Duplicate rate',
    formula: 'Observations flagged duplicate_suspected / observations reviewed x 100.',
    source: 'public.data_quality_flags + public.price_observations',
    surface: 'quality',
  },
  missing_field_rate: {
    id: 'missing_field_rate',
    label: 'Missing mandatory field rate',
    formula: 'Observations with a missing mandatory field / observations reviewed x 100.',
    source: 'public.data_quality_flags + public.price_observations',
    surface: 'quality',
  },
  invalid_unit_rate: {
    id: 'invalid_unit_rate',
    label: 'Unrecognised unit rate',
    formula: 'Observations flagged for an unrecognised unit / observations reviewed x 100.',
    source: 'public.data_quality_flags + public.price_observations',
    surface: 'quality',
  },
  large_price_change_rate: {
    id: 'large_price_change_rate',
    label: 'Large price change rate',
    formula: 'Observations flagged price_outlier / observations reviewed x 100.',
    source: 'public.data_quality_flags + public.price_observations',
    surface: 'quality',
  },
  rejection_rate: {
    id: 'rejection_rate',
    label: 'Rejection rate',
    formula: 'Rejected observations / reviewed observations x 100.',
    source: 'public.price_observations',
    surface: 'quality',
  },
  correction_rate: {
    id: 'correction_rate',
    label: 'Correction rate',
    formula: 'Observations sent back for correction / reviewed observations x 100.',
    source: 'public.price_observations',
    surface: 'quality',
  },
  evidence_completeness: {
    id: 'evidence_completeness',
    label: 'Evidence completeness',
    formula:
      'Observations with at least one evidence row / observations that required evidence x 100.',
    source: 'public.price_observation_evidence',
    surface: 'quality',
  },
  stale_records: {
    id: 'stale_records',
    label: 'Records older than the freshness threshold',
    formula:
      'Current observations whose collected_at is older than the freshness window of their commodity.',
    source: 'public.price_observations + public.commodities',
    surface: 'quality',
  },
  conflicting_observations: {
    id: 'conflicting_observations',
    label: 'Conflicting observations',
    formula: 'Observations flagged conflicting_report.',
    source: 'public.data_quality_flags',
    surface: 'quality',
  },
  unresolved_quality_flags: {
    id: 'unresolved_quality_flags',
    label: 'Unresolved quality flags',
    formula: 'data_quality_flags rows that have not been resolved.',
    source: 'public.data_quality_flags',
    surface: 'quality',
  },
};

/** The definitions that belong on a given surface. */
export function metricsForSurface(surface: MetricDefinition['surface']): MetricDefinition[] {
  return Object.values(METRIC_DEFINITIONS).filter((m) => m.surface === surface);
}
