import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The browser must never be able to read a privileged credential.
 *
 * The check is made on the source: a file marked `'use client'` may not
 * import the service-role client, and no file that is reachable from the
 * browser may reference the service-role environment variable. The built
 * bundle is checked too when a build is present.
 */

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

function walk(directory: string): string[] {
  const entries: string[] = [];
  for (const name of readdirSync(directory)) {
    const full = join(directory, name);
    if (statSync(full).isDirectory()) {
      entries.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(name)) {
      entries.push(full);
    }
  }
  return entries;
}

const files = walk(SRC);

function isClientComponent(path: string): boolean {
  return readFileSync(path, 'utf8').startsWith("'use client'");
}

describe('the service-role key', () => {
  it('is only read by the server-only admin client', () => {
    const readers = files.filter((file) =>
      readFileSync(file, 'utf8').includes('SUPABASE_SERVICE_ROLE_KEY'),
    );

    expect(readers.length).toBeGreaterThan(0);
    for (const file of readers) {
      const source = readFileSync(file, 'utf8');
      expect(source).toContain("import 'server-only'");
      expect(isClientComponent(file)).toBe(false);
    }
  });

  it('is never imported by a client component', () => {
    for (const file of files) {
      if (!isClientComponent(file)) continue;
      const source = readFileSync(file, 'utf8');
      expect(source).not.toMatch(/from '@\/lib\/supabase\/admin'/);
      expect(source).not.toMatch(/from "@\/lib\/supabase\/admin"/);
    }
  });

  it('is not referenced by any file in the app directory', () => {
    for (const file of files) {
      if (!file.includes(join('app', ''))) continue;
      expect(readFileSync(file, 'utf8')).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    }
  });
});

describe('server-only modules', () => {
  it('marks every module that reads the database as server-only', () => {
    const serverModules = [
      'src/lib/supabase/admin.ts',
      'src/lib/supabase/server.ts',
      'src/lib/analytics/snapshot.ts',
      'src/lib/analytics/queries.ts',
      'src/lib/operations/admin.ts',
      'src/lib/operations/agent.ts',
      'src/lib/operations/actions.ts',
      'src/lib/jobs/index.ts',
      'src/lib/notifications/index.ts',
      'src/lib/auth/guards.ts',
      'src/lib/auth/rate-limit.ts',
      'src/lib/reports/index.ts',
    ];

    for (const relativePath of serverModules) {
      const source = readFileSync(join(ROOT, relativePath), 'utf8');
      // A server action is marked `'use server'`; everything else is marked
      // `import 'server-only'`. Either way it must never reach the browser.
      const marked =
        source.includes("import 'server-only'") || source.startsWith("'use server'");
      expect(marked, `${relativePath} must be server-only`).toBe(true);
    }
  });
});

describe('the client bundle', () => {
  const staticDir = join(ROOT, '.next', 'static');

  it('contains no service-role credential', () => {
    let filesInBundle: string[] = [];
    try {
      filesInBundle = walk(staticDir);
    } catch {
      // No build in this checkout: the source-level checks above still apply.
      return;
    }

    for (const file of filesInBundle) {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
      expect(source).not.toContain('service_role');
    }
  });
});

describe('the credential hashing', () => {
  it('never stores the raw identifier', async () => {
    const { hashIdentifier } = await import('@/lib/auth/rate-limit');
    const hash = hashIdentifier('Agent@Example.COM');
    expect(hash).not.toContain('agent');
    expect(hash).not.toContain('example');
    expect(hash).toHaveLength(64);
    // The same identifier always produces the same hash, so the counter works.
    expect(hashIdentifier('agent@example.com')).toBe(hash);
    // A different identifier produces a different hash.
    expect(hashIdentifier('other@example.com')).not.toBe(hash);
  });
});

/**
 * No credential may be committed.
 *
 * `.env.local` is gitignored and the application reads every secret from the
 * environment. These tests scan the tracked source tree for a literal that
 * should only ever have come from the environment.
 *
 * The bug this covers: `scripts/verify_offer_workflow.mjs` was committed with
 * the project's Postgres password and service-role key written into it. The
 * file is a verification script, so it is not part of the browser bundle and
 * the existing checks above did not look at it — but it is committed, and a
 * committed credential is a leaked credential.
 */
describe('no committed credentials', () => {
  // A JWT of any kind. Every Supabase key is a JWT, and none of them belongs in
  // a tracked file.
  const JWT = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/;

  /**
   * The real credential values, read from the environment.
   *
   * The test never writes a secret into itself: it reads whatever the
   * environment holds — which is where the credentials are supposed to live —
   * and asserts those exact values appear nowhere in the tracked tree. A file
   * that embedded the literal to search for would itself be a leak.
   */
  function secretValues(): Array<{ label: string; value: string }> {
    const found: Array<{ label: string; value: string }> = [];
    for (const name of [
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_DB_PASSWORD',
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    ]) {
      const value = process.env[name];
      // Only a value long enough to be a real credential, so a placeholder
      // such as "your-key-here" in .env.example cannot produce a false pass.
      if (value && value.length >= 12) found.push({ label: name, value });
    }
    return found;
  }

  // Scan everything that is tracked, not just src/: scripts, tests and
  // configuration are all committed and all capable of carrying a secret.
  const directories = ['src', 'scripts', 'tests', 'supabase', 'docs'];
  const tracked: string[] = [];
  for (const dir of directories) {
    const full = join(ROOT, dir);
    if (!existsSync(full)) continue;
    const stack = [full];
    while (stack.length) {
      const current = stack.pop()!;
      for (const name of readdirSync(current)) {
        const path = join(current, name);
        if (statSync(path).isDirectory()) stack.push(path);
        else tracked.push(path);
      }
    }
  }

  it('scans a meaningful number of files', () => {
    // Guards against the scan silently becoming vacuous if a directory is
    // renamed or removed: the assertion above is only worth as much as the
    // set it runs over.
    expect(tracked.length).toBeGreaterThan(100);
  });

  it('contains no JWT in the tracked source tree', () => {
    const offenders = tracked.filter((file) => JWT.test(readFileSync(file, 'utf8')));
    expect(offenders.map((f) => relative(ROOT, f))).toEqual([]);
  });

  it('contains none of the credentials the environment holds', () => {
    // This assertion is only meaningful when the environment is configured.
    // Without credentials it passes vacuously, so it says so rather than
    // reporting a pass it did not earn.
    const values = secretValues();
    if (values.length === 0) {
      console.warn('    no credentials in the environment; this check was vacuous');
      return;
    }
    const offenders = tracked.filter((file) => {
      const text = readFileSync(file, 'utf8');
      return values.some(({ value }) => text.includes(value));
    });
    expect(offenders.map((f) => relative(ROOT, f))).toEqual([]);
  });

  it('reads the database credentials from the environment, not from a literal', () => {
    const script = readFileSync(join(ROOT, 'scripts', 'verify_offer_workflow.mjs'), 'utf8');
    expect(script).toContain('process.env.SUPABASE_DB_PASSWORD');
    expect(script).toContain('process.env.SUPABASE_SERVICE_ROLE_KEY');
    // And it refuses to run without them, rather than falling back.
    expect(script).toContain('Missing environment variable');
  });
});
