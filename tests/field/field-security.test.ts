import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();

/**
 * Field security tests.
 *
 * The brief is specific about what an agent must not be able to do: assign
 * themselves to a market, change their role, approve a price, publish a
 * price, reach another agent's drafts or evidence, or see a service-role
 * key. These tests read the actual application and migration source and
 * check those rules are in force.
 */

function walk(directory: string, extensions: string[]): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue;
      found.push(...walk(full, extensions));
    } else if (extensions.some((extension) => entry.endsWith(extension))) {
      found.push(full);
    }
  }
  return found;
}

/* ------------------------------------------------------------- the secrets -- */

describe('the field app and the secrets', () => {
  it('never puts a service-role key in code that reaches the browser', () => {
    const files = [
      ...walk(join(ROOT, 'src', 'components'), ['.tsx', '.ts']),
      ...walk(join(ROOT, 'src', 'app', 'agent'), ['.tsx', '.ts']),
      ...walk(join(ROOT, 'src', 'lib', 'agent'), ['.ts', '.tsx']),
    ];

    const offenders = files.filter((file) => {
      const source = readFileSync(file, 'utf8');
      return (
        source.includes('SUPABASE_SERVICE_ROLE') ||
        source.includes('service_role_key') ||
        /createClient\([^)]*service/i.test(source)
      );
    });

    expect(offenders.map((file) => relative(ROOT, file))).toEqual([]);
  });

  it('keeps the server-only marker on the field data layer', () => {
    const source = readFileSync(join(ROOT, 'src', 'lib', 'operations', 'field.ts'), 'utf8');
    expect(source.startsWith("import 'server-only'")).toBe(true);
  });

  it('keeps the shared vocabulary free of server imports', () => {
    const source = readFileSync(
      join(ROOT, 'src', 'lib', 'operations', 'field-constants.ts'),
      'utf8',
    );
    // The word may appear in the explanation, but the module must not
    // import it or anything else from the server.
    expect(source).not.toMatch(/^import .*'server-only'/m);
    expect(source).not.toContain('@/lib/supabase');
    expect(source).not.toContain('@/lib/operations/field');
  });
});

/* --------------------------------------------------------------- the guard -- */

describe('the field guard', () => {
  const layout = readFileSync(join(ROOT, 'src', 'app', 'agent', 'layout.tsx'), 'utf8');

  it('checks the role on the server before anything renders', () => {
    expect(layout).toContain('requireAgent');
    expect(layout).toContain("profile.role !== 'agent'");
    expect(layout).toContain('redirect(');
  });

  it('runs every field action through the agent guard', () => {
    const source = readFileSync(
      join(ROOT, 'src', 'lib', 'operations', 'field-actions.ts'),
      'utf8',
    );
    const actions = [
      'saveFieldDraft',
      'submitFieldPrice',
      'resubmitFieldObservation',
      'uploadFieldEvidence',
      'removeFieldEvidence',
      'markFieldNotificationsRead',
      'updateFieldProfile',
      'openFieldSession',
      'addFieldObservation',
      'submitFieldDraft',
      'removeFieldDraft',
      'closeFieldSession',
    ];
    for (const action of actions) {
      const index = source.indexOf(`export async function ${action}`);
      expect(index, `${action} must exist`).toBeGreaterThan(-1);
      const body = source.slice(index, index + 2200);
      expect(body, `${action} must check the caller`).toContain('requireAgent');
    }
  });
});

/* ------------------------------------------------------------ the evidence -- */

describe('the evidence', () => {
  const migration = readFileSync(
    join(ROOT, 'supabase', 'migrations', '0019_field_evidence_and_corrections.sql'),
    'utf8',
  );

  it('keeps the evidence bucket private', () => {
    expect(migration).toContain('hatsi360-evidence');
    expect(migration).toMatch(/insert into storage\.buckets[^;]*public, /s);
    expect(migration).toMatch(/values\s*\([^)]*'hatsi360-evidence'\s*,\s*false/s);
  });

  it('gives the agent and the reviewer a signed link rather than a public one', () => {
    expect(migration).toContain('create_signed_url');
    expect(migration).toContain('hatsi360-evidence');
  });

  it('lets an agent read only their own evidence', () => {
    const policy = migration.slice(migration.indexOf('create policy evidence_storage_select'));
    expect(policy.slice(0, 900)).toContain('auth.uid()');
  });
});

/* ------------------------------------------------------------ the workflow -- */

describe('the workflow the field app relies on', () => {
  const resubmit = readFileSync(
    join(ROOT, 'supabase', 'migrations', '0019_field_evidence_and_corrections.sql'),
    'utf8',
  );

  it('keeps the reviewed record when a correction is made', () => {
    expect(resubmit).toContain('price_revision_history');
    expect(resubmit).toContain('supersedes');
  });

  it('never lets an agent approve or publish', () => {
    const functions = readFileSync(
      join(ROOT, 'supabase', 'migrations', '0011_operations_functions.sql'),
      'utf8',
    );
    const approve = functions.slice(
      functions.indexOf('create or replace function public.approve_observation'),
    );
    expect(approve.slice(0, 2000)).toMatch(/is_staff|verification_officer|is_admin/);
    expect(approve.slice(0, 2000)).toMatch(/raise exception/);
  });

  it('narrows the agent update policy so a submitted price is not editable', () => {
    const narrow = readFileSync(
      join(ROOT, 'supabase', 'migrations', '0019_field_evidence_and_corrections.sql'),
      'utf8',
    );
    const policy = narrow.slice(narrow.indexOf('create policy price_observations_agent_update'));
    expect(policy.slice(0, 900)).toContain("verification_status in ('draft', 'correction_requested')");
  });
});

/* -------------------------------------------------------------- the drafts -- */

describe('the drafts', () => {
  const submit = readFileSync(
    join(ROOT, 'supabase', 'migrations', '0020_field_draft_submission.sql'),
    'utf8',
  );

  it('submits a draft in place rather than creating a second row', () => {
    expect(submit).toContain('p_observation_id');
    expect(submit).toContain('update public.price_observations');
    // The new-record branch still exists, but it must come after the draft
    // branch, so a draft is never re-inserted.
    expect(submit.indexOf('if p_observation_id is not null')).toBeLessThan(
      submit.indexOf('insert into public.price_observations'),
    );
  });

  it('refuses a submission based on a version the agent never saw', () => {
    expect(submit).toContain('expected_updated_at');
    expect(submit).toContain('serialization_failure');
  });

  it('refuses to submit another agent\'s draft', () => {
    expect(submit).toContain("That observation does not belong to you.");
  });

  it('keeps the idempotency key', () => {
    expect(submit).toContain('where submission_key = p_idempotency_key');
  });
});

/* ------------------------------------------------------------- the session -- */

describe('the collection session', () => {
  const session = readFileSync(
    join(ROOT, 'supabase', 'migrations', '0021_field_collection_session.sql'),
    'utf8',
  );

  it('opens a session only at a market the agent covers', () => {
    expect(session).toContain('is_assigned_to_market');
  });

  it('refuses to open a session for somebody else\'s task', () => {
    expect(session).toContain('That collection task is not assigned to you.');
  });

  it('does not let an agent delete a session that holds observations', () => {
    expect(session).toContain('not exists');
    expect(session).toContain('collection_batches_no_delete');
  });

  it('writes only the two permitted profile fields', () => {
    const block = session.slice(session.indexOf('create or replace function public.update_agent_contact'));
    expect(block).toContain('full_name');
    expect(block).toContain('alternate_phone');
    expect(block).not.toContain('role =');
    expect(block).not.toContain('account_status');
  });
});

/* -------------------------------------------------- the visit coordinate --- */

describe('the optional visit coordinate', () => {
  const coordinate = readFileSync(
    join(ROOT, 'supabase', 'migrations', '0022_field_visit_coordinates.sql'),
    'utf8',
  );

  it('adds the coordinate columns without touching any existing one', () => {
    expect(coordinate).toContain('add column if not exists gps_latitude');
    expect(coordinate).toContain('add column if not exists gps_longitude');
    // Additive only: no drop, no rename, no rewrite of history. The
    // statements themselves are checked, not the comment that explains how to
    // revert the migration.
    const statements = coordinate
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n');
    expect(statements).not.toContain('drop column');
    expect(statements).not.toContain('drop table');
    expect(statements).not.toContain('rename to');
  });

  it('keeps the four-argument signature the existing callers use', () => {
    expect(coordinate).toContain(
      'grant execute on function public.open_collection_batch(bigint, bigint, text, text) to authenticated;',
    );
  });

  it('adds the six-argument form without making a four-arg call ambiguous', () => {
    // A defaulted trailing parameter would make every four-argument call
    // ambiguous between the two signatures.
    const marker = '-- ------------------------------------------------- open with a coordinate ---';
    const sixArg = coordinate.slice(coordinate.indexOf(marker));
    expect(sixArg).toContain('p_latitude     numeric,');
    expect(sixArg).toContain('p_longitude    numeric');
    expect(sixArg).not.toContain('p_latitude     numeric default null,');
    expect(sixArg).not.toContain('p_longitude    numeric default null,');
  });

  it('drops an out-of-range coordinate instead of storing it', () => {
    expect(coordinate).toContain('between -90 and 90');
    expect(coordinate).toContain('between -180 and 180');
  });

  it('carries the coordinate onto the visit record when the session closes', () => {
    const close = coordinate.slice(
      coordinate.indexOf('create or replace function public.close_collection_batch'),
    );
    expect(close).toContain('gps_latitude, gps_longitude');
    expect(close).toContain('v_batch.gps_latitude');
  });

  it('is sent by the client only when the agent confirmed one', () => {
    const form = readFileSync(
      join(ROOT, 'src', 'components', 'agent', 'NewCollectionForm.tsx'),
      'utf8',
    );
    const submit = form.slice(form.indexOf('const onSubmit'), form.indexOf('return ('));
    expect(submit).toContain("formData.set('latitude'");
    expect(submit).toContain("formData.set('longitude'");
    // Guarded by the position existing — an empty string would be a claim.
    expect(submit).toContain('if (location) {');
  });
});
