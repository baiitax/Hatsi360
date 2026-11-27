/** Secret-redaction tests — evidence must never carry a usable credential. */
import assert from 'node:assert/strict';
import { redact, redactString, redactHeaders, isSecretKey } from '../lib/redact.mjs';

let passed = 0;
const results = [];
const test = (name, fn) => {
  try { fn(); passed += 1; results.push(['PASS', name]); }
  catch (err) { results.push(['FAIL', name, err.message]); }
};

const JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';

test('detects secret-bearing keys', () => {
  for (const k of ['apikey', 'Authorization', 'service_role_key', 'user_password', 'session_cookie', 'access_token']) {
    assert.equal(isSecretKey(k), true, k);
  }
  for (const k of ['status', 'title', 'count', 'rows']) assert.equal(isSecretKey(k), false, k);
});

test('redacts secret-keyed values but preserves shape', () => {
  const out = redact({ apikey: 'abc', Authorization: 'Bearer xyz', status: 200 });
  assert.equal(out.apikey, '[REDACTED]');
  assert.equal(out.Authorization, '[REDACTED]');
  assert.equal(out.status, 200);
});

test('redacts a JWT embedded in free text', () => {
  const out = redactString(`token=${JWT} end`);
  assert.ok(!out.includes(JWT));
  assert.match(out, /\[REDACTED\]/);
});

test('redacts bearer credentials in headers rendered as text', () => {
  assert.ok(!redactString('Authorization: Bearer abc.def.ghi').includes('abc.def.ghi'));
});

test('redacts long opaque values (service keys)', () => {
  const key = 'sb_secret_abcdefghijklmnopqrstuvwxyz0123456789';
  assert.ok(!redactString(key).includes(key.slice(-12)));
});

test('keeps a 20-character project reference readable', () => {
  const ref = 'abcdefghijklmnopqrst';
  assert.equal(redactString(ref), ref);
});

test('redactHeaders keeps only allow-listed headers', () => {
  const h = redactHeaders({ 'content-type': 'application/json', apikey: 'x', Authorization: 'Bearer y', prefer: 'return=minimal' });
  assert.equal(h['content-type'], 'application/json');
  assert.equal(h.prefer, 'return=minimal');
  assert.equal(h.apikey, '[REDACTED]');
  assert.equal(h.Authorization, '[REDACTED]');
});

test('redacts nested structures without mutating the input', () => {
  const input = { a: [{ token: 'x' }, { ok: 1 }], b: 'plain' };
  const out = redact(input);
  assert.equal(out.a[0].token, '[REDACTED]');
  assert.equal(out.a[1].ok, 1);
  assert.equal(input.a[0].token, 'x');
});

for (const [status, name, detail] of results) console.log(`  ${status}  ${name}${detail ? ` — ${detail}` : ''}`);
console.log(`\n${passed}/${results.length} redaction checks passed`);
if (results.some(([s]) => s === 'FAIL')) process.exitCode = 1;
