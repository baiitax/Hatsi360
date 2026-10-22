'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import { isStaffRole } from '@/lib/auth';

export interface VerificationResult {
  ok: boolean;
  message: string;
}

const reasonSchema = z.string().trim().min(5, 'Give a reason of at least 5 characters.').max(1000);

/**
 * Approve a submitted observation and publish it.
 *
 * The publication itself happens inside the database (`public.publish_observation`),
 * so the publication timestamp and the audit trail are written atomically and
 * cannot be skipped by the caller.
 */
export async function approveObservation(observationId: string): Promise<VerificationResult> {
  const profile = await getProfile();
  if (!profile || !isStaffRole(profile.role)) {
    return { ok: false, message: 'You do not have permission to publish prices.' };
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, message: 'No database is configured in this deployment.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('publish_observation', {
    p_observation_id: observationId,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath('/admin');
  revalidatePath('/prices');
  revalidatePath('/');
  return { ok: true, message: 'Observation approved and published.' };
}

/** Reject a submitted observation. A reason is mandatory. */
export async function rejectObservation(
  observationId: string,
  reason: string,
): Promise<VerificationResult> {
  const profile = await getProfile();
  if (!profile || !isStaffRole(profile.role)) {
    return { ok: false, message: 'You do not have permission to reject observations.' };
  }

  const parsed = reasonSchema.safeParse(reason);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]!.message };
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, message: 'No database is configured in this deployment.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('reject_observation', {
    p_observation_id: observationId,
    p_reason: parsed.data,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath('/admin');
  return { ok: true, message: 'Observation rejected. The reason has been recorded.' };
}

/** Ask the agent to correct and resubmit. */
export async function requestCorrection(
  observationId: string,
  reason: string,
): Promise<VerificationResult> {
  const profile = await getProfile();
  if (!profile || !isStaffRole(profile.role)) {
    return { ok: false, message: 'You do not have permission to request corrections.' };
  }

  const parsed = reasonSchema.safeParse(reason);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]!.message };
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, message: 'No database is configured in this deployment.' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('price_observations')
    .update({
      verification_status: 'correction_requested',
      verified_at: new Date().toISOString(),
      verified_by: profile.id,
    })
    .eq('id', observationId)
    .eq('verification_status', 'pending_verification');

  if (error) {
    return { ok: false, message: error.message };
  }

  await supabase.from('price_verification_events').insert({
    observation_id: observationId,
    action: 'correction_requested',
    actor_id: profile.id,
    actor_role: profile.role,
    reason: parsed.data,
  });

  revalidatePath('/admin');
  revalidatePath('/agent');
  return { ok: true, message: 'Correction requested. The agent has been notified in their queue.' };
}

/**
 * Publish a corrected observation that supersedes an already-published one.
 *
 * The original record is kept; the correction is appended and the original is
 * marked as no longer current.
 */
export async function publishCorrection(
  observationId: string,
  correction: Record<string, unknown>,
  reason: string,
): Promise<VerificationResult> {
  const profile = await getProfile();
  if (!profile || !isStaffRole(profile.role)) {
    return { ok: false, message: 'You do not have permission to publish corrections.' };
  }

  const parsed = reasonSchema.safeParse(reason);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]!.message };
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, message: 'No database is configured in this deployment.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('append_correction', {
    p_observation_id: observationId,
    p_correction: correction,
    p_reason: parsed.data,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath('/admin');
  revalidatePath('/prices');
  return { ok: true, message: `Correction published (${String(data)}). The original is retained in the audit trail.` };
}
