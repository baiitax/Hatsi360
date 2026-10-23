import 'server-only';

import { createHash } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';

/**
 * Pluck Live — sign-in throttling.
 *
 * The attempt counter lives in the database (`auth_login_attempts`) so it
 * survives a restart and is shared by every instance of the application. The
 * identifier is hashed before it is stored: the table never holds an email
 * address or an IP address in a usable form.
 *
 * When no Supabase project is configured there is no account to protect, so
 * the limiter reports that it is not enforcing anything rather than pretending
 * that it is.
 */

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  /** True when the limiter is not enforcing because there is no database. */
  inactive: boolean;
}

const WINDOW_MINUTES = 15;
const MAX_FAILURES = 5;

export function hashIdentifier(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return createHash('sha256').update(ip.trim()).digest('hex');
}

/**
 * Has this identifier made too many failed attempts recently?
 */
export async function checkSignInLimit(identifier: string): Promise<RateLimitDecision> {
  if (!isSupabaseConfigured()) {
    return { allowed: true, remaining: MAX_FAILURES, retryAfterSeconds: 0, inactive: true };
  }

  const identifierHash = hashIdentifier(identifier);
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('count_login_attempts', {
    p_identifier_hash: identifierHash,
    p_since: new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString(),
  });

  if (error) {
    // Fail open on the counter itself: an outage of the counter must not lock
    // every agent out of the field. The attempt is still recorded.
    return { allowed: true, remaining: MAX_FAILURES, retryAfterSeconds: 0, inactive: true };
  }

  const failures = typeof data === 'number' ? data : 0;
  const allowed = failures < MAX_FAILURES;

  return {
    allowed,
    remaining: Math.max(0, MAX_FAILURES - failures),
    retryAfterSeconds: allowed ? 0 : WINDOW_MINUTES * 60,
    inactive: false,
  };
}

/** Record one attempt. Only failures count towards the limit. */
export async function recordSignInAttempt(
  identifier: string,
  succeeded: boolean,
  ip?: string | null,
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = await createClient();
  try {
    await supabase.rpc('record_login_attempt', {
      p_identifier_hash: hashIdentifier(identifier),
      p_ip_hash: hashIp(ip),
      p_succeeded: succeeded,
    });
  } catch {
    // Recording an attempt must never break a sign-in.
  }
}

/** Clear the counter after a successful sign-in. */
export async function clearSignInAttempts(identifier: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = await createClient();
  try {
    await supabase.rpc('clear_login_attempts', { p_identifier_hash: hashIdentifier(identifier) });
  } catch {
    // Best effort.
  }
}

export const SIGN_IN_LIMIT_MAX_FAILURES = MAX_FAILURES;
export const SIGN_IN_LIMIT_WINDOW_MINUTES = WINDOW_MINUTES;
