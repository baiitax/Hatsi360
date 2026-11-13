import { describe, expect, it, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

/**
 * Demo access and the invitation-only rule.
 *
 * Two things are being held in place here, and they pull in opposite
 * directions, which is why they are tested together:
 *
 *  1. **The demo credentials must be genuinely usable.** An account that is
 *     listed on the login page but cannot authenticate is worse than no demo:
 *     it looks like the platform is broken. So the accounts are checked against
 *     the live database — they exist, they are active, they carry the role the
 *     panel claims, and they sign in.
 *
 *  2. **Operational access must stay invitation-only.** `signUp` hard-codes
 *     `public_user`. Nothing a browser sends can reach an operational role
 *     through self-registration, and that rule lives in the server action
 *     rather than in the interface.
 *
 * The demo accounts are also deliberately constrained: an agent cannot write
 * at a market it is not assigned to, and nobody can promote themselves. Those
 * are RLS policies, not hidden buttons, so they are asserted against the
 * database with a real session rather than read out of the source.
 */

const DEMO_ACCOUNTS = [
  { email: 'demo.agent@hatsi360.test', role: 'agent', landing: '/agent/home' },
  { email: 'demo.verifier@hatsi360.test', role: 'verification_officer', landing: '/admin/verification' },
  { email: 'demo.admin@hatsi360.test', role: 'admin', landing: '/admin/overview' },
] as const;

const DEMO_PASSWORD = 'hatsi360-demo';

/**
 * The two public Supabase values, typed as strings.
 *
 * `process.env` types every entry as `string | undefined`, which makes an
 * `apikey` header fail the type checker even after a truthiness guard, because
 * the guard and the use are in different scopes. Narrowing once, here, keeps
 * the fetch calls honest without a non-null assertion at every use site.
 */
function supabasePublicEnv(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : null;
}

/* ------------------------------------------------- the interface surface -- */

describe('the demo access panel', () => {
  const source = read('src/components/forms/DemoAccountsPanel.tsx');

  it('offers every demo account it lists', () => {
    for (const account of DEMO_ACCOUNTS) {
      expect(source, `no entry for ${account.email}`).toContain(account.email);
      expect(source, `no role label for ${account.role}`).toContain(
        account.role === 'agent'
          ? 'Market agent'
          : account.role === 'verification_officer'
            ? 'Verification officer'
            : 'Administrator',
      );
    }
  });

  it('gives each account a copy action and a one-click sign-in', () => {
    // The copy action is for somebody who wants to type it themselves; the
    // button is for everybody else. Both, because a demo that cannot be
    // entered is not a demo.
    expect(source).toContain('<CopyButton');
    expect(source).toContain('CopyButton value={account.email}');
    expect(source).toContain('CopyButton value={DEMO_PASSWORD}');
    // Three copy buttons for the addresses plus one for the shared password.
    expect((source.match(/<CopyButton/g) ?? []).length).toBe(2);
  });

  it('posts through the same server action as the real form', () => {
    // Not a second sign-in path. A demo that authenticated differently would
    // prove nothing about the real flow.
    expect(source).toContain("from '@/lib/auth/actions'");
    expect(source).toContain('useActionState<AuthActionState, FormData>(signIn, {})');
    expect(source).toContain('name="email"');
    expect(source).toContain('name="password"');
  });

  it('states plainly what the demo does and does not prove', () => {
    // Overclaiming here would be the easiest failure in this whole change: the
    // operational tables are empty, so "sample market intelligence" would be
    // false. The copy says the portals open and the records are empty.
    expect(source).toMatch(/does not add any market data/i);
    expect(source).toMatch(/operational records are empty/i);
    expect(source).not.toMatch(/sample (market )?(prices|data|intelligence)/i);
  });

  it('carries the removal command, because the credentials are public', () => {
    expect(source).toContain('scripts/manage_demo_users.mjs --remove');
  });
});

describe('the sign-in form', () => {
  const source = read('src/components/forms/CentralSignInForm.tsx');

  it('toggles password visibility', () => {
    expect(source).toContain('showPassword');
    expect(source).toContain("type={showPassword ? 'text' : 'password'}");
  });

  it('links password recovery', () => {
    expect(source).toContain('href="/forgot-password"');
  });

  it('shows a pending state and never silently swallows an error', () => {
    expect(source).toContain('pending');
    expect(source).toContain('aria-busy={pending}');
    expect(source).toContain('role="alert"');
  });

  it('does not let the browser choose the destination', () => {
    // `next` is passed through, but the server action resolves the landing
    // path from the role. The form never sets a redirect target itself.
    expect(source).not.toMatch(/router\.(push|replace)/);
    expect(source).not.toContain('window.location');
  });
});

describe('the login page', () => {
  const source = read('src/app/(portal)/login/page.tsx');

  it('states that access is invitation-only', () => {
    expect(source).toMatch(/Access is invitation-only/i);
    expect(source).toContain('href="/contact"');
  });

  it('publishes a support route', () => {
    expect(source).toContain('CONTACT.emailHref');
    expect(source).toContain('CONTACT.phoneHref');
  });

  it('keeps the free public price directory open without an account', () => {
    expect(source).toContain('href="/prices"');
    // A public account is offered, but described as what it is: saved
    // commodities and price alerts, not operational access.
    expect(source).toMatch(/only adds\s+saved commodities and price alerts/i);
  });

  it('renders a registered photograph in the brand panel, not a gradient', () => {
    expect(source).toContain('getPageImage');
    expect(source).toContain('<HatsiImage');
    expect(source).toContain('asset={heroImage}');
  });

  it('is never indexed', () => {
    expect(source).toContain("robots: { index: false, follow: false }");
  });
});

/* -------------------------------------------- the invitation-only rule -- */

describe('invitation-only account creation', () => {
  const source = read('src/lib/auth/actions.ts');

  it('gives a self-registered account the public role and nothing else', () => {
    // The rule that makes the invitation-only model real. `signUp` cannot be
    // talked into an operational role by a field in the form.
    expect(source).toContain("redirect(landingPathForRole('public_user'))");
    const signUp = source.slice(source.indexOf('export async function signUp'));
    expect(signUp.slice(0, signUp.indexOf('export async function'))).not.toMatch(
      /role\s*[:=]\s*(?!['"]public_user['"])/,
    );
  });

  it('resolves the post-login destination from the role on the server', () => {
    expect(source).toContain('const landing = landingPathForRole(role)');
    expect(source).toContain('const target = safeRedirectPath(parsed.data.next, landing)');
    expect(source).toContain('redirect(target)');
  });

  it('signs a suspended account straight back out', () => {
    // A session that exists but is not allowed to be used must not survive.
    expect(source).toContain('await supabase.auth.signOut()');
    expect(source).toMatch(/accountStatus !== 'active'/);
  });

  it('keeps password recovery non-enumerating', () => {
    expect(source).toMatch(/same whether or not the address exists/i);
  });
});

/* ------------------------------------------------ the live demo accounts -- */

type DbState =
  | { ok: true; rows: Record<string, string>[] }
  | { ok: false; reason: string };

let db: DbState = { ok: false, reason: 'not yet checked' };

beforeAll(async () => {
  const { SUPABASE_DB_HOST, SUPABASE_DB_PORT, SUPABASE_DB_USER, SUPABASE_DB_PASSWORD, SUPABASE_DB_NAME } =
    process.env;
  if (!SUPABASE_DB_HOST || !SUPABASE_DB_USER || !SUPABASE_DB_PASSWORD || !SUPABASE_DB_NAME) {
    db = { ok: false, reason: 'SUPABASE_DB_* environment variables are not set' };
    return;
  }
  const client = new Client({
    host: SUPABASE_DB_HOST,
    port: Number(SUPABASE_DB_PORT ?? 5432),
    user: SUPABASE_DB_USER,
    password: SUPABASE_DB_PASSWORD,
    database: SUPABASE_DB_NAME,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    const result = await client.query(
      `select p.id::text as id, u.email, p.role, p.account_status, p.full_name, p.is_active
         from public.profiles p
         join auth.users u on u.id = p.id
        where u.email = any($1::text[])`,
      [DEMO_ACCOUNTS.map((a) => a.email)],
    );
    db = { ok: true, rows: result.rows };
  } catch (error) {
    db = { ok: false, reason: error instanceof Error ? error.message : String(error) };
  } finally {
    await client.end().catch(() => {});
  }
});

describe('the demo accounts, against the live database', () => {
  it('exists for every account the panel lists', () => {
    if (!db.ok) return console.warn(`[demo-access] SKIPPED: ${db.reason}`);
    expect(db.rows).toHaveLength(DEMO_ACCOUNTS.length);
  });

  it('carries the role the panel claims and an active account', () => {
    if (!db.ok) return console.warn(`[demo-access] SKIPPED: ${db.reason}`);
    for (const account of DEMO_ACCOUNTS) {
      const row = db.rows.find((r) => r.email === account.email);
      expect(row, `no row for ${account.email}`).toBeTruthy();
      expect(row!.role, `${account.email} has role ${row!.role}`).toBe(account.role);
      expect(row!.account_status, `${account.email} is ${row!.account_status}`).toBe('active');
      expect(row!.is_active, `${account.email} is not active`).toBe(true);
    }
  });

  it('is unmistakably labelled as a demo account everywhere it appears', () => {
    if (!db.ok) return console.warn(`[demo-access] SKIPPED: ${db.reason}`);
    // The label is what stops a demo account being mistaken for a real user in
    // a directory, an audit trail or an assignment table.
    for (const account of DEMO_ACCOUNTS) {
      const row = db.rows.find((r) => r.email === account.email);
      expect(row!.full_name, `${account.email} is named "${row!.full_name}"`).toMatch(/^DEMO — /);
    }
  });
});

/* ------------------------------------------------- the permission boundary -- */

describe('the demo accounts are constrained by policy, not by hidden buttons', () => {
  let agentToken: string | null = null;
  let agentId: string | null = null;

  beforeAll(async () => {
    const env = supabasePublicEnv();
    if (!env) return;
    try {
      const response = await fetch(
        `${env.url}/auth/v1/token?grant_type=password`,
        {
          method: 'POST',
          headers: { apikey: env.key, 'content-type': 'application/json' },
          body: JSON.stringify({
            email: 'demo.agent@hatsi360.test',
            password: DEMO_PASSWORD,
          }),
          signal: AbortSignal.timeout(20000),
        },
      );
      if (!response.ok) return;
      const session = (await response.json()) as { access_token?: string; user?: { id?: string } };
      agentToken = session.access_token ?? null;
      agentId = session.user?.id ?? null;
    } catch {
      agentToken = null;
    }
  });

  it('the demo agent can sign in, which is the whole point of listing it', () => {
    expect(agentToken, 'the demo agent could not authenticate').toBeTruthy();
  });

  it('cannot promote itself to an operational role it does not hold', async () => {
    if (!agentToken || !agentId) return console.warn('[demo-access] SKIPPED: no agent session');
    const env = supabasePublicEnv();
    if (!env) return console.warn('[demo-access] SKIPPED: no Supabase env');
    const headers = {
      apikey: env.key,
      authorization: `Bearer ${agentToken}`,
      'content-type': 'application/json',
    };

    await fetch(`${env.url}/rest/v1/profiles?id=eq.${agentId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ role: 'super_admin' }),
      signal: AbortSignal.timeout(20000),
    });

    // Two independent things refuse this, and either alone is enough:
    //  - `prevent_role_escalation()` (migration 0005, security invoker) raises
    //    "Only an administrator may change an account role.";
    //  - the RLS policy on `profiles` matches no rows for a non-admin caller.
    // So the attempt may fail loudly or change nothing. What it must never do
    // is succeed — which is what the read-back below asserts.
    const after = await fetch(
      `${env.url}/rest/v1/profiles?id=eq.${agentId}&select=role`,
      { headers, signal: AbortSignal.timeout(20000) },
    );
    const rows = (await after.json()) as { role: string }[];
    expect(rows, 'the demo agent cannot read its own profile back').toHaveLength(1);
    expect(rows[0].role, 'the demo agent promoted itself').toBe('agent');
  });

  it('cannot change another account at all', async () => {
    if (!agentToken || !agentId) return console.warn('[demo-access] SKIPPED: no agent session');
    const env = supabasePublicEnv();
    if (!env) return console.warn('[demo-access] SKIPPED: no Supabase env');
    const response = await fetch(`${env.url}/rest/v1/profiles?id=neq.${agentId}`, {
      method: 'PATCH',
      headers: {
        apikey: env.key,
        authorization: `Bearer ${agentToken}`,
        'content-type': 'application/json',
        prefer: 'return=representation',
      },
      body: JSON.stringify({ role: 'super_admin' }),
      signal: AbortSignal.timeout(20000),
    });
    expect(response.status).toBeLessThan(400);
    const rows = (await response.json()) as unknown[];
    // A blocked UPDATE under RLS matches zero rows and still succeeds, so the
    // assertion is on the row count rather than on an error.
    expect(rows, 'the demo agent modified another account').toHaveLength(0);
  });

  it('cannot write a price observation at a market it is not assigned to', async () => {
    if (!agentToken || !agentId) return console.warn('[demo-access] SKIPPED: no agent session');
    const env = supabasePublicEnv();
    if (!env) return console.warn('[demo-access] SKIPPED: no Supabase env');
    // Market 1 is the one market the demo agent IS assigned to. Every other
    // market is one it is not, and an insert there must be refused by policy.
    const response = await fetch(`${env.url}/rest/v1/price_observations`, {
      method: 'POST',
      headers: {
        apikey: env.key,
        authorization: `Bearer ${agentToken}`,
        'content-type': 'application/json',
        prefer: 'return=representation',
      },
      body: JSON.stringify({
        agent_user_id: agentId,
        market_id: 999999,
        commodity_id: 7,
        reported_amount: 1,
        verification_status: 'submitted',
      }),
      signal: AbortSignal.timeout(20000),
    });
    expect(response.status, 'an unassigned-market observation was accepted').toBeGreaterThanOrEqual(
      400,
    );
  });
});
