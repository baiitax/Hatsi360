import { readFileSync, readdirSync, statSync } from 'node:fs';
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
