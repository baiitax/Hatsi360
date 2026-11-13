import { describe, expect, it, beforeAll } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';

const ROOT = process.cwd();

/**
 * Schema drift — every column the application selects must exist.
 *
 * This test exists because of a real bug. `getFieldMarkets()` selected
 * `zone_id` from `markets`. The column is `market_zone_id`. The query failed,
 * the error was swallowed by `data ?? []`, and the function returned an empty
 * list — so an agent with an active market assignment saw "No market is
 * assigned to you" and a disabled Start collection button. The field app
 * looked broken rather than under-granted.
 *
 * A unit test could not have caught it: the function is correct TypeScript and
 * the failure is invisible until the query runs. So this test reads every
 * `.from('table').select('columns')` in the source and checks the columns
 * against the live schema. That is the only place the truth is.
 *
 * If the database is not reachable the test skips and says so, rather than
 * passing vacuously.
 */

function walk(directory: string, extensions: string[]): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      if (['node_modules', '.next', '.git', '.arena'].includes(entry)) continue;
      found.push(...walk(full, extensions));
    } else if (extensions.some((extension) => entry.endsWith(extension))) {
      found.push(full);
    }
  }
  return found;
}

/** Split a Supabase select list into (table, column) pairs. */
function parseSelectList(
  raw: string,
  outerTable: string,
): Array<{ table: string; column: string }> {
  const out: Array<{ table: string; column: string }> = [];

  // Split on commas that are not inside parentheses, so an embedded resource
  // `commodities(name, slug)` stays in one piece.
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of raw) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);

  for (const part of parts) {
    const text = part.trim();
    if (!text || text === '*') continue;

    // An embedded resource: `table(col)`, `table!inner(col)`, or
    // `alias:table(col)`. The columns belong to the nested table, never to the
    // outer one — attributing them to the outer table is how this test would
    // report a false positive.
    const embedded = text.match(/^(?:([a-z_][a-z0-9_]*)\s*:\s*)?([a-z_][a-z0-9_]*)\s*(?:!\w+)?\s*\(([\s\S]*)\)$/i);
    if (embedded) {
      const nestedTable = embedded[2];
      // Recurse: an embedded resource may itself contain embedded resources,
      // as `price_observations!inner(commodity_id, commodities(name))` does.
      out.push(...parseSelectList(embedded[3], nestedTable));
      continue;
    }

    // `alias:column` — a plain renamed column of the outer table.
    const renamed = text.match(/^[a-z_][a-z0-9_]*\s*:\s*([a-z_][a-z0-9_]*)$/i);
    const column = renamed ? renamed[1] : text;
    if (/^[a-z_][a-z0-9_]*$/i.test(column)) out.push({ table: outerTable, column });
  }
  return out;
}

/** The `.from('x').select('...')` pairs in a source file. */
function extractSelects(source: string): Array<{ table: string; column: string; line: number }> {
  const out: Array<{ table: string; column: string; line: number }> = [];
  // `.from('table')` — only literal tables; a variable table name is skipped.
  const fromRe = /\.from\(\s*'([a-z_][a-z0-9_]*)'\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = fromRe.exec(source)) !== null) {
    const table = match[1];
    const at = match.index + match[0].length;
    // The select must follow before the query is executed. Bound the lookahead
    // at the next `.from(` so a multi-line builder is not merged with the
    // following query.
    const rest = source.slice(at);
    const nextFrom = rest.search(/\.from\(/);
    const window = nextFrom === -1 ? rest.slice(0, 600) : rest.slice(0, Math.min(nextFrom, 600));
    const selectMatch = window.match(/\.select\(\s*(['"`])([\s\S]*?)\1/);
    if (!selectMatch) continue;
    const line = source.slice(0, match.index).split('\n').length;
    for (const { table: owner, column } of parseSelectList(selectMatch[2], table)) {
      out.push({ table: owner, column, line });
    }
  }
  return out;
}

/**
 * The columns a query filters, orders or ranges on.
 *
 * A select is not the only place a column name can drift. `.eq('is_active', …)`
 * on a table with no `is_active` fails the query exactly as a bad select does,
 * and it fails just as silently — which is how `getFieldGrades()` came to
 * return nothing. Only the first argument of each filter is a column; the
 * second is a value.
 */
function extractFilters(source: string): Array<{ table: string; column: string; line: number }> {
  const out: Array<{ table: string; column: string; line: number }> = [];
  const fromRe = /\.from\(\s*'([a-z_][a-z0-9_]*)'\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = fromRe.exec(source)) !== null) {
    const table = match[1];
    const at = match.index + match[0].length;
    const rest = source.slice(at);
    const nextFrom = rest.search(/\.from\(/);
    const window = nextFrom === -1 ? rest.slice(0, 600) : rest.slice(0, Math.min(nextFrom, 600));
    const line = source.slice(0, match.index).split('\n').length;

    const filterRe = /\.(eq|neq|gt|gte|lt|lte|like|ilike|is|in|order)\(\s*'([a-z_][a-z0-9_]*)'/g;
    let f: RegExpExecArray | null;
    while ((f = filterRe.exec(window)) !== null) {
      out.push({ table, column: f[2], line });
    }
  }
  return out;
}

let columnsByTable: Map<string, Set<string>> | null = null;
let dbUnavailable: string | null = null;

beforeAll(async () => {
  const { SUPABASE_DB_HOST, SUPABASE_DB_PORT, SUPABASE_DB_USER, SUPABASE_DB_PASSWORD, SUPABASE_DB_NAME } =
    process.env;
  if (!SUPABASE_DB_HOST || !SUPABASE_DB_USER || !SUPABASE_DB_PASSWORD || !SUPABASE_DB_NAME) {
    dbUnavailable = 'SUPABASE_DB_* environment variables are not set';
    return;
  }
  const client = new Client({
    host: SUPABASE_DB_HOST,
    port: Number(SUPABASE_DB_PORT ?? 5432),
    user: SUPABASE_DB_USER,
    password: SUPABASE_DB_PASSWORD,
    database: SUPABASE_DB_NAME,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    const result = await client.query(
      `select table_name, column_name
         from information_schema.columns
        where table_schema = 'public'
        order by table_name, ordinal_position`,
    );
    columnsByTable = new Map();
    for (const row of result.rows) {
      if (!columnsByTable.has(row.table_name)) columnsByTable.set(row.table_name, new Set());
      columnsByTable.get(row.table_name)!.add(row.column_name);
    }
  } catch (error) {
    dbUnavailable = error instanceof Error ? error.message : String(error);
  } finally {
    await client.end().catch(() => {});
  }
});

describe('schema drift', () => {
  it('is checked against the live database, or skipped with a reason', () => {
    if (dbUnavailable) {
      console.warn(`[schema-drift] SKIPPED: ${dbUnavailable}`);
      return;
    }
    expect(columnsByTable).not.toBeNull();
    expect(columnsByTable!.size).toBeGreaterThan(20);
  });

  it('never selects a column that does not exist', () => {
    if (dbUnavailable) {
      console.warn(`[schema-drift] SKIPPED: ${dbUnavailable}`);
      return;
    }

    const files = [...walk(join(ROOT, 'src'), ['.ts', '.tsx']), ...walk(join(ROOT, 'scripts'), ['.ts', '.mjs'])];

    const collect = (
      pick: (source: string) => Array<{ table: string; column: string; line: number }>,
    ) => {
      const offenders: string[] = [];
      let checked = 0;
      for (const file of files) {
        const source = readFileSync(file, 'utf8');
        for (const { table, column, line } of pick(source)) {
          const tableColumns = columnsByTable!.get(table);
          if (!tableColumns) continue;
          checked += 1;
          if (!tableColumns.has(column)) {
            offenders.push(
              `${file.replace(`${ROOT}/`, '')}:${line} uses "${table}.${column}" — the column does not exist`,
            );
          }
        }
      }
      return { offenders, checked };
    };

    const selects = collect(extractSelects);
    const filters = collect(extractFilters);

    expect(selects.offenders, `\n${selects.offenders.join('\n')}\n`).toEqual([]);
    expect(filters.offenders, `\n${filters.offenders.join('\n')}\n`).toEqual([]);
    // Guard against the extractors silently finding nothing.
    expect(selects.checked).toBeGreaterThan(100);
    expect(filters.checked).toBeGreaterThan(100);
  });
});
