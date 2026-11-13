import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { authEmailsFor, authIdsMatchingEmail } from '@/lib/auth/emails';

/**
 * Hatsi360 — the commercial and platform read model.
 *
 * The tables behind these screens — organizations, subscriptions, entitlement
 * tiers, API applications and their usage — have existed in the schema since
 * the commercial migration, with RLS and grants in place, but no
 * administrative surface ever read them. This module is that surface.
 *
 * Three rules run through every query here:
 *
 *  1. **RLS decides, not the interface.** Every query runs as the signed-in
 *     administrator. The navigation hides a module from a role that may not
 *     open it; the database is what actually refuses.
 *
 *  2. **A secret is never re-read.** `api_applications.key_hash` holds a
 *     SHA-256 digest. The plaintext key is shown once, at creation, and is not
 *     stored anywhere. This module therefore exposes `keyPrefix` and never a
 *     key.
 *
 *  3. **Nothing here implies a payment provider.** `entitlement_tiers` carries
 *     an `is_available` flag that is false for the paid tiers precisely
 *     because no provider or commercial terms exist. The interface reports
 *     that state rather than hiding it, and no screen invents a billing
 *     record or a subscription that does not exist.
 */

export interface Page<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface ListFilters {
  page?: number;
  pageSize?: number;
  q?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
}

const DEFAULT_PAGE_SIZE = 25;

function paginate<T>(rows: T[], total: number, filters: ListFilters): Page<T> {
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const page = Math.max(1, filters.page ?? 1);
  return {
    rows,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

const emptyPage = <T>(filters: ListFilters): Page<T> => paginate<T>([], 0, filters);

function emptyRows<T>(): { data: T[] } {
  return { data: [] };
}

/* --------------------------------------------------------------- customers -- */

export interface CustomerRow {
  id: string;
  name: string;
  email: string | null;
  role: string;
  accountStatus: string;
  organizationName: string | null;
  plan: string | null;
  subscriptionStatus: string | null;
  endsAt: string | null;
  joinedOn: string | null;
}

/**
 * The customer directory.
 *
 * A "customer" is any non-staff account. The subscription, when one exists, is
 * joined alongside so the directory answers "who is paying for what" in one
 * screen rather than sending the administrator to a second page.
 */
export async function listCustomers(filters: ListFilters = {}): Promise<Page<CustomerRow>> {
  if (!isSupabaseConfigured()) return emptyPage(filters);
  const supabase = await createClient();
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const page = Math.max(1, filters.page ?? 1);

  // Staff roles are the platform's own operators; they are not customers. They
  // are listed in the agent and user directories instead.
  const staffRoles = ['admin', 'super_admin', 'market_supervisor', 'verification_officer', 'analyst'];

  let query = supabase
    .from('profiles')
    .select('id, full_name, role, account_status, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  for (const role of staffRoles) {
    query = query.neq('role', role);
  }

  if (filters.q) {
    const term = filters.q.replace(/[%,()]/g, ' ').trim();
    if (term) {
      // The address is not a column of `profiles`, so it cannot be part of the
      // SQL filter. Resolve it to ids through the auth admin API first, then
      // keep the same "name OR address" meaning the screen promises.
      const byEmail = await authIdsMatchingEmail(term);
      query = byEmail.length
        ? query.or(`full_name.ilike.%${term}%,id.in.(${byEmail.join(',')})`)
        : query.ilike('full_name', `%${term}%`);
    }
  }

  const { data, count } = await query;
  const rows = data ?? [];
  const ids = rows.map((row) => row.id as string);
  const emails = await authEmailsFor(ids);

  const [subscriptionsResult, membersResult] = await Promise.all([
    ids.length
      ? supabase
          .from('customer_subscriptions')
          .select('user_id, plan, status, ends_at, organization_id')
          .in('user_id', ids)
      : Promise.resolve(
          emptyRows<{
            user_id: string;
            plan: string;
            status: string;
            ends_at: string | null;
            organization_id: string | null;
          }>(),
        ),
    ids.length
      ? supabase
          .from('organization_members')
          .select('user_id, organization_id')
          .in('user_id', ids)
      : Promise.resolve(emptyRows<{ user_id: string; organization_id: string }>()),
  ]);

  const orgIds = [
    ...new Set(
      [
        ...(subscriptionsResult.data ?? []).map((s) => s.organization_id as string | null),
        ...(membersResult.data ?? []).map((m) => m.organization_id as string | null),
      ].filter((id): id is string => Boolean(id)),
    ),
  ];

  const orgResult = orgIds.length
    ? await supabase.from('organizations').select('id, name').in('id', orgIds)
    : { data: [] as { id: string; name: string }[] };

  const orgNames = new Map((orgResult.data ?? []).map((o) => [o.id as string, o.name as string]));

  // One subscription per customer is the current model; the first row wins if
  // a historical one exists.
  const subscriptionByUser = new Map<string, { plan: string; status: string; ends_at: string | null }>();
  for (const sub of subscriptionsResult.data ?? []) {
    const key = sub.user_id as string;
    if (!subscriptionByUser.has(key)) {
      subscriptionByUser.set(key, {
        plan: sub.plan as string,
        status: sub.status as string,
        ends_at: sub.ends_at as string | null,
      });
    }
  }

  const orgByUser = new Map<string, string>();
  for (const member of membersResult.data ?? []) {
    orgByUser.set(member.user_id as string, member.organization_id as string);
  }

  const customerRows: CustomerRow[] = rows.map((row) => {
    const id = row.id as string;
    const subscription = subscriptionByUser.get(id);
    const orgId = orgByUser.get(id);
    const subscriptionOrgId = (subscriptionsResult.data ?? []).find(
      (s) => s.user_id === id,
    )?.organization_id as string | null | undefined;

    return {
      id,
      name: (row.full_name as string | null) ?? emails.get(id) ?? 'Unnamed account',
      email: emails.get(id) ?? null,
      role: row.role as string,
      accountStatus: (row.account_status as string | null) ?? 'unknown',
      organizationName: orgNames.get(orgId ?? subscriptionOrgId ?? '') ?? null,
      plan: subscription?.plan ?? null,
      subscriptionStatus: subscription?.status ?? null,
      endsAt: subscription?.ends_at ?? null,
      joinedOn: (row.created_at as string | null) ?? null,
    };
  });

  return paginate(customerRows, count ?? 0, filters);
}

/* ----------------------------------------------------------- subscriptions -- */

export interface SubscriptionRow {
  id: number;
  customerName: string;
  plan: string;
  status: string;
  startsAt: string;
  endsAt: string | null;
  renewsAt: string | null;
  trialEndsAt: string | null;
  organizationName: string | null;
  entitlementCount: number;
}

/**
 * Every subscription on the platform, newest first.
 *
 * The `entitlements` column is a JSONB object whose shape is whatever the
 * commercial layer wrote. It is counted rather than rendered, because
 * displaying a raw object would be noise; the entitlement catalogue is the
 * place that explains what each key means.
 */
export async function listSubscriptions(filters: ListFilters = {}): Promise<Page<SubscriptionRow>> {
  if (!isSupabaseConfigured()) return emptyPage(filters);
  const supabase = await createClient();
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const page = Math.max(1, filters.page ?? 1);

  let query = supabase
    .from('customer_subscriptions')
    .select('id, user_id, plan, status, starts_at, ends_at, renews_at, trial_ends_at, organization_id, entitlements', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (filters.q) {
    const term = filters.q.replace(/[%,()]/g, ' ').trim();
    if (term) query = query.ilike('plan', `%${term}%`);
  }

  const { data, count } = await query;
  const rows = data ?? [];
  const userIds = [...new Set(rows.map((row) => row.user_id as string))];
  const orgIds = [
    ...new Set(rows.map((row) => row.organization_id as string | null).filter(Boolean) as string[]),
  ];

  const [profilesResult, orgsResult] = await Promise.all([
    userIds.length
      ? supabase.from('profiles').select('id, full_name').in('id', userIds)
      : Promise.resolve(emptyRows<{ id: string; full_name: string | null }>()),
    orgIds.length
      ? supabase.from('organizations').select('id, name').in('id', orgIds)
      : Promise.resolve(emptyRows<{ id: string; name: string }>()),
  ]);

  // The address comes from the auth schema, not from `profiles`.
  const emails = await authEmailsFor(userIds);
  const nameByUser = new Map(
    (profilesResult.data ?? []).map((p) => [
      p.id as string,
      (p.full_name as string | null) ?? emails.get(p.id as string) ?? 'Unknown account',
    ]),
  );
  const orgNames = new Map((orgsResult.data ?? []).map((o) => [o.id as string, o.name as string]));

  const subscriptionRows: SubscriptionRow[] = rows.map((row) => {
    const entitlements = row.entitlements as Record<string, unknown> | null;
    return {
      id: row.id as number,
      customerName: nameByUser.get(row.user_id as string) ?? 'Unknown account',
      plan: row.plan as string,
      status: row.status as string,
      startsAt: row.starts_at as string,
      endsAt: (row.ends_at as string | null) ?? null,
      renewsAt: (row.renews_at as string | null) ?? null,
      trialEndsAt: (row.trial_ends_at as string | null) ?? null,
      organizationName: orgNames.get(row.organization_id as string) ?? null,
      entitlementCount: entitlements ? Object.keys(entitlements).length : 0,
    };
  });

  return paginate(subscriptionRows, count ?? 0, filters);
}

/* --------------------------------------------------------------- entitlements */

export interface EntitlementTierRow {
  id: string;
  name: string;
  summary: string | null;
  entitlements: string[];
  isAvailable: boolean;
  sortOrder: number;
}

/**
 * The entitlement catalogue.
 *
 * `is_available` is surfaced verbatim. A tier marked unavailable is shown as
 * unavailable — it is a proposed tier, not a product, and the interface must
 * not imply otherwise.
 */
export async function listEntitlementTiers(): Promise<EntitlementTierRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();

  const { data } = await supabase
    .from('entitlement_tiers')
    .select('id, name, summary, entitlements, is_available, sort_order')
    .order('sort_order', { ascending: true });

  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    summary: (row.summary as string | null) ?? null,
    entitlements: (row.entitlements as string[] | null) ?? [],
    isAvailable: (row.is_available as boolean | null) ?? false,
    sortOrder: (row.sort_order as number | null) ?? 100,
  }));
}

/* ------------------------------------------------------------ api consumers -- */

export interface ApiApplicationRow {
  id: string;
  name: string;
  description: string | null;
  ownerName: string;
  organizationName: string | null;
  keyPrefix: string;
  scopes: string[];
  tier: string;
  rateLimitPerMinute: number;
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

/**
 * Registered API consumers.
 *
 * The key is never returned. `keyPrefix` identifies which key is in use
 * without revealing it, which is what an administrator needs to tell one
 * consumer's key from another's.
 */
export async function listApiApplications(
  filters: ListFilters = {},
): Promise<Page<ApiApplicationRow>> {
  if (!isSupabaseConfigured()) return emptyPage(filters);
  const supabase = await createClient();
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const page = Math.max(1, filters.page ?? 1);

  let query = supabase
    .from('api_applications')
    .select(
      'id, name, description, user_id, organization_id, key_prefix, scopes, tier, rate_limit_per_minute, is_active, expires_at, last_used_at, created_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (filters.q) {
    const term = filters.q.replace(/[%,()]/g, ' ').trim();
    if (term) query = query.ilike('name', `%${term}%`);
  }

  const { data, count } = await query;
  const rows = data ?? [];
  const userIds = [...new Set(rows.map((row) => row.user_id as string))];
  const orgIds = [
    ...new Set(rows.map((row) => row.organization_id as string | null).filter(Boolean) as string[]),
  ];

  const [profilesResult, orgsResult] = await Promise.all([
    userIds.length
      ? supabase.from('profiles').select('id, full_name').in('id', userIds)
      : Promise.resolve(emptyRows<{ id: string; full_name: string | null }>()),
    orgIds.length
      ? supabase.from('organizations').select('id, name').in('id', orgIds)
      : Promise.resolve(emptyRows<{ id: string; name: string }>()),
  ]);

  // The address comes from the auth schema, not from `profiles`.
  const emails = await authEmailsFor(userIds);
  const nameByUser = new Map(
    (profilesResult.data ?? []).map((p) => [
      p.id as string,
      (p.full_name as string | null) ?? emails.get(p.id as string) ?? 'Unknown owner',
    ]),
  );
  const orgNames = new Map((orgsResult.data ?? []).map((o) => [o.id as string, o.name as string]));

  const applicationRows: ApiApplicationRow[] = rows.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    ownerName: nameByUser.get(row.user_id as string) ?? 'Unknown owner',
    organizationName: orgNames.get(row.organization_id as string) ?? null,
    keyPrefix: row.key_prefix as string,
    scopes: (row.scopes as string[] | null) ?? [],
    tier: row.tier as string,
    rateLimitPerMinute: (row.rate_limit_per_minute as number | null) ?? 0,
    isActive: (row.is_active as boolean | null) ?? false,
    expiresAt: (row.expires_at as string | null) ?? null,
    lastUsedAt: (row.last_used_at as string | null) ?? null,
    createdAt: row.created_at as string,
  }));

  return paginate(applicationRows, count ?? 0, filters);
}

/* --------------------------------------------------------------- api usage -- */

export interface ApiUsageSummary {
  /** Requests recorded in the window, by status class. */
  total: number;
  errors: number;
  /** Distinct consumers seen in the window. */
  activeApplications: number;
  /** Requests per consumer, busiest first. */
  byApplication: { id: string; name: string; requests: number; errors: number }[];
  windowDays: number;
}

/**
 * API usage over a recent window.
 *
 * Only what `api_usage_logs` actually records is reported. There is no
 * invented traffic figure and no projected quota consumption.
 */
export async function getApiUsageSummary(windowDays = 7): Promise<ApiUsageSummary> {
  const empty: ApiUsageSummary = {
    total: 0,
    errors: 0,
    activeApplications: 0,
    byApplication: [],
    windowDays,
  };
  if (!isSupabaseConfigured()) return empty;

  const supabase = await createClient();
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from('api_usage_logs')
    .select('application_id, status_code, requested_at')
    .gte('requested_at', since)
    .limit(20000);

  const rows = data ?? [];
  if (rows.length === 0) return empty;

  const applicationsResult = await supabase
    .from('api_applications')
    .select('id, name')
    .limit(1000);
  const nameById = new Map(
    (applicationsResult.data ?? []).map((a) => [a.id as string, a.name as string]),
  );

  const perApplication = new Map<string, { requests: number; errors: number }>();
  let errors = 0;

  for (const row of rows) {
    const id = (row.application_id as string | null) ?? 'unknown';
    const status = (row.status_code as number | null) ?? 0;
    const isError = status >= 400;
    if (isError) errors += 1;
    const entry = perApplication.get(id) ?? { requests: 0, errors: 0 };
    entry.requests += 1;
    if (isError) entry.errors += 1;
    perApplication.set(id, entry);
  }

  const byApplication = [...perApplication.entries()]
    .map(([id, stats]) => ({
      id,
      name: nameById.get(id) ?? 'Unknown consumer',
      requests: stats.requests,
      errors: stats.errors,
    }))
    .sort((a, b) => b.requests - a.requests);

  return {
    total: rows.length,
    errors,
    activeApplications: perApplication.size,
    byApplication,
    windowDays,
  };
}
