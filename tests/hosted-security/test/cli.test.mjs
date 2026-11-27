/**
 * End-to-end CLI safety tests. These spawn the real runner with hostile
 * environments and assert it refuses — the only way to prove the guards are
 * wired into the entry point rather than living in a library nobody calls.
 *
 * No network is used: every case is rejected before a request is made, or runs
 * against a permitted local target where every hosted check is blocked.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const RUNNER = join(HERE, '..', 'run.mjs');
const STAGING_REF = 'abcdefghijklmnopqrst';
const PRODUCTION_REF = 'umxzsdepbrenqysabtlt';
const JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJwN2IifQ.c2lnbmF0dXJlLXBsYWNlaG9sZGVy';

let passed = 0;
const results = [];
const record = (name, fn) => {
  try { fn(); passed += 1; results.push(['PASS', name]); }
  catch (err) { results.push(['FAIL', name, err.message]); }
};

const run = (args, env) => spawnSync(process.execPath, [RUNNER, ...args], {
  env: { PATH: process.env.PATH, ...env },
  encoding: 'utf8',
  timeout: 30000,
});

const cleanEnv = {
  HATSI360_STAGING_PROJECT_REF: STAGING_REF,
  HATSI360_STAGING_URL: `https://${STAGING_REF}.supabase.co`,
  HATSI360_ANON_KEY: JWT,
};

record('rejects the production project reference with exit 2', () => {
  const r = run(['--all', '--dry-run'], {
    HATSI360_STAGING_PROJECT_REF: PRODUCTION_REF,
    HATSI360_STAGING_URL: `https://${PRODUCTION_REF}.supabase.co`,
    HATSI360_ANON_KEY: JWT,
  });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /production project reference/);
});

record('rejects an empty environment rather than falling back', () => {
  const r = run(['--all', '--dry-run'], {});
  assert.equal(r.status, 2);
  assert.match(r.stderr, /refusing to infer a target/);
});

record('rejects write mode without the confirmation set', () => {
  const r = run(['--all', '--mode', 'write'], cleanEnv);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /HATSI360_CONFIRM_WRITES/);
});

record('refuses write mode without a prereq manifest', () => {
  const r = run(['--all', '--mode', 'write'], {
    ...cleanEnv,
    HATSI360_CONFIRM_WRITES: 'yes-this-staging-is-disposable',
    HATSI360_OPERATOR: 'engineer',
    HATSI360_CONFIRMED_PROJECT_REF: STAGING_REF,
  });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /without a prereq manifest/);
});

record('accepts a well-formed staging target in dry-run and executes nothing', () => {
  const r = run(['--all', '--dry-run'], cleanEnv);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /Dry run: environment accepted, nothing executed/);
});

record('a local target yields BLOCKED for every check, never a pass', () => {
  const dir = join(tmpdir(), `p7b-cli-${Date.now()}`);
  const r = run(['--all', '--evidence', dir], {
    HATSI360_STAGING_PROJECT_REF: STAGING_REF,
    HATSI360_STAGING_URL: 'http://127.0.0.1:54321',
    HATSI360_ANON_KEY: JWT,
    HATSI360_ALLOW_LOCAL: '1',
  });
  assert.equal(r.status, 3, `expected incomplete exit 3, got ${r.status}`);
  assert.match(r.stdout, /BLOCKED/);
  assert.match(r.stdout, /never passes|not passes/);
});

record('never prints the anon key or a bearer token', () => {
  const r = run(['--all', '--dry-run'], cleanEnv);
  assert.ok(!r.stdout.includes(JWT), 'stdout leaked the key');
  assert.ok(!r.stderr.includes(JWT), 'stderr leaked the key');
});

record('--list describes all ten checks without touching the network', () => {
  const r = run(['--list'], {});
  assert.equal(r.status, 0);
  for (let i = 1; i <= 10; i += 1) assert.match(r.stdout, new RegExp(`H-${i}\\b`));
});

record('unknown test id is refused with exit 2', () => {
  const r = run(['--test', 'H-99'], cleanEnv);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /unknown test id/);
});

// async file assertions for the local run above
const dir = join(tmpdir(), `p7b-cli-files-${Date.now()}`);
const r = run(['--all', '--evidence', dir], {
  HATSI360_STAGING_PROJECT_REF: STAGING_REF,
  HATSI360_STAGING_URL: 'http://127.0.0.1:54321',
  HATSI360_ANON_KEY: JWT,
  HATSI360_ALLOW_LOCAL: '1',
});
try {
  const runs = await readdir(dir);
  assert.ok(runs.length === 1, `expected one run directory, saw ${runs.length}`);
  passed += 1;
  results.push(['PASS', 'evidence directory is created per run']);
} catch (err) {
  results.push(['FAIL', 'evidence directory is created per run', err.message]);
} finally {
  await rm(dir, { recursive: true, force: true }).catch(() => {});
}

for (const [status, name, detail] of results) console.log(`  ${status}  ${name}${detail ? ` — ${detail}` : ''}`);
console.log(`\n${passed}/${results.length} CLI checks passed`);
if (results.some(([s]) => s === 'FAIL')) process.exitCode = 1;
