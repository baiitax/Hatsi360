/**
 * Environment-guard tests — the safety controls, proven offline.
 * These are the tests that decide whether the harness may talk to anything at all.
 */
import assert from 'node:assert/strict';
import { loadEnvironment, PRODUCTION_REF } from '../lib/env.mjs';

let passed = 0;
const results = [];
const test = (name, fn) => {
  try { fn(); passed += 1; results.push(['PASS', name]); }
  catch (err) { results.push(['FAIL', name, err.message]); }
};

const STAGING_REF = 'abcdefghijklmnopqrst';
const base = {
  HATSI360_STAGING_PROJECT_REF: STAGING_REF,
  HATSI360_STAGING_URL: `https://${STAGING_REF}.supabase.co`,
  HATSI360_ANON_KEY: 'anon-placeholder',
};

test('refuses to run with no HATSI360 variables', () => {
  const r = loadEnvironment({});
  assert.equal(r.ok, false);
  assert.match(r.errors.join(' '), /no HATSI360_STAGING_\* variables set/);
});

test('refuses to infer a target from ambient SUPABASE_URL', () => {
  const r = loadEnvironment({ SUPABASE_URL: `https://${STAGING_REF}.supabase.co`, SUPABASE_ANON_KEY: 'x' });
  assert.equal(r.ok, false);
  assert.match(r.errors.join(' '), /refusing to infer a target/);
  assert.match(r.errors.join(' '), /SUPABASE_URL/);
});

test('rejects the production project reference', () => {
  const r = loadEnvironment({ ...base, HATSI360_STAGING_PROJECT_REF: PRODUCTION_REF, HATSI360_STAGING_URL: `https://${PRODUCTION_REF}.supabase.co` });
  assert.equal(r.ok, false);
  assert.match(r.errors.join(' '), /is the production project reference/);
});

test('rejects a URL containing the production reference', () => {
  const r = loadEnvironment({ ...base, HATSI360_STAGING_URL: `https://${PRODUCTION_REF}.supabase.co` });
  assert.equal(r.ok, false);
  assert.match(r.errors.join(' '), /URL contains the production project reference/);
});

test('rejects a missing staging reference', () => {
  const r = loadEnvironment({ ...base, HATSI360_STAGING_PROJECT_REF: '' });
  assert.equal(r.ok, false);
  assert.match(r.errors.join(' '), /HATSI360_STAGING_PROJECT_REF is required/);
});

test('rejects a URL whose host does not match the reference', () => {
  const r = loadEnvironment({ ...base, HATSI360_STAGING_URL: 'https://zzzzzzzzzzzzzzzzzzzz.supabase.co' });
  assert.equal(r.ok, false);
  assert.match(r.errors.join(' '), /does not belong to project reference/);
});

test('rejects a non-Supabase host', () => {
  const r = loadEnvironment({ ...base, HATSI360_STAGING_URL: 'https://example.com' });
  assert.equal(r.ok, false);
  assert.match(r.errors.join(' '), /not a Supabase project host/);
});

test('rejects a local target unless explicitly allowed', () => {
  const r = loadEnvironment({ ...base, HATSI360_STAGING_URL: 'http://127.0.0.1:54321' });
  assert.equal(r.ok, false);
  assert.match(r.errors.join(' '), /local targets require HATSI360_ALLOW_LOCAL=1/);
});

test('a permitted local target is classified local, not staging', () => {
  const r = loadEnvironment({ ...base, HATSI360_STAGING_URL: 'http://127.0.0.1:54321', HATSI360_ALLOW_LOCAL: '1' });
  assert.equal(r.ok, true);
  assert.equal(r.config.kind, 'local');
  assert.match(r.warnings.join(' '), /never passed/);
});

test('accepts a well-formed staging target in read-only mode', () => {
  const r = loadEnvironment(base);
  assert.equal(r.ok, true);
  assert.equal(r.config.mode, 'read-only');
  assert.equal(r.config.kind, 'hosted-staging');
  assert.equal(r.config.ref, STAGING_REF);
});

test('write mode requires the explicit confirmation string', () => {
  const r = loadEnvironment(base, { mode: 'write' });
  assert.equal(r.ok, false);
  assert.match(r.errors.join(' '), /HATSI360_CONFIRM_WRITES=yes-this-staging-is-disposable/);
});

test('write mode requires an operator name', () => {
  const r = loadEnvironment({ ...base, HATSI360_CONFIRM_WRITES: 'yes-this-staging-is-disposable' }, { mode: 'write' });
  assert.equal(r.ok, false);
  assert.match(r.errors.join(' '), /HATSI360_OPERATOR/);
});

test('write mode requires the reference to be re-typed by the operator', () => {
  const r = loadEnvironment(
    { ...base, HATSI360_CONFIRM_WRITES: 'yes-this-staging-is-disposable', HATSI360_OPERATOR: 'engineer' },
    { mode: 'write' },
  );
  assert.equal(r.ok, false);
  assert.match(r.errors.join(' '), /HATSI360_CONFIRMED_PROJECT_REF/);
});

test('write mode accepts the full confirmation set', () => {
  const r = loadEnvironment(
    {
      ...base,
      HATSI360_CONFIRM_WRITES: 'yes-this-staging-is-disposable',
      HATSI360_OPERATOR: 'engineer',
      HATSI360_CONFIRMED_PROJECT_REF: STAGING_REF,
    },
    { mode: 'write' },
  );
  assert.equal(r.ok, true);
  assert.equal(r.config.mode, 'write');
  assert.match(r.warnings.join(' '), /HATSI360_SERVICE_KEY is unset/);
});

test('rejects an unknown mode', () => {
  const r = loadEnvironment(base, { mode: 'yolo' });
  assert.equal(r.ok, false);
  assert.match(r.errors.join(' '), /unknown mode/);
});

const failed = results.filter(([s]) => s === 'FAIL');
for (const [status, name, detail] of results) {
  console.log(`  ${status}  ${name}${detail ? ` — ${detail}` : ''}`);
}
console.log(`\n${passed}/${results.length} guard checks passed`);
if (failed.length) process.exitCode = 1;
