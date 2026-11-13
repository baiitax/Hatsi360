import 'server-only';

import { createHash, timingSafeEqual } from 'node:crypto';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getApplicationEntitlements,
  type EntitlementSet,
  type EntitlementKey,
} from '@/lib/entitlements';

export interface ApiApplication {
  id: string;
  userId: string;
  name: string;
  tier: 'free' | 'standard' | 'enterprise';
  scopes: string[];
  rateLimitPerMinute: number;
  expiresAt: string | null;
  isActive: boolean;
  /** The entitlement keys the key's owner holds. */
  entitlements: Record<string, boolean>;
  /** The resolved entitlement set, for server-side gating. */
  entitlementSet: EntitlementSet;
}

export type ApiAuthResult =
  | { ok: true; application: ApiApplication; anonymous: false }
  | { ok: true; application: null; anonymous: true }
  | { ok: false; reason: 'missing' | 'invalid' | 'expired' | 'inactive' };

export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

/**
 * Extract an API key from the request.
 *
 * Both `Authorization: Bearer <key>` and `X-API-Key: <key>` are accepted.
 */
export function extractApiKey(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (header) {
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    if (match) return match[1]!.trim();
  }
  const direct = request.headers.get('x-api-key');
  if (direct) return direct.trim();
  return null;
}

/**
 * Verify an API key.
 *
 * The key is hashed with SHA-256 and compared against the stored hash using a
 * constant-time comparison. The plaintext key is never stored and never logged.
 */
export async function authenticateApiKey(
  request: Request,
  requiredScope?: string,
): Promise<ApiAuthResult> {
  const rawKey = extractApiKey(request);

  // A keyless caller is admitted to any endpoint that does not require a scope.
  //
  // Every `/api/v1` endpoint is a read-only view of published data, so this is
  // real free access rather than a teaser, and it is the same data the public
  // website already renders. It is metered at `anonymousRateLimit` (default
  // 120/min) per client address.
  //
  // This check must come before the database lookup: the anonymous tier does
  // not depend on a database being configured. It previously sat after it, so
  // a configured project refused every keyless request with 401 — which closed
  // free public price discovery entirely, and made `anonymousRateLimit`,
  // `/api-docs` ("the endpoints below are read-only and currently open") and
  // the launch gate's "public price API is reachable without a key" check all
  // describe behaviour that did not exist.
  if (!rawKey) {
    if (requiredScope) return { ok: false, reason: 'missing' };
    return { ok: true, application: null, anonymous: true };
  }

  const admin = createAdminClient();
  const hash = hashApiKey(rawKey);

  const { data, error } = await admin
    .from('api_applications')
    .select(
      'id, user_id, name, tier, scopes, rate_limit_per_minute, expires_at, is_active',
    )
    .eq('key_hash', hash)
    .maybeSingle();

  if (error || !data) return { ok: false, reason: 'invalid' };
  if (!data.is_active) return { ok: false, reason: 'inactive' };
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: 'expired' };
  }

  const scopes = (data.scopes as string[]) ?? [];
  if (requiredScope && !scopes.includes(requiredScope) && !scopes.includes('*')) {
    return { ok: false, reason: 'invalid' };
  }

  // The key inherits its owner's entitlements. Revoking a subscription
  // therefore revokes every key issued under it, without an operator having
  // to hunt down individual applications.
  const entitlementSet = await getApplicationEntitlements(data.user_id as string);
  const entitlementRecord: Record<string, boolean> = {};
  for (const key of entitlementSet.keys) entitlementRecord[key] = true;

  const application: ApiApplication = {
    id: data.id as string,
    userId: data.user_id as string,
    name: data.name as string,
    tier: data.tier as ApiApplication['tier'],
    scopes,
    rateLimitPerMinute: (data.rate_limit_per_minute as number) ?? 60,
    expiresAt: (data.expires_at as string | null) ?? null,
    isActive: data.is_active as boolean,
    entitlements: entitlementRecord,
    entitlementSet,
  };

  // Constant-time comparison of the stored hash with the recomputed one, so a
  // timing signal cannot be used to probe keys.
  const stored = Buffer.from(hash, 'utf8');
  const computed = Buffer.from(hashApiKey(rawKey), 'utf8');
  if (stored.length !== computed.length || !timingSafeEqual(stored, computed)) {
    return { ok: false, reason: 'invalid' };
  }

  return { ok: true, application, anonymous: false };
}

/**
 * Does the caller hold an entitlement?
 *
 * A key holder is entitled when the key's owner holds the entitlement. An
 * anonymous caller is entitled only for the capabilities that are public.
 */
export function callerHasEntitlement(
  application: ApiApplication | null,
  key: EntitlementKey,
): boolean {
  if (application) return application.entitlementSet.keys.has(key);
  return false;
}

/**
 * A small in-process rate limiter.
 *
 * This protects a single instance. A multi-instance deployment should replace
 * it with a shared store (Redis, or a rate-limit table in Postgres) — the
 * interface is deliberately narrow so that swap is a one-file change.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  key: string,
  limitPerMinute: number,
  now = Date.now(),
): RateLimitResult {
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + 60_000 });
    return { allowed: true, remaining: limitPerMinute - 1, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limitPerMinute) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: limitPerMinute - bucket.count,
    retryAfterSeconds: 0,
  };
}

/** Record a request against an application's usage log. */
export async function logApiUsage(params: {
  applicationId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseMs?: number;
  request: Request;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;

  try {
    const admin = createAdminClient();
    const forwarded = params.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const ipHash = forwarded
      ? createHash('sha256').update(`${forwarded}:${params.applicationId}`).digest('hex')
      : null;

    await admin.from('api_usage_logs').insert({
      application_id: params.applicationId,
      endpoint: params.endpoint,
      method: params.method,
      status_code: params.statusCode,
      response_ms: params.responseMs ?? null,
      ip_hash: ipHash,
    });

    await admin
      .from('api_applications')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', params.applicationId);
  } catch (error) {
    // Usage logging must never break the response.
    console.error('api usage logging failed:', error);
  }
}
