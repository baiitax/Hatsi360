'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { requireAgent } from '@/lib/auth/guards';
import { markRead } from '@/lib/notifications';

/**
 * Hatsi360 Field — the agent's own actions.
 *
 * Every action here re-checks the caller's role and, where a record is
 * involved, its ownership. The client is never trusted: the browser says
 * which observation it means, and the database decides whether the caller may
 * touch it.
 *
 * Nothing in this file fabricates a price, and nothing overwrites a
 * submitted record. A correction appends; the previous values are kept.
 */

export interface FieldActionState {
  ok: boolean;
  message: string;
  observationId?: string;
  fieldErrors?: Record<string, string>;
}

function fail(message: string, extra: Partial<FieldActionState> = {}): FieldActionState {
  return { ok: false, message, ...extra };
}

function succeed(message: string, extra: Partial<FieldActionState> = {}): FieldActionState {
  return { ok: true, message, ...extra };
}

const EVIDENCE_BUCKET = 'hatsi360-evidence';
const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;
const ALLOWED_EVIDENCE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
];

/* ------------------------------------------------------- the price record -- */

const priceFields = z.object({
  marketId: z.coerce.number().int().positive('Choose the market.'),
  commodityId: z.coerce.number().int().positive('Choose the commodity.'),
  gradeId: z.coerce.number().int().positive().optional().nullable(),
  varietyId: z.coerce.number().int().positive().optional().nullable(),
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
    ])
    .default('wholesale_transaction'),
  amount: z.coerce
    .number()
    .positive('Enter the price you collected.')
    .max(1_000_000_000, 'That price looks too large.'),
  unitId: z.coerce.number().int().positive('Choose the unit the price was quoted in.'),
  packageWeightKg: z.coerce.number().positive().optional().nullable(),
  packageCount: z.coerce.number().int().positive().optional().nullable(),
  collectedAt: z.string().min(4, 'When did you collect it?'),
  notes: z.string().trim().max(1000).optional().nullable(),
  taskId: z.coerce.number().int().positive().optional().nullable(),
  idempotencyKey: z.string().trim().min(8).max(120),
});

/**
 * Save a draft price to the server.
 *
 * A draft is a real record with `verification_status = 'draft'`. It is not
 * submitted, it is not visible to the public, and it does not appear in the
 * review queue. It exists so that the work survives a lost, wiped or
 * replaced phone — which is the whole point of saving it before submission.
 */
export async function saveFieldDraft(
  _prev: FieldActionState,
  formData: FormData,
): Promise<FieldActionState> {
  if (!isSupabaseConfigured()) {
    return fail('Drafts are unavailable because no database is configured.');
  }
  const profile = await requireAgent('/agent/collection/new');

  const raw = Object.fromEntries(formData.entries());
  const parsed = priceFields.safeParse({
    marketId: raw.marketId,
    commodityId: raw.commodityId,
    gradeId: raw.gradeId || null,
    varietyId: raw.varietyId || null,
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

  // A draft may only be saved at a market the agent is assigned to, and the
  // database enforces that too.
  const { data: assigned } = await supabase.rpc('is_assigned_to_market', {
    p_market_id: data.marketId,
  });
  if (!assigned) {
    return fail('You are not assigned to that market, so you cannot collect there.');
  }

  const { data: draftId, error } = await supabase
    .from('price_observations')
    .insert({
      commodity_id: data.commodityId,
      market_id: data.marketId,
      variety_id: data.varietyId ?? null,
      grade_id: data.gradeId ?? null,
      price_type: data.priceType,
      reported_amount: data.amount,
      reported_unit_id: data.unitId,
      package_weight_kg: data.packageWeightKg ?? null,
      package_count: data.packageCount ?? null,
      currency_code: 'NGN',
      collected_at: new Date(data.collectedAt).toISOString(),
      collected_at_precision: 'minute',
      agent_user_id: profile.id,
      verification_status: 'draft',
      notes: data.notes ?? null,
      source_system: 'agent_app',
      source_reference: 'agent_app_draft',
      submission_key: data.idempotencyKey,
    })
    .select('id')
    .single();

  if (error) return fail(error.message);

  revalidatePath('/agent/home');
  revalidatePath('/agent/observations');

  return succeed('Draft saved to the server. It has not been submitted for review.', {
    observationId: draftId.id as string,
  });
}

/**
 * Submit a collected price for review.
 *
 * The business rules live in the database function `submit_observation`:
 * the role, the account status, the market assignment and the task
 * ownership are all checked there, and the idempotency key means a retried
 * request on a weak connection cannot create a second price.
 */
export async function submitFieldPrice(
  _prev: FieldActionState,
  formData: FormData,
): Promise<FieldActionState> {
  if (!isSupabaseConfigured()) {
    return fail('Submissions are unavailable because no database is configured.');
  }
  await requireAgent('/agent/collection/new');

  const raw = Object.fromEntries(formData.entries());
  const parsed = priceFields.safeParse({
    marketId: raw.marketId,
    commodityId: raw.commodityId,
    gradeId: raw.gradeId || null,
    varietyId: raw.varietyId || null,
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

  if (error) return fail(error.message);

  revalidatePath('/agent/home');
  revalidatePath('/agent/assignments');
  revalidatePath('/agent/observations');
  revalidatePath('/agent/history');
  revalidatePath('/admin/verification');

  const reference = String(observationId).slice(0, 8);
  return succeed(`Price submitted for review. Reference ${reference}.`, {
    observationId: String(observationId),
  });
}

/**
 * Answer a correction request.
 *
 * The reviewed record is preserved: the correction is appended as a new
 * observation that supersedes it, the previous values are written to the
 * revision history, and the audit trail records both. Nothing is overwritten
 * and nothing is deleted.
 */
export async function resubmitFieldObservation(
  _prev: FieldActionState,
  formData: FormData,
): Promise<FieldActionState> {
  if (!isSupabaseConfigured()) return fail('No database is configured.');
  await requireAgent('/agent/corrections');

  const raw = Object.fromEntries(formData.entries());
  const observationId = String(raw.observationId ?? '');
  const amount = z.coerce.number().positive('Enter the corrected price.').safeParse(raw.amount);
  const unitId = z.coerce.number().int().positive('Choose the unit.').safeParse(raw.unitId);
  const gradeId = z.coerce.number().int().positive().optional().nullable().safeParse(
    raw.gradeId || null,
  );

  if (!observationId) return fail('The observation to correct is missing.');
  if (!amount.success) return fail(amount.error.issues[0]?.message ?? 'Enter the corrected price.');
  if (!unitId.success) return fail('Choose the unit.');

  const supabase = await createClient();

  const { data: newId, error } = await supabase.rpc('resubmit_observation', {
    p_observation_id: observationId,
    p_payload: {
      reported_amount: String(amount.data),
      reported_unit_id: unitId.data,
      grade_id: gradeId.success ? gradeId.data : null,
      price_type: raw.priceType || undefined,
      collected_at: raw.collectedAt || undefined,
      notes: raw.notes || null,
    },
    p_reason: raw.reason || null,
  });

  if (error) return fail(error.message);

  revalidatePath('/agent/home');
  revalidatePath('/agent/corrections');
  revalidatePath('/agent/observations');
  revalidatePath('/admin/verification');

  return succeed('Your correction was sent back for review.', {
    observationId: String(newId),
  });
}

/* ------------------------------------------------------------- evidence -- */

/**
 * Attach a photograph or document to one of the agent's own observations.
 *
 * The file goes to a private bucket. It is never given a public URL: the
 * agent and the reviewer read it through a short-lived signed link, so the
 * evidence for a price is not something the whole internet can fetch.
 */
export async function uploadFieldEvidence(
  observationId: string,
  file: File,
  caption?: string,
): Promise<FieldActionState> {
  if (!isSupabaseConfigured()) return fail('No database is configured.');
  const profile = await requireAgent('/agent/observations');

  if (!observationId) return fail('The observation is missing.');
  if (!file || file.size === 0) return fail('Choose a file to attach.');
  if (file.size > MAX_EVIDENCE_BYTES) {
    return fail('That file is larger than 5 MB. Take a smaller photograph.');
  }
  if (!ALLOWED_EVIDENCE_TYPES.includes(file.type)) {
    return fail('Attach a JPEG, PNG, WebP, HEIC photograph or a PDF.');
  }

  const supabase = await createClient();

  // The observation must be the agent's own and must still be editable.
  const { data: observation } = await supabase
    .from('price_observations')
    .select('id, verification_status')
    .eq('id', observationId)
    .eq('agent_user_id', profile.id)
    .maybeSingle();

  if (!observation) return fail('That observation does not belong to you.');
  if (!['draft', 'correction_requested'].includes(observation.verification_status)) {
    return fail('Evidence can only be attached to a draft or to a record awaiting correction.');
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
  const path = `${observationId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) return fail(uploadError.message);

  const { error: insertError } = await supabase.from('price_observation_evidence').insert({
    observation_id: observationId,
    storage_path: path,
    file_name: safeName,
    content_type: file.type,
    byte_size: file.size,
    caption: caption?.trim() || null,
    uploaded_by: profile.id,
  });

  if (insertError) {
    // The row could not be written, so the object is removed rather than
    // left orphaned in the bucket.
    await supabase.storage.from(EVIDENCE_BUCKET).remove([path]);
    return fail(insertError.message);
  }

  revalidatePath('/agent/observations');

  return succeed('Evidence attached.');
}

/** Remove one piece of evidence the agent attached. */
export async function removeFieldEvidence(evidenceId: number): Promise<FieldActionState> {
  if (!isSupabaseConfigured()) return fail('No database is configured.');
  const profile = await requireAgent('/agent/observations');

  const supabase = await createClient();

  const { data: evidence } = await supabase
    .from('price_observation_evidence')
    .select('id, storage_path, observation_id')
    .eq('id', evidenceId)
    .maybeSingle();

  if (!evidence) return fail('That evidence does not exist.');

  const { data: observation } = await supabase
    .from('price_observations')
    .select('id, agent_user_id, verification_status')
    .eq('id', evidence.observation_id)
    .maybeSingle();

  if (!observation || observation.agent_user_id !== profile.id) {
    return fail('That evidence does not belong to you.');
  }
  if (!['draft', 'correction_requested'].includes(observation.verification_status)) {
    return fail('Evidence on a submitted record cannot be removed.');
  }

  await supabase.storage.from(EVIDENCE_BUCKET).remove([evidence.storage_path]);
  const { error } = await supabase
    .from('price_observation_evidence')
    .delete()
    .eq('id', evidenceId);

  if (error) return fail(error.message);

  revalidatePath('/agent/observations');
  return succeed('Evidence removed.');
}

/**
 * A short-lived link to one evidence file.
 *
 * The link is signed by the database, which checks that the caller owns the
 * observation the evidence belongs to. It is never a public URL, and it
 * expires after five minutes.
 */
export async function evidenceUrl(evidenceId: number): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  await requireAgent('/agent/observations');

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('agent_evidence_url', {
    p_evidence_id: evidenceId,
  });

  if (error) return null;
  return typeof data === 'string' ? data : null;
}

/* --------------------------------------------------------- notifications -- */

/** Mark notifications as read. */
export async function markFieldNotificationsRead(ids: string[]): Promise<FieldActionState> {
  const profile = await requireAgent('/agent/notifications');
  const count = await markRead(profile.id, ids);
  revalidatePath('/agent/notifications');
  revalidatePath('/agent/home');
  return succeed(
    count > 0
      ? `${count} notification${count === 1 ? '' : 's'} marked as read.`
      : 'Nothing to mark as read.',
  );
}

/* -------------------------------------------------------------- profile -- */

const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your name.').max(120),
  alternatePhone: z
    .string()
    .trim()
    .max(40)
    .regex(/^[0-9+\-\s()]*$/, 'Enter a phone number using digits, spaces and + only.')
    .optional()
    .or(z.literal('')),
});

/**
 * Update the fields the agent is allowed to change.
 *
 * The agent cannot change their role, their permissions, their account
 * status or their assignments. Only the contact details and the display name
 * are editable, and the database's own policy agrees.
 */
export async function updateFieldProfile(
  _prev: FieldActionState,
  formData: FormData,
): Promise<FieldActionState> {
  if (!isSupabaseConfigured()) return fail('No database is configured.');
  const profile = await requireAgent('/agent/profile');

  const raw = Object.fromEntries(formData.entries());
  const parsed = profileSchema.safeParse({
    fullName: raw.fullName,
    alternatePhone: raw.alternatePhone || '',
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form');
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return fail('Check the highlighted fields.', { fieldErrors });
  }

  const supabase = await createClient();

  // The function writes exactly the two permitted fields. A table policy
  // would let the agent update every column of their own agent_profiles row,
  // including the region and the employee code.
  const { error } = await supabase.rpc('update_agent_contact', {
    p_full_name: parsed.data.fullName,
    p_alternate_phone: parsed.data.alternatePhone || null,
  });

  if (error) return fail(error.message);

  revalidatePath('/agent/profile');
  revalidatePath('/agent/home');

  return succeed('Your details were saved.');
}

/* ------------------------------------------------------- the collection -- */

/**
 * Open a collection session.
 *
 * The market must be one the agent covers — the database checks it, and the
 * function refuses otherwise. The session reference is generated by the
 * database so it can be read out over the phone without trusting a value
 * from the device.
 *
 * The position is optional. When the agent confirms one it is sent as two
 * separate parameters; when they do not, both are null and the session opens
 * exactly the same way. The database drops anything out of range rather than
 * storing it, so a spoofed or nonsense coordinate cannot become a record of
 * where the agent was.
 */
export async function openFieldSession(
  _prev: FieldActionState,
  formData: FormData,
): Promise<FieldActionState> {
  if (!isSupabaseConfigured()) return fail('No database is configured.');
  await requireAgent('/agent/collection/new');

  const raw = Object.fromEntries(formData.entries());
  const marketId = z.coerce.number().int().positive('Choose the market.').safeParse(raw.marketId);
  if (!marketId.success) return fail(marketId.error.issues[0]?.message ?? 'Choose the market.');

  const taskId = raw.taskId
    ? z.coerce.number().int().positive().safeParse(raw.taskId)
    : null;

  const latitude = z.coerce.number().min(-90).max(90).nullish().safeParse(raw.latitude);
  const longitude = z.coerce.number().min(-180).max(180).nullish().safeParse(raw.longitude);
  const hasPosition = latitude.success && longitude.success && latitude.data != null;

  const supabase = await createClient();
  const { data: batchId, error } = hasPosition
    ? await supabase.rpc('open_collection_batch', {
        p_market_id: marketId.data,
        p_task_id: taskId?.success ? taskId.data : null,
        p_reference: null,
        p_notes: (raw.notes as string) || null,
        p_latitude: latitude.data,
        p_longitude: longitude.data,
      })
    : await supabase.rpc('open_collection_batch', {
        p_market_id: marketId.data,
        p_task_id: taskId?.success ? taskId.data : null,
        p_reference: null,
        p_notes: (raw.notes as string) || null,
      });

  if (error) return fail(error.message);

  revalidatePath('/agent/home');
  revalidatePath('/agent/history');

  return succeed('Collection session opened.', { observationId: String(batchId) });
}

/**
 * Add one commodity to the current session.
 *
 * Each commodity becomes its own observation with its own grade, unit and
 * price type. Two commodities are never combined into one record, because a
 * price per bag of maize and a price per kilogram of rice are not the same
 * measurement and must not be averaged into one number.
 *
 * The observation is saved as a draft first. It is not submitted until the
 * agent says so, and the interface says so too.
 */
export async function addFieldObservation(
  _prev: FieldActionState,
  formData: FormData,
): Promise<FieldActionState> {
  if (!isSupabaseConfigured()) return fail('No database is configured.');
  const profile = await requireAgent('/agent/collection');

  const raw = Object.fromEntries(formData.entries());

  const batchId = z.coerce.number().int().positive('The session is missing.').safeParse(raw.batchId);
  if (!batchId.success) return fail('The collection session is missing.');

  const parsed = priceFields.safeParse({
    marketId: raw.marketId,
    commodityId: raw.commodityId,
    gradeId: raw.gradeId || null,
    varietyId: raw.varietyId || null,
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

  // The session must belong to the agent.
  const { data: batch } = await supabase
    .from('collection_batches')
    .select('id, market_id, completed_at')
    .eq('id', batchId.data)
    .eq('agent_user_id', profile.id)
    .maybeSingle();

  if (!batch) return fail('That collection session is not yours.');
  if (batch.completed_at) {
    return fail('This collection session is already closed. Open a new one to add a price.');
  }
  if ((batch.market_id as number) !== data.marketId) {
    return fail('That price is for a different market than the session.');
  }

  const { data: draftId, error } = await supabase
    .from('price_observations')
    .insert({
      commodity_id: data.commodityId,
      market_id: data.marketId,
      variety_id: data.varietyId ?? null,
      grade_id: data.gradeId ?? null,
      price_type: data.priceType,
      reported_amount: data.amount,
      reported_unit_id: data.unitId,
      package_weight_kg: data.packageWeightKg ?? null,
      package_count: data.packageCount ?? null,
      currency_code: 'NGN',
      collected_at: new Date(data.collectedAt).toISOString(),
      collected_at_precision: 'minute',
      agent_user_id: profile.id,
      verification_status: 'draft',
      notes: data.notes ?? null,
      source_system: 'agent_app',
      source_reference: 'agent_app_draft',
      submission_key: data.idempotencyKey,
      collection_batch_id: batchId.data,
    })
    .select('id')
    .single();

  if (error) return fail(error.message);

  // The market intelligence is optional and is stored beside the price.
  const availability = raw.availability ? String(raw.availability) : null;
  const supplyLevel = raw.supplyLevel ? String(raw.supplyLevel) : null;
  const demandLevel = raw.demandLevel ? String(raw.demandLevel) : null;
  const priceDirection = raw.priceDirection ? String(raw.priceDirection) : null;
  const marketActivity = raw.marketActivity ? String(raw.marketActivity) : null;
  const sentiment = raw.sentiment ? String(raw.sentiment) : null;
  const developments = raw.developments ? String(raw.developments).trim() : null;

  if (availability || supplyLevel || demandLevel || priceDirection || marketActivity || sentiment || developments) {
    const { error: intelligenceError } = await supabase
      .from('observation_market_intelligence')
      .insert({
        observation_id: draftId.id,
        availability,
        supply_level: supplyLevel,
        demand_level: demandLevel,
        price_direction: priceDirection,
        market_activity: marketActivity,
        sentiment,
        developments,
        agent_user_id: profile.id,
      });

    if (intelligenceError) {
      // The price is the important part. If the context could not be saved,
      // say so rather than pretending it was recorded.
      return succeed(
        'The price was saved, but the market context could not be saved. Please add it again from the observation.',
        { observationId: String(draftId.id) },
      );
    }
  }

  revalidatePath('/agent/home');
  revalidatePath('/agent/observations');
  revalidatePath('/agent/history');

  return succeed(`${data.idempotencyKey ? '' : ''}Price added to the session as a draft. It has not been submitted for review.`, {
    observationId: String(draftId.id),
  });
}

/**
 * Submit a saved draft.
 *
 * The same record becomes the submitted observation — no second row — and
 * the idempotency key means a retry on a weak connection cannot create a
 * duplicate price. A conflict, where the record changed on the server while
 * the agent was working, is reported rather than overwritten.
 */
export async function submitFieldDraft(
  _prev: FieldActionState,
  formData: FormData,
): Promise<FieldActionState> {
  if (!isSupabaseConfigured()) return fail('No database is configured.');
  await requireAgent('/agent/collection');

  const raw = Object.fromEntries(formData.entries());
  const observationId = z.string().uuid('The observation is missing.').safeParse(raw.observationId);
  if (!observationId.success) return fail('The observation is missing.');

  const amount = z.coerce.number().positive('Enter the price you collected.').safeParse(raw.amount);
  if (!amount.success) return fail(amount.error.issues[0]?.message ?? 'Enter the price.');

  const unitId = z.coerce.number().int().positive('Choose the unit.').safeParse(raw.unitId);
  if (!unitId.success) return fail('Choose the unit.');

  const marketId = z.coerce.number().int().positive().safeParse(raw.marketId);
  const commodityId = z.coerce.number().int().positive().safeParse(raw.commodityId);

  const supabase = await createClient();

  const { data: observation } = await supabase
    .from('price_observations')
    .select('id, verification_status, updated_at, collected_at, commodity_id, market_id, collection_batch_id')
    .eq('id', observationId.data)
    .eq('agent_user_id', (await requireAgent('/agent/collection')).id)
    .maybeSingle();

  if (!observation) return fail('That observation does not belong to you.');
  if (observation.verification_status !== 'draft') {
    return fail('That price has already been submitted.');
  }

  const { data: submittedId, error } = await supabase.rpc('submit_observation', {
    p_payload: {
      market_id: marketId.success ? marketId.data : (observation.market_id as number),
      commodity_id: commodityId.success
        ? commodityId.data
        : (observation.commodity_id as number),
      reported_amount: String(amount.data),
      reported_unit_id: unitId.data,
      price_type: raw.priceType || 'wholesale_transaction',
      collected_at: observation.collected_at,
      collected_at_precision: 'minute',
      currency_code: 'NGN',
      notes: raw.notes || null,
      // The version the agent was looking at. If the record has moved on,
      // the database refuses rather than overwriting.
      expected_updated_at: observation.updated_at,
    },
    p_idempotency_key:
      (raw.idempotencyKey as string) || `draft-${observationId.data}`,
    p_observation_id: observationId.data,
  });

  if (error) {
    if (error.message.includes('changed on the server')) {
      return fail(
        'This price changed on the server while you were working on it. Open the record, check the current values and send it again.',
      );
    }
    return fail(error.message);
  }

  revalidatePath('/agent/home');
  revalidatePath('/agent/observations');
  revalidatePath('/agent/history');
  revalidatePath('/admin/verification');

  return succeed('Price sent for review.', { observationId: String(submittedId) });
}

/**
 * Remove a draft that has not been submitted.
 *
 * Only a draft may be removed, and only by the agent who recorded it. A
 * submitted price is never deleted — it is corrected, and the correction
 * keeps the original.
 */
export async function removeFieldDraft(
  _prev: FieldActionState,
  formData: FormData,
): Promise<FieldActionState> {
  if (!isSupabaseConfigured()) return fail('No database is configured.');
  const profile = await requireAgent('/agent/collection');

  const raw = Object.fromEntries(formData.entries());
  const observationId = z.string().uuid('The observation is missing.').safeParse(raw.observationId);
  if (!observationId.success) return fail('The observation is missing.');

  const supabase = await createClient();

  const { data: observation } = await supabase
    .from('price_observations')
    .select('id, verification_status')
    .eq('id', observationId.data)
    .eq('agent_user_id', profile.id)
    .maybeSingle();

  if (!observation) return fail('That observation does not belong to you.');
  if (observation.verification_status !== 'draft') {
    return fail('A price that has been submitted cannot be removed.');
  }

  const { error } = await supabase
    .from('price_observations')
    .delete()
    .eq('id', observationId.data)
    .eq('agent_user_id', profile.id)
    .eq('verification_status', 'draft');

  if (error) return fail(error.message);

  revalidatePath('/agent/home');
  revalidatePath('/agent/observations');
  revalidatePath('/agent/history');

  return succeed('The draft was removed.');
}

/**
 * Close a collection session.
 *
 * The session is closed when the agent says so. The observations inside keep
 * their own review state: closing a session does not approve anything.
 */
export async function closeFieldSession(
  _prev: FieldActionState,
  formData: FormData,
): Promise<FieldActionState> {
  if (!isSupabaseConfigured()) return fail('No database is configured.');
  await requireAgent('/agent/collection');

  const raw = Object.fromEntries(formData.entries());
  const batchId = z.coerce.number().int().positive('The session is missing.').safeParse(raw.batchId);
  if (!batchId.success) return fail('The collection session is missing.');

  const supabase = await createClient();
  const { error } = await supabase.rpc('close_collection_batch', {
    p_batch_id: batchId.data,
    p_notes: (raw.notes as string) || null,
  });

  if (error) return fail(error.message);

  revalidatePath('/agent/home');
  revalidatePath('/agent/history');
  revalidatePath('/agent/assignments');

  return succeed('The collection session is closed. Your prices are with the office for review.');
}
