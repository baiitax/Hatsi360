/** Evidence record, summary and exit-code tests. */
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildRecord, validateRecord, summarise, renderMarkdown, exitCodeFor, writeEvidence, STATUS } from '../lib/report.mjs';

let passed = 0;
const results = [];
const test = (name, fn) => {
  try { fn(); passed += 1; results.push(['PASS', name]); }
  catch (err) { results.push(['FAIL', name, err.message]); }
};
const rec = (over = {}) => buildRecord({
  id: 'H-2', title: 't', status: STATUS.PASSED, expected: 'e', actual: 'a',
  target: { kind: 'hosted-staging', ref: 'abcdefghijklmnopqrst', host: 'h', mode: 'read-only' },
  ...over,
});

test('builds a valid record', () => {
  const r = rec();
  assert.equal(validateRecord(r).valid, true);
  assert.equal(r.status, 'passed');
});

test('rejects an invalid status', () => {
  assert.throws(() => buildRecord({ id: 'H-1', title: 't', status: 'ok', expected: 'e', actual: 'a' }), /invalid status/);
});

test('validateRecord flags a bad test id', () => {
  assert.equal(validateRecord({ ...rec(), id: 'H-11' }).valid, false);
  assert.equal(validateRecord({ ...rec(), id: 'X-1' }).valid, false);
});

test('validateRecord flags a leaked JWT', () => {
  const r = { ...rec(), notes: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abcd' };
  assert.equal(validateRecord(r).valid, false);
  assert.match(validateRecord(r).problems.join(' '), /JWT/);
});

test('buildRecord redacts secrets on the way in', () => {
  const r = buildRecord({ id: 'H-1', title: 't', status: STATUS.PASSED, expected: 'e', actual: 'a', request: { headers: { apikey: 'secret-value' } } });
  assert.equal(r.request.headers.apikey, '[REDACTED]');
});

test('acceptance is ACCEPTED only when everything passed', () => {
  assert.equal(summarise([rec(), rec({ id: 'H-3' })]).acceptance, 'ACCEPTED');
});

test('a blocked test makes the run INCOMPLETE, never accepted', () => {
  const s = summarise([rec(), rec({ id: 'H-3', status: STATUS.BLOCKED })]);
  assert.equal(s.acceptance, 'INCOMPLETE');
  assert.equal(s.counts.blocked, 1);
});

test('a not-executed test makes the run INCOMPLETE', () => {
  assert.equal(summarise([rec({ status: STATUS.NOT_EXECUTED })]).acceptance, 'INCOMPLETE');
});

test('a failed test REJECTS the run', () => {
  assert.equal(summarise([rec(), rec({ id: 'H-3', status: STATUS.FAILED })]).acceptance, 'REJECTED');
});

test('not-applicable is not a failure', () => {
  assert.equal(summarise([rec({ status: STATUS.NOT_APPLICABLE })]).acceptance, 'ACCEPTED');
});

test('exit codes distinguish failure from incompleteness', () => {
  assert.equal(exitCodeFor([rec()]), 0);
  assert.equal(exitCodeFor([rec(), rec({ id: 'H-3', status: STATUS.FAILED })]), 1);
  assert.equal(exitCodeFor([rec(), rec({ id: 'H-3', status: STATUS.BLOCKED })]), 3);
  assert.equal(exitCodeFor([rec({ status: STATUS.NOT_EXECUTED })]), 3);
});

test('markdown summary states that blocked is not passed', () => {
  const md = renderMarkdown([rec(), rec({ id: 'H-4', status: STATUS.BLOCKED })]);
  assert.match(md, /Blocked and not-executed tests are not passes/);
  assert.match(md, /\*\*blocked\*\*/);
});

test('writeEvidence refuses an invalid record', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'p7b-'));
  try {
    await assert.rejects(() => writeEvidence(dir, 'run-x', [{ ...rec(), id: 'nope' }]), /invalid/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// async file test, awaited below
const dir = await mkdtemp(join(tmpdir(), 'p7b-'));
try {
  const { runDir } = await writeEvidence(dir, 'run-1', [rec(), rec({ id: 'H-4', status: STATUS.BLOCKED })], { target: 'x', commit: 'abc' });
  const summary = JSON.parse(await readFile(join(runDir, 'summary.json'), 'utf8'));
  assert.equal(summary.acceptance, 'INCOMPLETE');
  assert.equal(summary.total, 2);
  const one = JSON.parse(await readFile(join(runDir, 'H-2.json'), 'utf8'));
  assert.equal(one.id, 'H-2');
  passed += 1; results.push(['PASS', 'writeEvidence writes per-test records and a summary']);
} catch (err) {
  results.push(['FAIL', 'writeEvidence writes per-test records and a summary', err.message]);
} finally { await rm(dir, { recursive: true, force: true }); }

for (const [status, name, detail] of results) console.log(`  ${status}  ${name}${detail ? ` — ${detail}` : ''}`);
console.log(`\n${passed}/${results.length} report checks passed`);
if (results.some(([s]) => s === 'FAIL')) process.exitCode = 1;
