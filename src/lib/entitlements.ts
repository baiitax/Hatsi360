import 'server-only';

import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * The entitlement layer.
 *
 * An entitlement is a *capability key*. A tier — public, professional,
 * enterprise — is a bundle of keys. The tier names live in `src/lib/brand.ts`
 * for display; the keys live here and in the `entitlement_catalog` table.
 *
 * The rules this module enforces:
 *
 *  1. Public price discovery is never gated. A caller with no entitlement can
 *     always read the public catalogue, the published prices and the public
 *     reports.
 *  2. A premium capability is checked on the server, and again by a database
 *     policy. Hiding a button is not authorization.
 *  3. Nothing grants an entitlement by itself. An entitlement exists only
 *     where an active commercial agreement exists, and no payment provider is
 *     configured — so in practice no account holds one today.
 */

export type EntitlementKey =
  | 'watchlists'
  | 'alerts'
  | 'exports'
  | 'reports'
  | 'api'
  | 'bulk';

export const ENTITLEMENT_KEYS: EntitlementKey[] = [
  'watchlists',
  'alerts',
  'exports',
  'reports',
  'api',
  'bulk',
];

/** The capabilities that are free to everyone, without an account. */
export const PUBLIC_CAPABILITIES: EntitlementKey[] = [];

export interface EntitlementSet {
  keys: Set<EntitlementKey>;
  /** The tier the caller currently sits in. */
  tier: 'public' | 'professional' | 'enterprise' | null;
  /** True when the tier is one a customer can actually be in right now. */
  tierActive: boolean;
}

export const EMPTY_ENTITLEMENTS: EntitlementSet = {
  keys: new Set<EntitlementKey>(),
  tier: null,
  tierActive: false,
};

export function hasEntitlement(set: EntitlementSet, key: EntitlementKey): boolean {
  if (PUBLIC_CAPABILITIES.includes(key)) return true;
  return set.keys.has(key);
}

/** The tier whose key bundle the caller's keys exactly match, or a superset. */
function tierFor(keys: Set<EntitlementKey>): EntitlementSet['tier'] {
  if (keys.has('api') || keys.has('bulk')) return 'enterprise';
  if (keys.has('reports') || keys.has('exports')) return 'professional';
  if (keys.size > 0) return 'professional';
  return 'public';
}

/**
 * Resolve the caller's entitlements from the database.
 *
 * The query reads only the caller's own subscriptions, through the signed-in
 * session, so a client cannot ask about somebody else's entitlements. When
 * Supabase is not configured there is no session and therefore no entitlement,
 * which is the correct answer rather than a permissive default.
 */
export async function getEntitlements(): Promise<EntitlementSet> {
  if (!isSupabaseConfigured()) return EMPTY_ENTITLEMENTS;

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('customer_subscriptions')
      .select('entitlements, status, ends_at, trial_ends_at')
      .in('status', ['active', 'trialing']);

    if (error || !data || data.length === 0) return EMPTY_ENTITLEMENTS;

    const now = Date.now();
    const keys = new Set<EntitlementKey>();

    for (const row of data) {
      const endsAt = row.ends_at ? new Date(row.ends_at).getTime() : null;
      const trialEndsAt = row.trial_ends_at ? new Date(row.trial_ends_at).getTime() : null;
      if (endsAt !== null && endsAt <= now) continue;
      if (trialEndsAt !== null && trialEndsAt <= now) continue;

      const entitlements = (row.entitlements ?? {}) as Record<string, unknown>;
      for (const key of ENTITLEMENT_KEYS) {
        if (entitlements[key] === true) keys.add(key);
      }
    }

    const tier = tierFor(keys);
    return {
      keys,
      tier,
      // Only the public tier is currently purchasable, so only it can be
      // "active" in the product sense.
      tierActive: tier === 'public',
    };
  } catch {
    // An entitlement lookup must never crash a page. Failing closed — no
    // entitlement — is the safe direction.
    return EMPTY_ENTITLEMENTS;
  }
}

/**
 * Resolve the entitlements behind an API application.
 *
 * An application inherits its owner's entitlements and never carries its own,
 * so revoking a subscription revokes every key issued under it.
 */
export async function getApplicationEntitlements(
  userId: string,
): Promise<EntitlementSet> {
  if (!isSupabaseConfigured()) return EMPTY_ENTITLEMENTS;

  try {
    const admin = createAdminClient();

    const { data, error } = await admin
      .from('customer_subscriptions')
      .select('entitlements, status, ends_at, trial_ends_at')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing']);

    if (error || !data || data.length === 0) return EMPTY_ENTITLEMENTS;

    const now = Date.now();
    const keys = new Set<EntitlementKey>();

    for (const row of data) {
      const endsAt = row.ends_at ? new Date(row.ends_at).getTime() : null;
      const trialEndsAt = row.trial_ends_at ? new Date(row.trial_ends_at).getTime() : null;
      if (endsAt !== null && endsAt <= now) continue;
      if (trialEndsAt !== null && trialEndsAt <= now) continue;

      const entitlements = (row.entitlements ?? {}) as Record<string, unknown>;
      for (const key of ENTITLEMENT_KEYS) {
        if (entitlements[key] === true) keys.add(key);
      }
    }

    const tier = tierFor(keys);
    return { keys, tier, tierActive: tier === 'public' };
  } catch {
    return EMPTY_ENTITLEMENTS;
  }
}

/**
 * The rate limit that applies to a request.
 *
 * An anonymous caller gets the public limit. A key holder gets the limit
 * recorded on the key. A caller with the `api` entitlement gets the higher
 * documented limit — which is the only way a paid tier changes anything at
 * the API today.
 */
export function rateLimitFor(
  options: {
    keyLimit?: number | null;
    anonymousLimit: number;
    hasApiEntitlement: boolean;
    tier?: EntitlementSet['tier'];
  },
): number {
  if (options.keyLimit && options.keyLimit > 0) return options.keyLimit;
  if (options.hasApiEntitlement) return 600;
  return options.anonymousLimit;
}

// ── Centralized Entitlement Helpers (Phase 08A Stage 6) ────────────────────

/**
 * Error thrown when a user lacks the required entitlement.
 */
export class EntitlementError extends Error {
  constructor(
    public readonly requiredKey: EntitlementKey,
    public readonly currentTier: EntitlementSet['tier'],
    message?: string,
  ) {
    super(
      message ||
        `This feature requires the '${requiredKey}' entitlement. Your current tier is '${currentTier || 'none'}'.`,
    );
    this.name = 'EntitlementError';
  }
}

/**
 * Require a specific entitlement, throwing if the user doesn't have it.
 *
 * Use this in server actions and API routes to enforce entitlements with
 * a clear error message. This is the "fail-loud" pattern — it tells the
 * user exactly what they need to upgrade to.
 *
 * @example
 * ```ts
 * // In a server action:
 * await requireEntitlement('alerts');
 * // If user doesn't have 'alerts', throws EntitlementError
 *
 * // Continue with alert creation...
 * ```
 */
export async function requireEntitlement(
  key: EntitlementKey,
  options?: { message?: string },
): Promise<EntitlementSet> {
  const entitlements = await getEntitlements();

  if (!hasEntitlement(entitlements, key)) {
    throw new EntitlementError(key, entitlements.tier, options?.message);
  }

  return entitlements;
}

/**
 * Check an entitlement and return a result object instead of throwing.
 *
 * Use this in page components where you want to conditionally render
 * content based on entitlement, rather than blocking the entire page.
 *
 * @example
 * ```ts
 * // In a page component:
 * const { hasIt, entitlements } = await checkEntitlement('watchlists');
 *
 * if (!hasIt) {
 *   return <UpgradePrompt feature="watchlists" />;
 * }
 *
 * return <WatchlistUI />;
 * ```
 */
export async function checkEntitlement(
  key: EntitlementKey,
): Promise<{ hasIt: boolean; entitlements: EntitlementSet }> {
  const entitlements = await getEntitlements();
  return {
    hasIt: hasEntitlement(entitlements, key),
    entitlements,
  };
}

/**
 * Execute a function only if the user has the required entitlement.
 *
 * This is a wrapper pattern that combines entitlement checking with
 * execution. If the user lacks the entitlement, the function returns
 * a fallback value instead of executing.
 *
 * @example
 * ```ts
 * // In a server action:
 * const result = await withEntitlement('exports', async () => {
 *   return await runExpensiveExport();
 * }, { fallback: { error: 'Upgrade required' } });
 * ```
 */
export async function withEntitlement<T, F = null>(
  key: EntitlementKey,
  fn: (entitlements: EntitlementSet) => Promise<T>,
  options?: { fallback?: F },
): Promise<T | F> {
  const entitlements = await getEntitlements();

  if (!hasEntitlement(entitlements, key)) {
    return (options?.fallback ?? null) as F;
  }

  return fn(entitlements);
}

/**
 * Human-readable names for entitlement keys.
 *
 * Use these in UI messages and error prompts.
 */
export const ENTITLEMENT_LABELS: Record<EntitlementKey, string> = {
  watchlists: 'Saved commodities & markets',
  alerts: 'Price alerts',
  exports: 'Report exports',
  reports: 'Premium reports',
  api: 'API access',
  bulk: 'Bulk data operations',
};

/**
 * Minimum tier required for each entitlement.
 *
 * Use this in upgrade prompts to tell users which tier they need.
 */
export const ENTITLEMENT_MIN_TIER: Record<EntitlementKey, string> = {
  watchlists: 'Professional',
  alerts: 'Professional',
  exports: 'Professional',
  reports: 'Professional',
  api: 'Enterprise',
  bulk: 'Enterprise',
};

