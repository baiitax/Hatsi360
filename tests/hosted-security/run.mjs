#!/usr/bin/env node
/**
 * Hosted security acceptance runner (H-1 … H-10).
 *
 * PREPARATION ARTEFACT. As of Phase 7B this harness has never been executed
 * against a hosted project: staging does not exist yet. It is reviewed code
 * plus unit tests, not evidence.
 *
 * Usage
 *   node tests/hosted-security/run.mjs --list
 *   node tests/hosted-security/run.mjs --dry-run            # env + prereq validation only
 *   node tests/hosted-security/run.mjs --all                # read-only checks (default mode)
 *   node tests/hosted-security/run.mjs --test H-2 --test H-3
 *   node tests/hosted-security/run.mjs --all --mode write   # needs the full confirmation set
 *
 * Exit codes: 0 all selected checks passed · 1 a check failed · 2 configuration
 * refused · 3 incomplete (blocked / not executed) — never 0 for incomplete.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

import { loadEnvironment, describeTarget, PRODUCTION_REF } from './lib/env.mjs';
import { createClient } from './lib/http.mjs';
import { createFixtures } from './lib/fixtures.mjs';
import { buildRecord, writeEvidence, renderMarkdown, summarise, exitCodeFor, STATUS } from './lib/report.mjs';
import { CHECKS, byId, select } from './checks/index.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_EVIDENCE = join(HERE, 'evidence');

function parseArgs(argv) {
  const args = { tests: [], all: false, list: false, dryRun: false, mode: 'read-only', evidence: DEFAULT_EVIDENCE, prereqs: null, json: false, allowDestructive: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--list') args.list = true;
    else if (a === '--all') args.all = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--json') args.json = true;
    else if (a === '--allow-destructive') args.allowDestructive = true;
    else if (a === '--test') args.tests.push(String(argv[++i] ?? '').toUpperCase());
    else if (a.startsWith('--test=')) args.tests.push(a.split('=')[1].toUpperCase());
    else if (a === '--mode') args.mode = String(argv[++i] ?? 'read-only');
    else if (a === '--evidence') args.evidence = resolve(String(argv[++i] ?? DEFAULT_EVIDENCE));
    else if (a === '--prereqs') args.prereqs = resolve(String(argv[++i] ?? ''));
    else if (a === '--help' || a === '-h') args.help = true;
    else { console.error(`unknown argument: ${a}`); process.exit(2); }
  }
  return args;
}

const HELP = `
Hosted security acceptance runner — H-1 … H-10

  --list                 show the ten checks, their tier and prerequisites
  --all                  run every check allowed by the current mode
  --test H-3             run one check (repeatable)
  --mode read-only|write default read-only; write requires the full confirmation set
  --dry-run              validate environment and prerequisites, execute nothing
  --prereqs <file>       JSON manifest of applied proposals (see prereqs.sql)
  --evidence <dir>       evidence output directory (default tests/hosted-security/evidence)
  --allow-destructive    permit H-8 (still requires HATSI360_ALLOW_DISRUPTIVE=1)
  --json                 print the machine-readable summary to stdout

Read-only is the default. Nothing here applies migrations, creates projects or
touches production: the production reference ${PRODUCTION_REF} is refused outright.
`;

async function loadPrereqs(file) {
  if (!file) return null;
  try {
    const raw = JSON.parse(await readFile(file, 'utf8'));
    if (!Array.isArray(raw.applied)) throw new Error('manifest must contain an "applied" array');
    return { ...raw, source: file };
  } catch (err) {
    throw new Error(`could not read prereq manifest ${file}: ${err.message}`);
  }
}

function printList() {
  console.log('\nHosted acceptance checks\n');
  for (const c of CHECKS) {
    console.log(`  ${c.id.padEnd(5)} ${c.tier.padEnd(11)} ${c.title}`);
    console.log(`        layer: ${c.layer.join(', ')} | identity: ${c.identity} | requires: ${c.requires.join(' + ')}`);
  }
  console.log('\nTiers: read-only runs by default; write/service need --mode write; manual and destructive never run unattended.\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { console.log(HELP); return 0; }
  if (args.list) { printList(); return 0; }

  const { ok, errors, warnings, config } = loadEnvironment(process.env, { mode: args.mode });
  for (const w of warnings) console.log(`  warn  ${w}`);
  if (!ok) {
    console.error('\nRefusing to run — environment is not an approved staging target:\n' + errors.map((e) => `  - ${e}`).join('\n') + '\n');
    console.error('See tests/hosted-security/README.md §Environment.\n');
    return 2;
  }

  const prereqs = await loadPrereqs(args.prereqs).catch((err) => { console.error(`\n${err.message}\n`); process.exit(2); });
  if (args.mode === 'write' && !prereqs) {
    console.error('\nRefusing to run write-capable checks without a prereq manifest (--prereqs).');
    console.error('The harness never applies migrations itself, so it must be told what is applied.\n');
    return 2;
  }

  const { chosen, skipped } = select({ ids: args.tests, mode: args.mode, includeDestructive: args.allowDestructive });
  if (args.tests.length && chosen.length !== args.tests.length) {
    const unknown = args.tests.filter((id) => !byId(id));
    if (unknown.length) { console.error(`unknown test id(s): ${unknown.join(', ')}`); return 2; }
  }

  console.log(`\nHosted security acceptance — ${describeTarget(config)}`);
  console.log(`  commit: ${config.commit ?? '(unset)'}  prereqs: ${prereqs ? prereqs.applied.join(',') || 'none' : 'unverified'}`);
  console.log(`  selected: ${chosen.map((c) => c.id).join(', ') || '(none)'}${skipped.length ? `  deferred by mode: ${skipped.join(', ')}` : ''}\n`);

  if (args.dryRun) {
    console.log('Dry run: environment accepted, nothing executed.\n');
    return 0;
  }

  const http = createClient({ baseUrl: config.url, anonKey: config.anonKey, serviceKey: config.serviceKey });
  const fixtures = createFixtures({ http, serviceKey: config.serviceKey });
  const records = [];
  const runId = `run-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 15)}`;
  const ctx = {
    env: { ...config, allowDisruptive: process.env.HATSI360_ALLOW_DISRUPTIVE === '1', sessionCookie: process.env.HATSI360_SESSION_COOKIE ?? null },
    http, fixtures, prereqs, log: (m) => console.log(`        ${m}`), userId: config.userId ?? null,
  };

  try {
    for (const check of chosen) {
      // A local target can never produce hosted acceptance evidence.
      if (config.kind !== 'hosted-staging') {
        records.push(buildRecord({
          id: check.id, title: check.title, layer: check.layer, tier: check.tier, identity: check.identity,
          status: STATUS.BLOCKED, expected: '-', actual: '-',
          notes: 'target is not a hosted staging project — a local target is never hosted acceptance',
          target: config, commit: config.commit,
        }));
        console.log(`  BLOCKED ${check.id}  local target`);
        continue;
      }
      let outcome;
      try {
        outcome = await check.run(ctx);
      } catch (err) {
        outcome = { status: STATUS.FAILED, expected: 'check completes', actual: `threw: ${err.message}` };
      }
      const record = buildRecord({
        id: check.id, title: check.title, layer: check.layer, tier: check.tier, identity: check.identity,
        status: outcome.status, expected: outcome.expected, actual: outcome.actual,
        request: outcome.request ?? null, response: outcome.response ?? null,
        dbEvidence: outcome.dbEvidence ?? null, notes: outcome.notes ?? null,
        target: config, commit: config.commit,
        proposalVersion: prereqs?.applied?.join(',') ?? null,
      });
      records.push(record);
      console.log(`  ${record.status.toUpperCase().padEnd(12)} ${check.id}  ${oneLine(record.actual)}`);
    }
  } finally {
    if (config.serviceKey && args.mode === 'write' && fixtures.created.length) {
      await fixtures.cleanup((m) => console.log(`  ${m}`));
    }
    await fixtures.manifest(args.evidence, runId).catch(() => {});
  }

  const { runDir, summary } = await writeEvidence(args.evidence, runId, records, {
    target: describeTarget(config), commit: config.commit, mode: args.mode, operator: config.operator,
  });

  console.log(`\n${renderMarkdown(records, { target: describeTarget(config), commit: config.commit, mode: args.mode })}`);
  console.log(`Evidence: ${runDir}`);
  if (args.json) console.log(JSON.stringify(summary, null, 2));

  const code = exitCodeFor(records);
  if (code === 3) console.log('Incomplete: blocked or not-executed tests are not passes.');
  return code;
}

const oneLine = (v) => String(typeof v === 'object' ? JSON.stringify(v) : v).slice(0, 100);

main()
  .then((code) => process.exit(code))
  .catch((err) => { console.error(`\nRunner aborted: ${err.message}`); process.exit(2); });
