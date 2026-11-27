#!/usr/bin/env node
/** Run every harness unit test file; exit non-zero if any fails. */
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(HERE).filter((f) => f.endsWith('.test.mjs')).sort();

let failed = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, [join(HERE, f)], { encoding: 'utf8' });
  process.stdout.write(r.stdout ?? '');
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status !== 0) { failed += 1; console.log(`  ! ${f} exited ${r.status}`); }
}
console.log(`\n${files.length - failed}/${files.length} harness test files passed`);
process.exit(failed ? 1 : 0);
