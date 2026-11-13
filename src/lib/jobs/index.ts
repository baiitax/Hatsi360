import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { operationalToday } from '@/lib/analytics/format';
import { deliverPending } from '@/lib/notifications';

/**
 * Hatsi360 — scheduled job runner.
 *
 * The jobs are ordinary server-side functions. They are invoked by an
 * authenticated scheduler (see `src/app/api/jobs/run/route.ts`), never by a
 * public endpoint and never by a browser.
 *
 * Idempotency: a run is identified by (job name, scheduled slot). The database
 * enforces that pair with a unique constraint, so a retried schedule cannot
 * produce a second run of the same job in the same slot. A job that finds an
 * existing run reports `skipped` and does nothing.
 *
 * Observability: every run writes a row to `scheduled_job_runs` with its
 * start, finish, status, the number of records it processed and any error.
 */

export interface JobResult {
  recordsProcessed: number;
  detail?: string;
}

export interface JobDefinition {
  name: string;
  description: string;
  /** How often the job is expected to run. */
  cadence: string;
  run: (context: { scheduledFor: string }) => Promise<JobResult>;
}

export const JOB_DEFINITIONS: JobDefinition[] = [
  {
    name: 'generate_collection_tasks',
    description: 'Creates the collection tasks that are due on the scheduled day.',
    cadence: 'Daily, before the collection window opens',
    async run({ scheduledFor }) {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc('generate_collection_tasks', {
        p_date: scheduledFor.slice(0, 10),
      });
      if (error) throw new Error(error.message);
      const created = typeof data === 'number' ? data : 0;
      return {
        recordsProcessed: created,
        detail: `${created} collection task(s) created for ${scheduledFor.slice(0, 10)}.`,
      };
    },
  },
  {
    name: 'mark_overdue_tasks',
    description: 'Finds collection tasks that passed their deadline and tells the people who need to know.',
    cadence: 'Hourly',
    async run() {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc('mark_overdue_tasks', { p_now: new Date().toISOString() });
      if (error) throw new Error(error.message);
      const marked = typeof data === 'number' ? data : 0;
      return {
        recordsProcessed: marked,
        detail: `${marked} task(s) marked overdue.`,
      };
    },
  },
  {
    name: 'refresh_analytics_snapshot',
    description: 'Stores a daily snapshot of the operational metrics.',
    cadence: 'Daily, after the collection day closes',
    async run({ scheduledFor }) {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc('refresh_analytics_snapshot', {
        p_date: scheduledFor.slice(0, 10),
      });
      if (error) throw new Error(error.message);
      return {
        recordsProcessed: data ? 1 : 0,
        detail: 'Analytics snapshot refreshed.',
      };
    },
  },
  {
    name: 'retry_notification_delivery',
    description: 'Retries the notification deliveries that are still queued or failed.',
    cadence: 'Every 15 minutes',
    async run() {
      const summary = await deliverPending();
      return {
        recordsProcessed: summary.attempted,
        detail: `${summary.delivered} delivered, ${summary.failed} failed, ${summary.skipped} skipped.`,
      };
    },
  },
  {
    name: 'expire_exports',
    description: 'Marks export artefacts that have passed their expiry as expired.',
    cadence: 'Hourly',
    async run() {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('export_jobs')
        .update({ status: 'expired' })
        .eq('status', 'completed')
        .lt('expires_at', new Date().toISOString())
        .select('id');
      if (error) throw new Error(error.message);
      return {
        recordsProcessed: data?.length ?? 0,
        detail: `${data?.length ?? 0} export(s) expired.`,
      };
    },
  },
];

export function jobByName(name: string): JobDefinition | undefined {
  return JOB_DEFINITIONS.find((job) => job.name === name);
}

export interface RunOutcome {
  job: string;
  status: 'succeeded' | 'failed' | 'skipped';
  recordsProcessed: number;
  detail?: string;
  error?: string;
  runId?: number;
}

/**
 * Run one job.
 *
 * The scheduled slot defaults to the current hour, which makes the job
 * naturally idempotent within the hour.
 */
export async function runJob(
  name: string,
  options: { scheduledFor?: string; triggeredBy?: string } = {},
): Promise<RunOutcome> {
  const definition = jobByName(name);
  if (!definition) {
    return { job: name, status: 'failed', recordsProcessed: 0, error: `Unknown job "${name}".` };
  }

  if (!isSupabaseConfigured()) {
    return {
      job: name,
      status: 'failed',
      recordsProcessed: 0,
      error:
        'No Supabase project is configured, so scheduled jobs cannot run. See .env.example.',
    };
  }

  const scheduledFor = options.scheduledFor ?? new Date().toISOString();
  const supabase = await createClient();

  // Claim the slot. The unique constraint makes a concurrent or repeated
  // invocation a no-op rather than a second execution.
  const { data: claimed, error: claimError } = await supabase
    .from('scheduled_job_runs')
    .insert({
      job_name: definition.name,
      scheduled_for: scheduledFor,
      status: 'running',
      triggered_by: options.triggeredBy ?? 'scheduler',
    })
    .select('id')
    .maybeSingle();

  if (claimError) {
    // The slot is already taken: this is a retry of work that has run.
    return {
      job: name,
      status: 'skipped',
      recordsProcessed: 0,
      detail: 'This schedule slot has already been run.',
    };
  }

  const runId = claimed?.id;

  try {
    const result = await definition.run({ scheduledFor });

    await supabase
      .from('scheduled_job_runs')
      .update({
        status: 'succeeded',
        finished_at: new Date().toISOString(),
        records_processed: result.recordsProcessed,
      })
      .eq('id', runId!);

    return {
      job: name,
      status: 'succeeded',
      recordsProcessed: result.recordsProcessed,
      detail: result.detail,
      runId: runId ?? undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await supabase
      .from('scheduled_job_runs')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        error: message,
      })
      .eq('id', runId!);

    return {
      job: name,
      status: 'failed',
      recordsProcessed: 0,
      error: message,
      runId: runId ?? undefined,
    };
  }
}

/** Run every job. Used by the "run the jobs now" button in the admin console. */
export async function runAllJobs(triggeredBy = 'admin'): Promise<RunOutcome[]> {
  const outcomes: RunOutcome[] = [];
  for (const definition of JOB_DEFINITIONS) {
    outcomes.push(await runJob(definition.name, { triggeredBy }));
  }
  return outcomes;
}

/** The history of the job runs, for the system health screen. */
export async function recentJobRuns(limit = 25) {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('scheduled_job_runs')
    .select('id, job_name, scheduled_for, started_at, finished_at, status, records_processed, error, triggered_by')
    .order('scheduled_for', { ascending: false })
    .limit(limit);
  return data ?? [];
}

/** The slot identifier a job would use right now. */
export function currentSlot(): string {
  const now = new Date();
  return `${operationalToday(now)}T${String(now.getUTCHours()).padStart(2, '0')}:00:00.000Z`;
}
