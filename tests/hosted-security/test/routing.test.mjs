/** Registry shape and test-selection tests. */
import assert from 'node:assert/strict';
import { CHECKS, byId, select } from '../checks/index.mjs';

let passed = 0;
const results = [];
const test = (name, fn) => {
  try { fn(); passed += 1; results.push(['PASS', name]); }
  catch (err) { results.push(['FAIL', name, err.message]); }
};

const VALID_TIERS = new Set(['read-only', 'write', 'service', 'manual', 'destructive']);
const VALID_LAYERS = new Set(['sql', 'postgrest', 'jwt', 'rls', 'execute', 'application']);

test('exactly ten checks, H-1 … H-10, no duplicates', () => {
  assert.equal(CHECKS.length, 10);
  const ids = CHECKS.map((c) => c.id);
  assert.deepEqual([...ids].sort((a, b) => Number(a.slice(2)) - Number(b.slice(2))), ['H-1','H-2','H-3','H-4','H-5','H-6','H-7','H-8','H-9','H-10']);
  assert.equal(new Set(ids).size, 10);
});

test('every check declares tier, layers, identity, prerequisites and a runner', () => {
  for (const c of CHECKS) {
    assert.ok(VALID_TIERS.has(c.tier), `${c.id} tier ${c.tier}`);
    assert.ok(Array.isArray(c.layer) && c.layer.length, `${c.id} layers`);
    for (const l of c.layer) assert.ok(VALID_LAYERS.has(l), `${c.id} layer ${l}`);
    assert.ok(c.identity, `${c.id} identity`);
    assert.ok(Array.isArray(c.requires) && c.requires.length, `${c.id} requires`);
    assert.equal(typeof c.run, 'function', `${c.id} run`);
  }
});

test('prerequisites match the documented dependency chain', () => {
  assert.deepEqual(byId('H-1').requires, ['0056']);
  assert.deepEqual(byId('H-6').requires, ['0056', '0058']);
  assert.deepEqual(byId('H-5').requires, ['0057']);
  assert.deepEqual(byId('H-9').requires, ['0047', '0059']);
  assert.deepEqual(byId('H-10').requires, ['0060']);
});

test('H-1, H-2 and H-3 probe the HTTP layer, not just SQL', () => {
  for (const id of ['H-1', 'H-2', 'H-3']) assert.ok(byId(id).layer.includes('postgrest'), id);
});

test('byId is case-insensitive and returns undefined for unknown ids', () => {
  assert.equal(byId('h-3').id, 'H-3');
  assert.equal(byId('H-99'), undefined);
});

test('read-only mode defers write, service and destructive checks', () => {
  const { chosen, skipped } = select({ mode: 'read-only' });
  const tiers = new Set(chosen.map((c) => c.tier));
  assert.ok(!tiers.has('write') && !tiers.has('service') && !tiers.has('destructive'));
  assert.ok(skipped.includes('H-5') && skipped.includes('H-10') && skipped.includes('H-8'));
});

test('write mode admits write and service checks but still defers destructive', () => {
  const { chosen, skipped } = select({ mode: 'write' });
  const ids = chosen.map((c) => c.id);
  assert.ok(ids.includes('H-5') && ids.includes('H-6') && ids.includes('H-10'));
  assert.ok(skipped.includes('H-8'));
});

test('destructive checks need the explicit flag as well', () => {
  const { chosen, skipped } = select({ mode: 'write', includeDestructive: true });
  assert.ok(chosen.map((c) => c.id).includes('H-8'));
  assert.ok(!skipped.includes('H-8'));
});

test('individual selection routes to a single check', () => {
  const { chosen } = select({ ids: ['H-3'], mode: 'read-only' });
  assert.equal(chosen.length, 1);
  assert.equal(chosen[0].id, 'H-3');
});

test('individual selection of a write check in read-only mode yields nothing to run', () => {
  const { chosen, skipped } = select({ ids: ['H-5'], mode: 'read-only' });
  assert.equal(chosen.length, 0);
  assert.deepEqual(skipped, ['H-5']);
});

for (const [status, name, detail] of results) console.log(`  ${status}  ${name}${detail ? ` — ${detail}` : ''}`);
console.log(`\n${passed}/${results.length} routing checks passed`);
if (results.some(([s]) => s === 'FAIL')) process.exitCode = 1;
