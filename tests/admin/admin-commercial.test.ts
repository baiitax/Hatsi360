import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

/**
 * The commercial and agent-detail surfaces.
 *
 * The brief asks for customer, subscription and API management, and for an
 * agent profile screen. All three had tables and functions in the schema but
 * no administrative interface. These tests hold the new screens to the rules
 * that make them honest:
 *
 *  - a secret is never displayed or re-read;
 *  - a proposed tier is shown as proposed, not as purchasable;
 *  - no performance score is invented;
 *  - an empty state is the truth, not a gap to fill.
 */

const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

/* ---------------------------------------------------------- the data layer -- */

describe('the commercial read model', () => {
  const source = read('src/lib/operations/commercial.ts');

  it('is a server-only module', () => {
    expect(source).toContain("import 'server-only'");
  });

  it('returns an empty page when no database is configured, rather than inventing rows', () => {
    expect(source).toContain('if (!isSupabaseConfigured()) return emptyPage(filters);');
    expect(source).toContain('if (!isSupabaseConfigured()) return [];');
  });

  it('never selects the API key hash, so a secret cannot reach the interface', () => {
    // key_hash is the digest. It is not in any select list.
    const selects = source.match(/\.select\([^)]*\)/g) ?? [];
    for (const clause of selects) {
      expect(clause, 'a select must not include key_hash').not.toContain('key_hash');
    }
    expect(source).toContain('keyPrefix: row.key_prefix as string');
  });

  it('reports the entitlement availability flag verbatim', () => {
    expect(source).toContain('isAvailable: (row.is_available as boolean | null) ?? false');
  });

  it('counts entitlements rather than dumping the raw JSON object', () => {
    expect(source).toContain('Object.keys(entitlements).length');
  });

  it('caps the usage window so a busy consumer cannot make the screen slow', () => {
    expect(source).toContain('.limit(20000)');
  });

  it('excludes staff roles from the customer directory', () => {
    expect(source).toContain("const staffRoles =");
    expect(source).toContain(".neq('role', role)");
  });

  it('reads the usage timestamp column that actually exists', () => {
    // api_usage_logs records `requested_at`, not `created_at`.
    expect(source).toContain("'application_id, status_code, requested_at'");
    expect(source).toContain(".gte('requested_at', since)");
    expect(source).not.toContain(".gte('created_at', since)");
  });
});

/* ------------------------------------------------------------- the screens -- */

describe('the customers screen', () => {
  const page = read('src/app/admin/customers/page.tsx');

  it('guards the route on the server', () => {
    expect(page).toContain("await requireStaff('/admin/customers')");
  });

  it('shows a free account as free, not as missing data', () => {
    expect(page).toContain('No subscription');
    expect(page).toContain("free");
  });

  it('states how many tiers are actually available', () => {
    expect(page).toContain('availableTiers');
    expect(page).toContain('isAvailable');
  });
});

describe('the subscriptions screen', () => {
  const page = read('src/app/admin/subscriptions/page.tsx');

  it('guards the route on the server', () => {
    expect(page).toContain("await requireStaff('/admin/subscriptions')");
  });

  it('labels a paid tier as proposed rather than purchasable', () => {
    expect(page).toContain('proposed');
    expect(page).toContain('cannot be purchased');
    expect(page).toContain('no payment provider');
  });

  it('never claims a payment integration exists', () => {
    const lower = page.toLowerCase();
    for (const forbidden of ['stripe', 'paystack', 'flutterwave', 'checkout', 'invoice paid']) {
      expect(lower, `must not mention ${forbidden}`).not.toContain(forbidden);
    }
  });
});

describe('the API management screen', () => {
  const page = read('src/app/admin/api-management/page.tsx');

  it('guards the route on the server', () => {
    expect(page).toContain("await requireStaff('/admin/api-management')");
  });

  it('shows only the key prefix and explains why', () => {
    expect(page).toContain('keyPrefix');
    expect(page).toContain('never stored');
    expect(page).toContain('not recoverable');
  });

  it('offers no way to reveal a secret', () => {
    // The word "reveal" appears in the prose that explains why there is
    // nothing to reveal, so the assertion is on an actual control rather than
    // on the word.
    const buttons = page.match(/<button[^>]*>([\s\S]*?)<\/button>/g) ?? [];
    for (const button of buttons) {
      const label = button.toLowerCase();
      for (const forbidden of ['reveal', 'show key', 'copy key', 'view secret', 'regenerate']) {
        expect(label, `no control may offer to ${forbidden}`).not.toContain(forbidden);
      }
    }
  });

  it('states the window its usage figures cover', () => {
    expect(page).toContain('usage.windowDays');
    expect(page).toContain('api_usage_logs');
  });
});

/* ------------------------------------------------------ the agent record -- */

describe('the agent detail screen', () => {
  const page = read('src/app/admin/agents/[id]/page.tsx');
  const source = read('src/lib/operations/admin.ts');

  it('guards the route on the server and 404s an unknown agent', () => {
    expect(page).toContain("await requireStaff('/admin/agents')");
    expect(page).toContain('notFound()');
  });

  it('computes no composite performance score', () => {
    // The screen deliberately shows counts. A single number would reward
    // volume over accuracy. The phrase appears in the comment explaining this,
    // so the assertion is on the rendered markup.
    const rendered = page
      .slice(page.indexOf('return ('))
      // JSX comments explain the reasoning; they are not what the agent sees.
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
    const lower = rendered.toLowerCase();
    for (const forbidden of ['score', 'rating', 'rank', 'grade:', 'out of 100']) {
      expect(lower, `must not render a ${forbidden}`).not.toContain(forbidden);
    }
    expect(page).toContain('approvalRate === null');
  });

  it('states the denominator whenever it shows a rate', () => {
    expect(page).toContain('const decided = agent.verified + agent.rejected + agent.published;');
    expect(page).toContain('${decided} decided price');
    expect(page).toContain('approvalRate === null');
    // The rate is only shown when there is something to divide by.
    expect(page).toContain('decided > 0 ? Math.round((agent.verified / decided) * 100) : null');
  });

  it('shows an empty session as zero prices, not as hidden', () => {
    expect(source).toContain('observationsByBatch');
    expect(source).toContain('observationsByBatch.get(row.id as number) ?? 0');
  });

  it('resolves the unit the price was reported in', () => {
    expect(source).toContain('reported_unit_id');
    expect(source).toContain('unitNames.get(row.reported_unit_id as number)');
  });

  it('reads the agent record with the signed-in administrator, so RLS still applies', () => {
    expect(source).toContain('export async function getAgentRecord');
    expect(source).toContain('const supabase = await createClient();');
  });

  it('links the directory to the detail screen', () => {
    const directory = read('src/app/admin/agents/page.tsx');
    expect(directory).toContain('href={`/admin/agents/${row.id}`}');
  });
});

/* ---------------------------------------------------------- the navigation -- */

describe('the console navigation', () => {
  const navigation = read('src/lib/operations/navigation.ts');

  it('adds the commercial group', () => {
    expect(navigation).toContain("label: 'Commercial'");
    expect(navigation).toContain("href: '/admin/customers'");
    expect(navigation).toContain("href: '/admin/subscriptions'");
    expect(navigation).toContain("href: '/admin/api-management'");
  });

  it('restricts the commercial modules to the roles that may open them', () => {
    const block = navigation.slice(navigation.indexOf("label: 'Commercial'"));
    const items = block.slice(0, block.indexOf('},'));
    // Only admin and super_admin, never an analyst or a verification officer.
    expect(items).not.toContain("'analyst'");
    expect(items).not.toContain("'verification_officer'");
    expect(items).not.toContain("'market_supervisor'");
    expect(items).toContain("'admin', 'super_admin'");
  });

  it('lists no module that does not exist', () => {
    const hrefs = [...navigation.matchAll(/href: '([^']+)'/g)].map((m) => m[1]);
    for (const href of hrefs) {
      const route = join(ROOT, 'src/app', `${href}/page.tsx`);
      expect(() => readFileSync(route), `${href} must have a page`).not.toThrow();
    }
  });
});
