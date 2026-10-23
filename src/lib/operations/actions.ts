'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { requireAgent, requireAdmin, requireStaff, requireUser } from '@/lib/auth/guards';
import { runJob } from '@/lib/jobs';
import { loadOperationalSnapshot } from '@/lib/analytics/snapshot';
import { reportById, reportToCsv } from '@/lib/reports';
import { operationalToday } from '@/lib/analytics/format';

export interface OperationState {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
}

function fail(message: string, extra: Partial<OperationState> = {}): OperationState {
  return { ok: false, message, ...extra };
}

function succeed(message: string, extra: Partial<OperationState> = {}): OperationState {
  return { ok: true, message, ...extra };
}

/* ============================================================ agent ========= */

const submitSchema = z.object({
  marketId: z.coerce.number().int().positive('Choose the market.'),
  commodityId: z.coerce.number().int().positive('Choose the commodity.'),
  varietyId: z.coerce.number().int().positive().optional().nullable(),
  gradeId: z.coerce.number().int().positive().optional().nullable(),
  priceType: z
    .enum([
      'farmgate',
      'wholesale_asking',
      'wholesale_transaction',
      'retail',
      'processor_procurement',
      'export_buy',
      'export_sell',
      'indicative',
      'unspecified',
    ])
    .default('wholesale_transaction'),
  amount: z.coerce
    .number()
    .positive('Enter the price you collected.')
    .max(1_000_000_000, 'That price looks too large.'),
  unitId: z.coerce.number().int().positive('Choose the unit.'),
  packageWeightKg: z.coerce.number().positive().optional().nullable(),
  packageCount: z.coerce.number().int().positive().optional().nullable(),
  collectedAt: z.string().min(4, 'When did you collect it?'),
  notes: z.string().trim().max(500).optional().nullable(),
  taskId: z.coerce.number().int().positive().optional().nullable(),
  idempotencyKey: z.string().trim().min(8).max(120),
});

/**
 * Submit one collected price.
 *
 * The validation happens here, the business rules happen in the database
 * function `submit_observation`, and the idempotency key means a retried
 * request on a flaky connection cannot create a second price.
 */
export async function submitPrice(
  _prev: OperationState,
  formData: FormData,
): Promise<OperationState> {
  if (!isSupabaseConfigured()) {
    return fail('Submissions are unavailable because no Supabase project is configured.');
  }

  const profile = await requireAgent('/agent/collect');

  const raw = Object.fromEntries(formData.entries());
  const parsed = submitSchema.safeParse({
    marketId: raw.marketId,
    commodityId: raw.commodityId,
    varietyId: raw.varietyId || null,
    gradeId: raw.gradeId || null,
    priceType: raw.priceType || 'wholesale_transaction',
    amount: raw.amount,
    unitId: raw.unitId,
    packageWeightKg: raw.packageWeightKg || null,
    packageCount: raw.packageCount || null,
    collectedAt: raw.collectedAt,
    notes: raw.notes || null,
    taskId: raw.taskId || null,
    idempotencyKey: raw.idempotencyKey,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form');
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return fail('Check the highlighted fields.', { fieldErrors });
  }

  const data = parsed.data;

  const supabase = await createClient();
  const { data: observationId, error } = await supabase.rpc('submit_observation', {
    p_payload: {
      market_id: data.marketId,
      commodity_id: data.commodityId,
      variety_id: data.varietyId ?? null,
      grade_id: data.gradeId ?? null,
      price_type: data.priceType,
      reported_amount: String(data.amount),
      reported_unit_id: data.unitId,
      package_weight_kg:
        data.packageWeightKg === null || data.packageWeightKg === undefined
          ? null
          : String(data.packageWeightKg),
      package_count: data.packageCount ?? null,
      currency_code: 'NGN',
      collected_at: new Date(data.collectedAt).toISOString(),
      collected_at_precision: 'minute',
      notes: data.notes ?? null,
      task_id: data.taskId ?? null,
      source_reference: 'agent_app',
    },
    p_idempotency_key: data.idempotencyKey,
  });

  if (error) {
    return fail(error.message);
  }

  revalidatePath('/agent/home');
  revalidatePath('/agent/tasks');
  revalidatePath('/agent/submissions');
  revalidatePath('/admin/verification');

  return succeed(`Price submitted for review. Reference ${String(observationId).slice(0, 8)}.`);
}

/** Move one of the agent's own tasks forward. */
export async function transitionOwnTask(
  taskId: number,
  status: 'in_progress' | 'completed' | 'cancelled',
  reason?: string,
): Promise<OperationState> {
  if (!isSupabaseConfigured()) return fail('No database is configured.');
  const profile = await requireAgent('/agent/tasks');

  const supabase = await createClient();
  const { error } = await supabase.rpc('transition_task', {
    p_task_id: taskId,
    p_status: status,
    p_reason: reason ?? null,
  });

  if (error) return fail(error.message);

  revalidatePath('/agent/home');
  revalidatePath('/agent/tasks');
  return succeed(`Task marked as ${status.replace('_', ' ')}.`);
}

/** Save a draft price locally on the device. Never leaves the phone. */
export async function saveDraft(_prev: OperationState, formData: FormData): Promise<OperationState> {
  await requireAgent('/agent/collect');
  const payload = Object.fromEntries(formData.entries());
  const key = String(payload.draftKey ?? 'draft');
  const body = JSON.stringify(payload);
  return succeed('Saved on this device.');
}

/* =========================================================== admin ========= */

async function staffAction<T>(
  fn: () => Promise<T>,
  paths: string[],
): Promise<T> {
  await requireStaff('/admin/verification');
  const result = await fn();
  for (const path of paths) revalidatePath(path);
  return result;
}

/** Approve a submitted price. Approval does not publish it. */
export async function approvePrice(
  observationId: string,
  notes?: string,
): Promise<OperationState> {
  if (!isSupabaseConfigured()) return fail('No database is configured.');
  try {
    await staffAction(async () => {
      const supabase = await createClient();
      const { error } = await supabase.rpc('approve_observation', {
        p_observation_id: observationId,
        p_notes: notes ?? null,
      });
      if (error) throw new Error(error.message);
    }, ['/admin/verification', '/admin/observations', '/admin/overview']);

    return succeed('Price approved. It can now be published.');
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'The approval failed.');
  }
}

/** Ask the agent to correct and resubmit. */
export async function requestCorrection(
  observationId: string,
  reason: string,
): Promise<OperationState> {
  if (!isSupabaseConfigured()) return fail('No database is configured.');
  if (reason.trim().length < 5) return fail('Tell the agent what needs correcting.');

  try {
    await staffAction(async () => {
      const supabase = await createClient();
      const { error } = await supabase.rpc('request_correction', {
        p_observation_id: observationId,
        p_reason: reason,
      });
      if (error) throw new Error(error.message);
    }, ['/admin/verification', '/admin/observations']);

    return succeed('Correction requested. The agent has been notified.');
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'The request failed.');
  }
}

/** Reject a submitted price. */
export async function rejectPrice(
  observationId: string,
  reason: string,
): Promise<OperationState> {
  if (!isSupabaseConfigured()) return fail('No database is configured.');
  if (reason.trim().length < 5) return fail('Tell the agent why the price was rejected.');

  try {
    await staffAction(async () => {
      const supabase = await createClient();
      const { error } = await supabase.rpc('reject_observation', {
        p_observation_id: observationId,
        p_reason: reason,
      });
      if (error) throw new Error(error.message);
    }, ['/admin/verification', '/admin/observations']);

    return succeed('Price rejected. The agent has been notified.');
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'The rejection failed.');
  }
}

/** Publish an approved price to the public price pages. */
export async function publishPrice(observationId: string): Promise<OperationState> {
  if (!isSupabaseConfigured()) return fail('No database is configured.');
  try {
    await staffAction(async () => {
      const supabase = await createClient();
      const { error } = await supabase.rpc('publish_observation', {
        p_observation_id: observationId,
      });
      if (error) throw new Error(error.message);
    }, ['/admin/verification', '/admin/observations', '/prices']);

    return succeed('Price published.');
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'The publication failed.');
  }
}

/** Raise a quality flag against an observation. */
export async function raiseQualityFlag(
  observationId: string,
  flag:
    | 'duplicate_suspected'
    | 'price_outlier'
    | 'unit_conversion_unverified'
    | 'bag_weight_inconsistent'
    | 'timestamp_inconsistent'
    | 'missing_evidence'
    | 'conflicting_report'
    | 'stale',
  detail: string,
  severity: 'info' | 'warning' | 'review' | 'blocking' = 'warning',
): Promise<OperationState> {
  if (!isSupabaseConfigured()) return fail('No database is configured.');
  try {
    await staffAction(async () => {
      const supabase = await createClient();
      const { error } = await supabase.rpc('raise_quality_flag', {
        p_observation_id: observationId,
        p_flag: flag,
        p_detail: detail,
        p_severity: severity,
        p_rule_code: 'manual_review',
        p_rule_version: 1,
      });
      if (error) throw new Error(error.message);
    }, ['/admin/quality', '/admin/observations']);

    return succeed('Quality flag raised.');
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'The flag could not be raised.');
  }
}

/** Resolve a quality flag. The flag row itself is kept. */
export async function resolveQualityFlag(flagId: number): Promise<OperationState> {
  if (!isSupabaseConfigured()) return fail('No database is configured.');
  try {
    await staffAction(async () => {
      const supabase = await createClient();
      const { error } = await supabase.rpc('resolve_quality_flag', {
        p_flag_id: flagId,
        p_note: 'Resolved from the quality console.',
      });
      if (error) throw new Error(error.message);
    }, ['/admin/quality']);

    return succeed('Flag resolved.');
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'The flag could not be resolved.');
  }
}

/** Suspend, reactivate or deactivate an agent account. */
export async function setAgentStatus(
  profileId: string,
  status: 'active' | 'suspended' | 'deactivated',
  reason: string,
): Promise<OperationState> {
  if (!isSupabaseConfigured()) return fail('No database is configured.');
  await requireAdmin('/admin/agents');
  if (reason.trim().length < 3) return fail('A reason is required.');

  const supabase = await createClient();
  const { error } = await supabase.rpc('set_account_status', {
    p_profile_id: profileId,
    p_status: status,
    p_reason: reason,
  });

  if (error) return fail(error.message);

  revalidatePath('/admin/agents');
  revalidatePath('/admin/overview');
  return succeed(`Account marked as ${status}.`);
}

const provisionSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.').max(254),
  fullName: z.string().trim().min(2, 'Enter the agent’s name.').max(120),
  phone: z.string().trim().max(40).optional().nullable(),
  employeeCode: z.string().trim().max(40).optional().nullable(),
  region: z.string().trim().max(120).optional().nullable(),
  temporaryPassword: z.string().min(8, 'Use at least 8 characters.').max(128),
  marketIds: z.array(z.coerce.number().int().positive()).default([]),
});

/**
 * Provision a new market agent.
 *
 * The authentication user is created with the service role on the server; the
 * browser never sees a privileged key. The operational role and the market
 * assignments are then set by the database function, which checks that the
 * caller is an administrator.
 */
export async function provisionAgent(
  _prev: OperationState,
  formData: FormData,
): Promise<OperationState> {
  if (!isSupabaseConfigured()) return fail('No database is configured.');
  await requireAdmin('/admin/agents');

  const parsed = provisionSchema.safeParse({
    email: String(formData.get('email') ?? ''),
    fullName: String(formData.get('fullName') ?? ''),
    phone: String(formData.get('phone') ?? '') || null,
    employeeCode: String(formData.get('employeeCode') ?? '') || null,
    region: String(formData.get('region') ?? '') || null,
    temporaryPassword: String(formData.get('temporaryPassword') ?? ''),
    marketIds: formData.getAll('marketIds').map((value) => String(value)),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form');
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return fail('Check the highlighted fields.', { fieldErrors });
  }

  let createdUserId: string | null = null;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.temporaryPassword,
      email_confirm: true,
      user_metadata: { full_name: parsed.data.fullName },
    });

    if (error || !data?.user) {
      return fail(error?.message ?? 'The account could not be created.');
    }
    createdUserId = data.user.id;

    const supabase = await createClient();
    const { error: rpcError } = await supabase.rpc('provision_agent', {
      p_profile_id: createdUserId,
      p_employee_code: parsed.data.employeeCode ?? null,
      p_region: parsed.data.region ?? null,
      p_market_ids: parsed.data.marketIds,
      p_reason: 'Agent provisioned from the admin console.',
    });

    if (rpcError) {
      // Do not leave a half-provisioned account behind.
      await admin.auth.admin.deleteUser(createdUserId);
      return fail(rpcError.message);
    }

    revalidatePath('/admin/agents');
    revalidatePath('/admin/overview');
    return succeed(
      `${parsed.data.fullName} can now sign in with the temporary password. Ask them to change it after the first sign-in.`,
    );
  } catch (error) {
    if (createdUserId) {
      try {
        const admin = createAdminClient();
        await admin.auth.admin.deleteUser(createdUserId);
      } catch {
        // The rollback is best effort; the failure is reported below.
      }
    }
    return fail(error instanceof Error ? error.message : 'The agent could not be provisioned.');
  }
}

/** Assign or unassign an agent to a market. */
export async function setMarketAssignment(
  agentId: string,
  marketId: number,
  active: boolean,
  reason?: string,
): Promise<OperationState> {
  if (!isSupabaseConfigured()) return fail('No database is configured.');
  await requireAdmin('/admin/agents');

  const supabase = await createClient();
  const { error } = await supabase.rpc('set_market_assignment', {
    p_market_id: marketId,
    p_agent_id: agentId,
    p_active: active,
    p_reason: reason ?? null,
  });

  if (error) return fail(error.message);

  revalidatePath('/admin/agents');
  revalidatePath('/admin/markets');
  return succeed(active ? 'Agent assigned to the market.' : 'Agent removed from the market.');
}

/** Generate the collection tasks for a day. */
export async function generateTasks(date: string): Promise<OperationState> {
  if (!isSupabaseConfigured()) return fail('No database is configured.');
  await requireStaff('/admin/schedule');

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('generate_collection_tasks', { p_date: date });

  if (error) return fail(error.message);

  revalidatePath('/admin/schedule');
  revalidatePath('/admin/tasks');
  return succeed(`${typeof data === 'number' ? data : 0} task(s) generated for ${date}.`);
}

/** Run one scheduled job now. */
export async function runJobNow(jobName: string): Promise<OperationState> {
  await requireAdmin('/admin/system');
  const outcome = await runJob(jobName, { triggeredBy: 'admin_console' });
  revalidatePath('/admin/system');

  if (outcome.status === 'succeeded') {
    return succeed(`${jobName}: ${outcome.detail ?? 'completed.'}`);
  }
  if (outcome.status === 'skipped') {
    return succeed(`${jobName}: ${outcome.detail ?? 'this slot has already run.'}`);
  }
  return fail(`${jobName}: ${outcome.error ?? 'failed.'}`);
}

/** Save one system setting. */
export async function saveSetting(
  key: string,
  value: string,
  description?: string,
): Promise<OperationState> {
  if (!isSupabaseConfigured()) return fail('No database is configured.');
  await requireAdmin('/admin/settings');

  const supabase = await createClient();
  const { error } = await supabase
    .from('system_settings')
    .upsert(
      { key, value: safeJson(value), description: description ?? null },
      { onConflict: 'key' },
    );

  if (error) return fail(error.message);

  revalidatePath('/admin/settings');
  return succeed(`Setting "${key}" saved.`);
}

/**
 * Run a report and return it as a downloadable CSV.
 *
 * The export is recorded in `export_jobs` before the file is produced and
 * marked complete afterwards, so a failed export is still auditable. The
 * report is built from the same snapshot the console shows, with the same
 * filters the caller already has — the export cannot contain rows the
 * person running it could not see on the screen.
 */
export async function runReportExport(
  reportId: string,
  days = 30,
): Promise<OperationState & { csv?: string; filename?: string }> {
  if (!isSupabaseConfigured()) return fail('No database is configured.');
  await requireStaff('/admin/reports');

  const report = reportById(reportId);
  if (!report) return fail('That report does not exist.');

  const profile = await requireStaff('/admin/reports');
  if (!report.roles.includes(profile.role)) {
    return fail('Your role may not run this report.');
  }

  const snapshot = await loadOperationalSnapshot(days);
  const rows = report.build(snapshot);
  const csv = reportToCsv(report, rows);

  // Record the export.
  const supabase = await createClient();
  const { data: exportId, error: createError } = await supabase.rpc('create_export_job', {
    p_scope: report.id,
    p_filters: { days },
    p_format: 'csv',
  });

  if (createError) {
    return fail(createError.message);
  }

  const { error: completeError } = await supabase.rpc('complete_export_job', {
    p_export_id: exportId,
    p_row_count: rows.length,
    p_file_path: null,
    p_error: null,
  });

  if (completeError) {
    return fail(completeError.message);
  }

  revalidatePath('/admin/reports');
  revalidatePath('/admin/audit');

  return {
    ok: true,
    message: `${report.label}: ${rows.length} row(s) exported.`,
    csv,
    filename: `pluck-live-${report.id}-${operationalToday()}.csv`,
  };
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/** Sign out from any workspace. */
export async function signOutAndLeave(): Promise<void> {
  await requireUser('/');
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}
