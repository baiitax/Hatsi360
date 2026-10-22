'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import {
  canSubmitObservation,
  detectDuplicates,
  observationIdempotencyKey,
  validateObservation,
  type ObservationInput,
} from './validation';

export interface SubmissionResult {
  ok: boolean;
  message: string;
  /** True only when the record has been written to the database. */
  synced: boolean;
  observationId?: string;
  duplicateOf?: string;
  fieldErrors?: Record<string, string>;
}

const EMPTY: SubmissionResult = { ok: false, message: '', synced: false };

/**
 * Submit a price observation for verification.
 *
 * The order of checks matters and is deliberate:
 *   1. Validate the payload.
 *   2. Check the caller's assignment for this market (server-side).
 *   3. Check for a duplicate.
 *   4. Insert the record and the audit event.
 *
 * The client is never trusted for any of these.
 */
export async function submitObservation(
  raw: unknown,
  mode: 'draft' | 'submit' = 'submit',
): Promise<SubmissionResult> {
  const parsed = validateObservation(raw);
  if (!parsed.ok || !parsed.data) {
    return {
      ...EMPTY,
      message: parsed.error ?? 'Check the highlighted fields.',
      fieldErrors: parsed.fieldErrors,
    };
  }
  const input: ObservationInput = parsed.data;

  const profile = await getProfile();
  if (!profile) {
    return { ...EMPTY, message: 'Your session has expired. Please sign in again.' };
  }

  if (!isSupabaseConfigured()) {
    return {
      ...EMPTY,
      message:
        'This deployment has no database configured, so the observation was not stored. Your entry is still saved on this device as a local draft.',
    };
  }

  const supabase = await createClient();

  // --- authorisation -------------------------------------------------------
  const { data: assignments } = await supabase
    .from('market_agent_assignments')
    .select('market_id, status, starts_on, ends_on')
    .eq('user_id', profile.id)
    .eq('status', 'active');

  const today = new Date().toISOString().slice(0, 10);
  const assignedMarketIds = (assignments ?? [])
    .filter(
      (a) =>
        (a.ends_on == null || (a.ends_on as string) >= today) &&
        (a.starts_on as string) <= today,
    )
    .map((a) => a.market_id as number);

  const permission = canSubmitObservation(
    { userId: profile.id, role: profile.role, assignedMarketIds },
    input.marketId,
  );

  if (!permission.allowed) {
    return { ...EMPTY, message: permission.reason ?? 'You are not allowed to submit for this market.' };
  }

  // --- duplicate detection -------------------------------------------------
  const { data: recent } = await supabase
    .from('price_observations')
    .select(
      'id, commodity_id, market_id, price_type, reported_amount, reported_unit_id, collected_at',
    )
    .eq('market_id', input.marketId)
    .eq('commodity_id', input.commodityId)
    .eq('is_current', true)
    .gte('collected_at', new Date(Date.now() - 24 * 3600_000).toISOString());

  const duplicates = detectDuplicates(
    {
      commodityId: input.commodityId,
      marketId: input.marketId,
      priceType: input.priceType,
      gradeId: input.gradeId ?? null,
      amount: input.amount,
      unitId: input.unitId,
      collectedAt: new Date(input.collectedAt).toISOString(),
    },
    (recent ?? []).map((row) => ({
      id: row.id as string,
      commodityId: row.commodity_id as number,
      marketId: row.market_id as number,
      priceType: row.price_type as ObservationInput['priceType'],
      amount: Number(row.reported_amount ?? 0),
      unitId: (row.reported_unit_id as number | null) ?? null,
      collectedAt: row.collected_at as string,
    })),
  );

  if (duplicates.length > 0 && mode === 'submit') {
    return {
      ...EMPTY,
      message:
        'An identical observation already exists for this market and time. Nothing was submitted — check the submissions list and edit the existing record if it needs correcting.',
      duplicateOf: duplicates[0]!.id,
    };
  }

  // --- insert --------------------------------------------------------------
  const idempotencyKey = observationIdempotencyKey({
    userId: profile.id,
    commodityId: input.commodityId,
    marketId: input.marketId,
    priceType: input.priceType,
    amount: input.amount,
    unitId: input.unitId,
    collectedAt: input.collectedAt,
  });

  const status = mode === 'draft' ? 'draft' : 'pending_verification';

  const { data: inserted, error } = await supabase
    .from('price_observations')
    .insert({
      commodity_id: input.commodityId,
      market_id: input.marketId,
      variety_id: input.varietyId ?? null,
      grade_id: input.gradeId ?? null,
      price_type: input.priceType,
      reported_amount: input.amount,
      reported_unit_id: input.unitId,
      package_weight_kg: input.packageWeightKg ?? null,
      package_count: input.packageCount ?? null,
      currency_code: 'NGN',
      collected_at: new Date(input.collectedAt).toISOString(),
      collected_at_precision: 'minute',
      submitted_at: mode === 'submit' ? new Date().toISOString() : null,
      agent_user_id: profile.id,
      verification_status: status,
      notes: input.notes ?? null,
      source_system: 'agent_app',
      source_reference: idempotencyKey,
    })
    .select('id')
    .single();

  if (error || !inserted) {
    // A unique-violation on the idempotency key means the record is already
    // there — that is a success from the agent's point of view.
    if (error?.code === '23505') {
      return {
        ok: true,
        synced: true,
        message: 'This observation was already saved. Nothing was duplicated.',
      };
    }
    return {
      ...EMPTY,
      message: 'The observation could not be saved. Your entry is still stored on this device.',
    };
  }

  await supabase.from('price_verification_events').insert({
    observation_id: inserted.id,
    action: mode === 'submit' ? 'submitted' : 'approved',
    actor_id: profile.id,
    actor_role: profile.role,
    notes: mode === 'submit' ? null : 'Saved as a draft.',
  });

  revalidatePath('/agent');

  return {
    ok: true,
    synced: true,
    observationId: inserted.id as string,
    message:
      mode === 'submit'
        ? 'Submitted for verification. It is now in the verification queue.'
        : 'Draft saved to the database.',
  };
}
