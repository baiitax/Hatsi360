import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Hatsi360 — reading an email address.
 *
 * `profiles` has no `email` column. That is deliberate: the address belongs to
 * `auth.users`, and a copy in `profiles` would drift the moment somebody
 * changed it in the auth schema. Several screens nevertheless need to show or
 * search by the address, and they used to select `profiles.email` — a column
 * that does not exist. Those queries failed, the failure was swallowed by
 * `data ?? []`, and the screens reported an empty list or a missing record.
 *
 * The auth admin API is the only way to read an address, and it needs the
 * service-role key. That is why this module is `server-only`: a client
 * component must never be able to reach it.
 *
 * Two rules this module keeps:
 *
 *  1. **An address that cannot be read is absent, not invented.** A missing id
 *     simply has no entry. No screen falls back to a placeholder that looks
 *     like an address.
 *  2. **A failure to read returns an empty map rather than throwing**, so one
 *     unreadable address cannot take down an administrative screen. Callers
 *     render "—" for an absent address, which is the honest state.
 */

const PER_PAGE = 200;

/**
 * The auth admin client, or null when the service-role key is not configured.
 *
 * A screen that cannot read an address shows "—". It must not crash, so a
 * missing key degrades to "no addresses" rather than throwing.
 */
function adminClientOrNull() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

/**
 * Email addresses for the given user ids.
 *
 * Pages the admin API until every requested id has been seen or the API runs
 * out of users. Returns a map; ids with no readable address are absent.
 */
export async function authEmailsFor(ids: readonly string[]): Promise<Map<string, string>> {
  const wanted = new Set(ids);
  if (wanted.size === 0) return new Map();

  const admin = adminClientOrNull();
  if (!admin) return new Map();
  const found = new Map<string, string>();

  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error || !data) break;
    for (const user of data.users) {
      if (user.email) found.set(user.id, user.email);
    }
    if (found.size >= wanted.size) break;
    if (data.users.length < PER_PAGE) break;
  }

  // Keep only what was asked for.
  const result = new Map<string, string>();
  for (const id of wanted) {
    const email = found.get(id);
    if (email) result.set(id, email);
  }
  return result;
}

/**
 * Every email address on the instance, as id -> address.
 *
 * Only for administrative screens that must search by address: the address
 * cannot be part of a SQL filter because it is not a column, so the search
 * resolves to a set of ids first. Bounded by the user count, which for an
 * operator-provisioned platform is small.
 */
export async function allAuthEmails(): Promise<Map<string, string>> {
  const admin = adminClientOrNull();
  if (!admin) return new Map();
  const found = new Map<string, string>();

  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error || !data) break;
    for (const user of data.users) {
      if (user.email) found.set(user.id, user.email);
    }
    if (data.users.length < PER_PAGE) break;
  }

  return found;
}

/** The ids whose email address contains the term, case-insensitively. */
export async function authIdsMatchingEmail(term: string): Promise<string[]> {
  const needle = term.trim().toLowerCase();
  if (!needle) return [];
  const emails = await allAuthEmails();
  const ids: string[] = [];
  for (const [id, email] of emails) {
    if (email.toLowerCase().includes(needle)) ids.push(id);
  }
  return ids;
}
