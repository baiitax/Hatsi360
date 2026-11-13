// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  newIdempotencyKey,
  upsertQueueItem,
  setQueueState,
  clearQueueItem,
  readQueue,
  pendingQueueCount,
  writeLocalDraft,
  readLocalDraft,
  clearLocalDraft,
  type QueuedPrice,
} from '@/lib/agent/offline-queue';
import {
  FIELD_PRICE_TYPES,
  priceTypeLabel,
  verificationLabel,
  taskStatusLabel,
} from '@/lib/operations/field-constants';

const ROOT = process.cwd();

/**
 * Field application tests.
 *
 * The brief sets out rules the field app has to keep: a five-item bottom
 * navigation, one observation per commodity, no premature "submitted"
 * claims, an idempotency key per price, and no admin navigation in the
 * agent's hands. These tests hold the implementation to them.
 */

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

/* ------------------------------------------------------------ navigation -- */

describe('the field navigation', () => {
  const layout = readFileSync(join(ROOT, 'src', 'app', 'agent', 'layout.tsx'), 'utf8');

  it('offers exactly five primary destinations', () => {
    const navBlock = layout.slice(layout.indexOf('const NAV'), layout.indexOf('];', layout.indexOf('const NAV')));
    const hrefs = [...navBlock.matchAll(/href: '([^']+)'/g)].map((match) => match[1]);
    expect(hrefs).toHaveLength(5);
    expect(hrefs).toEqual([
      '/agent/home',
      '/agent/assignments',
      '/agent/collection/new',
      '/agent/history',
      '/agent/profile',
    ]);
  });

  it('never shows the admin navigation to an agent', () => {
    expect(layout).not.toContain("href: '/admin");
    expect(layout).not.toContain('/admin/');
  });

  it('keeps the shell a single column with a thumb-reachable bottom bar', () => {
    const shell = readFileSync(join(ROOT, 'src', 'components', 'agent', 'AgentShell.tsx'), 'utf8');
    expect(shell).toContain('fixed inset-x-0 bottom-0');
    expect(shell).toContain('max-w-lg');
    expect(shell).toContain('grid-cols-5');
  });
});

/* --------------------------------------------------------- the vocabulary -- */

describe('the field vocabulary', () => {
  it('names every price type the agent may record', () => {
    const values = FIELD_PRICE_TYPES.map((type) => type.value);
    expect(values).toContain('wholesale_transaction');
    expect(values).toContain('farmgate');
    expect(values).toContain('retail');
    expect(values).toContain('indicative');
  });

  it('never calls a submitted price approved', () => {
    expect(verificationLabel('submitted')).not.toBe(verificationLabel('verified'));
    expect(verificationLabel('pending_verification')).toBe('Awaiting review');
    expect(verificationLabel('verified')).toBe('Approved');
    expect(verificationLabel('draft')).toBe('Draft');
  });

  it('gives an unknown status a readable name rather than a raw key', () => {
    expect(taskStatusLabel('something_new')).toBe('something new');
    expect(priceTypeLabel('not_a_type')).toBe('not a type');
  });
});

/* -------------------------------------------------------- the offline queue -- */

describe('the offline queue', () => {
  function sample(key: string): QueuedPrice {
    return {
      idempotencyKey: key,
      commodityId: 1,
      commodityName: 'Maize',
      marketId: 2,
      amount: 40000,
      unitId: 3,
      unitName: '50 kg bag',
      priceType: 'wholesale_transaction',
      collectedAt: new Date().toISOString(),
      state: 'queued',
      attempts: 0,
      updatedAt: new Date().toISOString(),
    };
  }

  it('gives every price its own idempotency key', () => {
    const keys = new Set(Array.from({ length: 50 }, () => newIdempotencyKey()));
    expect(keys.size).toBe(50);
    for (const key of keys) {
      expect(key.length).toBeGreaterThanOrEqual(8);
    }
  });

  it('keeps a price in the queue until the server confirms it', () => {
    upsertQueueItem(sample('key-a'));
    expect(pendingQueueCount()).toBe(1);

    setQueueState('key-a', 'sending');
    expect(pendingQueueCount()).toBe(1);

    setQueueState('key-a', 'failed', { error: 'No signal' });
    expect(pendingQueueCount()).toBe(1);
    expect(readQueue()[0].state).toBe('failed');
    expect(readQueue()[0].lastError).toBe('No signal');
  });

  it('removes a price only once the server has confirmed it', () => {
    upsertQueueItem(sample('key-b'));
    setQueueState('key-b', 'synced', { observationId: 'obs-1' });
    clearQueueItem('key-b');
    expect(pendingQueueCount()).toBe(0);
    expect(readQueue()).toHaveLength(0);
  });

  it('never stores a credential in the queue', () => {
    upsertQueueItem(sample('key-c'));
    const raw = window.localStorage.getItem('hatsi360.field.queue.v1') ?? '';
    expect(raw).not.toMatch(/token|password|secret|refresh_token|access_token/i);
    expect(raw).not.toMatch(/eyJ[A-Za-z0-9_-]{10,}/);
  });

  it('replaces a queued price rather than duplicating it', () => {
    upsertQueueItem(sample('key-d'));
    upsertQueueItem({ ...sample('key-d'), amount: 41000 });
    expect(readQueue()).toHaveLength(1);
    expect(readQueue()[0].amount).toBe(41000);
  });
});

/* ------------------------------------------------------- the local draft -- */

describe('the unsent form draft', () => {
  const draft = {
    batchId: 7,
    marketId: 2,
    commodityId: '1',
    priceType: 'wholesale_transaction',
    amount: '40000',
    unitId: '3',
    gradeId: '',
    collectedAt: '2026-10-22T09:00',
    notes: '',
    availability: '',
    supplyLevel: '',
    demandLevel: '',
    priceDirection: '',
    marketActivity: '',
    sentiment: '',
    developments: '',
    idempotencyKey: 'key-e',
  };

  it('keeps what the agent typed when the session is reopened', () => {
    writeLocalDraft(draft);
    expect(readLocalDraft(7)?.amount).toBe('40000');
    expect(readLocalDraft(7)?.idempotencyKey).toBe('key-e');
  });

  it('does not carry a draft across sessions', () => {
    writeLocalDraft(draft);
    expect(readLocalDraft(8)).toBeNull();
  });

  it('is cleared once the price is recorded', () => {
    writeLocalDraft(draft);
    clearLocalDraft();
    expect(readLocalDraft(7)).toBeNull();
  });
});

/* ------------------------------------------------ the collection contract -- */

describe('the collection flow', () => {
  const session = readFileSync(
    join(ROOT, 'src', 'components', 'agent', 'CollectionSession.tsx'),
    'utf8',
  );

  it('records each commodity as its own observation', () => {
    // The form carries one commodity, one unit and one price type at a time.
    expect(session).toContain('commodityId');
    expect(session).toContain('priceType');
    expect(session).toContain('unitId');

    const actions = readFileSync(
      join(ROOT, 'src', 'lib', 'operations', 'field-actions.ts'),
      'utf8',
    );
    expect(actions).toContain('reported_unit_id');
    expect(actions).toContain('reported_amount');
  });

  it('does not offer a price without a unit', () => {
    expect(session).toContain('Choose the unit it was quoted in');
  });

  it('says plainly that a draft has not been submitted', () => {
    expect(session).toContain('It is not sent for review');
    expect(session).toContain('sent for review');

    const actions = readFileSync(
      join(ROOT, 'src', 'lib', 'operations', 'field-actions.ts'),
      'utf8',
    );
    expect(actions).toContain('It has not been submitted for review');
  });

  it('does not claim a queued price is submitted', () => {
    expect(session).toContain('not yet sent');
    expect(session).toContain('They are not with the office yet');
  });

  it('separates the market intelligence from the price', () => {
    const actions = readFileSync(
      join(ROOT, 'src', 'lib', 'operations', 'field-actions.ts'),
      'utf8',
    );
    // The intelligence is written to its own table, not into the price row.
    expect(actions).toContain("from('observation_market_intelligence')");
    expect(actions).toContain('The price is the important part.');
  });

  it('records the market intelligence beside the price in the database', () => {
    const migration = readFileSync(
      join(ROOT, 'supabase', 'migrations', '0021_field_collection_session.sql'),
      'utf8',
    );
    expect(migration).toContain('create table if not exists public.observation_market_intelligence');
    expect(migration).toContain('references public.price_observations (id) on delete cascade');
  });
});

/* ------------------------------------------------------ the workflow rules -- */

describe('the workflow rules', () => {
  const actions = readFileSync(
    join(ROOT, 'src', 'lib', 'operations', 'field-actions.ts'),
    'utf8',
  );

  it('does not let an agent delete a price that has been submitted', () => {
    expect(actions).toContain('A price that has been submitted cannot be removed.');
    expect(actions).toContain(".eq('verification_status', 'draft')");
  });

  it('sends the idempotency key with every submission', () => {
    expect(actions).toContain('p_idempotency_key');
  });

  it('reports a conflict instead of overwriting the server copy', () => {
    expect(actions).toContain('changed on the server');
    expect(actions).toContain('expected_updated_at');
  });

  it('writes the agent details through a function, not a table write', () => {
    expect(actions).toContain("rpc('update_agent_contact'");
    expect(actions).not.toContain(".from('agent_profiles')\n      .update(");
  });
});
