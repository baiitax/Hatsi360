/**
 * Result model, evidence writer and human summary.
 *
 * Statuses are deliberately five-valued: a blocked or unexecuted test is never
 * folded into "passed". The runner exits non-zero unless every selected test is
 * either `passed` or `not-applicable`.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { redact } from './redact.mjs';

export const STATUS = Object.freeze({
  PASSED: 'passed',
  FAILED: 'failed',
  BLOCKED: 'blocked',
  NOT_APPLICABLE: 'not-applicable',
  NOT_EXECUTED: 'not-executed',
});

const STATUSES = new Set(Object.values(STATUS));

export function buildRecord({
  id, title, layer = [], tier = 'read-only', identity = 'anon', status,
  expected, actual, request = null, response = null, dbEvidence = null,
  notes = null, target = {}, commit = null, proposalVersion = null, timestamp = new Date().toISOString(),
}) {
  if (!STATUSES.has(status)) throw new Error(`invalid status "${status}"`);
  return redact({
    id,
    title,
    layer,
    tier,
    identity,
    status,
    expected,
    actual,
    request,
    response,
    dbEvidence,
    notes,
    target: { kind: target.kind, ref: target.ref, host: target.host, mode: target.mode },
    commit,
    proposalVersion,
    timestamp,
  });
}

/** Structural validation, used by the harness and by its unit tests. */
export function validateRecord(record) {
  const problems = [];
  const required = ['id', 'title', 'status', 'expected', 'actual', 'timestamp'];
  for (const k of required) {
    if (record[k] === undefined || record[k] === null || record[k] === '') problems.push(`missing ${k}`);
  }
  if (!/^H-(10|[1-9])$/.test(record.id ?? '')) problems.push(`bad test id "${record.id}"`);
  if (!STATUSES.has(record.status)) problems.push(`bad status "${record.status}"`);
  if (typeof record.expected !== 'string' && typeof record.expected !== 'object') problems.push('expected must be string or object');
  if (JSON.stringify(record).match(/eyJ[A-Za-z0-9_-]{8,}\./)) problems.push('record appears to contain a JWT');
  if (JSON.stringify(record).match(/"apikey":"(?!\[REDACTED\])/)) problems.push('record appears to contain an api key');
  return { valid: problems.length === 0, problems };
}

export async function writeEvidence(dir, runId, records, meta = {}) {
  const runDir = join(dir, runId);
  await mkdir(runDir, { recursive: true });
  for (const record of records) {
    const { valid, problems } = validateRecord(record);
    if (!valid) throw new Error(`evidence record ${record.id} invalid: ${problems.join('; ')}`);
    await writeFile(join(runDir, `${record.id}.json`), JSON.stringify(record, null, 2) + '\n');
  }
  const summary = summarise(records, meta);
  await writeFile(join(runDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  await writeFile(join(runDir, 'summary.md'), renderMarkdown(records, meta) + '\n');
  return { runDir, summary };
}

export function summarise(records, meta = {}) {
  const counts = Object.fromEntries(Object.values(STATUS).map((s) => [s, 0]));
  for (const r of records) counts[r.status] += 1;
  const acceptance =
    counts[STATUS.FAILED] === 0 && counts[STATUS.BLOCKED] === 0 && counts[STATUS.NOT_EXECUTED] === 0
      ? 'ACCEPTED'
      : counts[STATUS.FAILED] > 0
        ? 'REJECTED'
        : 'INCOMPLETE';
  return {
    generatedAt: new Date().toISOString(),
    ...meta,
    counts,
    total: records.length,
    acceptance,
    tests: records.map((r) => ({ id: r.id, title: r.title, status: r.status })),
  };
}

export function renderMarkdown(records, meta = {}) {
  const summary = summarise(records, meta);
  const lines = [
    `# Hosted security acceptance — ${summary.generatedAt}`,
    '',
    `- Target: \`${meta.target ?? 'unknown'}\``,
    `- Commit: \`${meta.commit ?? 'unknown'}\``,
    `- Mode: \`${meta.mode ?? 'unknown'}\``,
    `- Acceptance: **${summary.acceptance}**`,
    '',
    '| Test | Status | Expected | Actual |',
    '|---|---|---|---|',
  ];
  for (const r of records) {
    lines.push(`| ${r.id} ${r.title} | **${r.status}** | ${oneLine(r.expected)} | ${oneLine(r.actual)} |`);
  }
  lines.push('', 'Blocked and not-executed tests are not passes.', '');
  return lines.join('\n');
}

const oneLine = (v) => String(typeof v === 'object' ? JSON.stringify(v) : v).replace(/\|/g, '\\|').slice(0, 160);

export function exitCodeFor(records) {
  const s = summarise(records);
  if (s.counts[STATUS.FAILED] > 0) return 1;
  if (s.counts[STATUS.BLOCKED] > 0 || s.counts[STATUS.NOT_EXECUTED] > 0) return 3;
  return 0;
}
