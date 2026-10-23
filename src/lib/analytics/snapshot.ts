import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { periodWindows, endOfOperationalDay, startOfOperationalDay } from './format';
import type { OperationalSnapshot } from './types';

/**
 * Load the operational snapshot.
 *
 * One bounded read of the records the dashboard needs, so that every metric on
 * a page is computed from the same data at the same instant. A dashboard whose
 * cards disagree with each other is worse than no dashboard.
 *
 * The snapshot is deliberately bounded (see the limits below). When a table
 * exceeds the limit the snapshot is marked `truncated` and the interface says
 * so, rather than quietly reporting a partial number as if it were the whole.
 */

const MAX_OBSERVATIONS = 5000;
const MAX_TASKS = 2000;

export async function loadOperationalSnapshot(days = 7): Promise<OperationalSnapshot> {
  const windows = periodWindows(days);
  // The previous period is read as well, so every metric can be compared with
  // the equivalent period before it rather than with an imagined baseline.
  const from = startOfOperationalDay(windows.previousFrom);
  const to = endOfOperationalDay(windows.currentTo);

  const snapshot: OperationalSnapshot = {
    generatedAt: new Date().toISOString(),
    timezone: 'Africa/Lagos',
    windows,
    configured: isSupabaseConfigured(),
    truncated: { observations: false, tasks: false },
    markets: [],
    agents: [],
    assignments: [],
    tasks: [],
    observations: [],
    submissions: [],
    schedules: [],
    counts: {
      marketsTotal: null,
      marketsActive: null,
      agentsTotal: null,
      agentsActive: null,
      observationsTotal: null,
      observationsPublished: null,
      observationsPending: null,
      observationsApproved: null,
      observationsRejected: null,
      qualityFlagsOpen: null,
      commoditiesWithCurrent: null,
    },
  };

  if (!snapshot.configured) return snapshot;

  const supabase = await createClient();

  const [
    marketsResult,
    agentsResult,
    assignmentsResult,
    tasksResult,
    observationsResult,
    totalMarkets,
    activeMarkets,
    totalAgents,
    activeAgents,
    schedulesResult,
    submissionsResult,
    totalObservations,
    publishedObservations,
    pendingObservations,
    approvedObservations,
    rejectedObservations,
    openFlags,
  ] = await Promise.all([
    supabase
      .from('markets')
      .select('id, name, slug, state_id, market_zone_id, is_active, priority, coverage_target')
      .limit(1000),
    supabase
      .from('profiles')
      .select('id, full_name, role, account_status')
      .eq('role', 'agent')
      .limit(1000),
    supabase
      .from('market_agent_assignments')
      .select('id, user_id, market_id, status, starts_on, ends_on')
      .limit(2000),
    supabase
      .from('collection_tasks')
      .select(
        'id, market_id, commodity_id, assigned_to, due_on, status, priority, deadline_at, started_at, submitted_at, completed_at, created_at, expected_commodity_ids',
      )
      .gte('due_on', windows.previousFrom)
      .lte('due_on', windows.currentTo)
      .limit(MAX_TASKS),
    supabase
      .from('price_observations')
      .select(
        'id, market_id, commodity_id, agent_user_id, verification_status, published_at, submitted_at, verified_at, collected_at, reported_amount, reported_unit_id, price_type, is_current, quality_flags',
      )
      .gte('collected_at', from)
      .lte('collected_at', to)
      .limit(MAX_OBSERVATIONS),
    supabase.from('markets').select('*', { count: 'exact', head: true }),
    supabase.from('markets').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'agent'),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'agent')
      .eq('account_status', 'active'),
    supabase
      .from('market_collection_schedules')
      .select(
        'id, market_id, commodity_id, frequency, days_of_week, deadline_time, priority, assigned_agent_id, is_active, expected_observations, evidence_required',
      )
      .eq('is_active', true)
      .limit(1000),
    supabase
      .from('price_observations')
      .select(
        'id, market_id, commodity_id, agent_user_id, verification_status, published_at, submitted_at, verified_at, collected_at, reported_amount, reported_unit_id, price_type, is_current, quality_flags',
      )
      .gte('submitted_at', from)
      .lte('submitted_at', to)
      .limit(MAX_OBSERVATIONS),
    supabase.from('price_observations').select('*', { count: 'exact', head: true }),
    supabase
      .from('price_observations')
      .select('*', { count: 'exact', head: true })
      .not('published_at', 'is', null),
    supabase
      .from('price_observations')
      .select('*', { count: 'exact', head: true })
      .in('verification_status', ['submitted', 'pending_verification']),
    supabase
      .from('price_observations')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'verified')
      .is('published_at', null),
    supabase
      .from('price_observations')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'rejected'),
    supabase.from('data_quality_flags').select('*', { count: 'exact', head: true }),
  ]);

  snapshot.markets = (marketsResult.data ?? []) as OperationalSnapshot['markets'];
  snapshot.agents = (agentsResult.data ?? []) as OperationalSnapshot['agents'];
  snapshot.assignments = (assignmentsResult.data ?? []) as OperationalSnapshot['assignments'];

  const tasks = (tasksResult.data ?? []) as OperationalSnapshot['tasks'];
  snapshot.tasks = tasks;
  snapshot.truncated.tasks = tasks.length >= MAX_TASKS;

  const observations = (observationsResult.data ?? []) as OperationalSnapshot['observations'];
  snapshot.observations = observations;
  snapshot.truncated.observations = observations.length >= MAX_OBSERVATIONS;

  const submissions = (submissionsResult.data ?? []) as OperationalSnapshot['submissions'];
  snapshot.submissions = submissions;

  snapshot.schedules = (schedulesResult.data ?? []) as OperationalSnapshot['schedules'];

  snapshot.counts = {
    marketsTotal: totalMarkets.count,
    marketsActive: activeMarkets.count,
    agentsTotal: totalAgents.count,
    agentsActive: activeAgents.count,
    observationsTotal: totalObservations.count,
    observationsPublished: publishedObservations.count,
    observationsPending: pendingObservations.count,
    observationsApproved: approvedObservations.count,
    observationsRejected: rejectedObservations.count,
    qualityFlagsOpen: openFlags.count,
    commoditiesWithCurrent: null,
  };

  return snapshot;
}
