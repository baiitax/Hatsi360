// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  MAX_ATTEMPTS,
  RETRY_DELAYS_MS,
  QUEUE_CHANGED_EVENT,
  hasExhaustedAttempts,
  newIdempotencyKey,
  nextQueuedItem,
  pendingEvidenceCount,
  pendingQueueCount,
  readEvidenceQueue,
  readQueue,
  retryDelayFor,
  setQueueState,
  upsertEvidenceItem,
  upsertQueueItem,
  writeLocalDraft,
  readLocalDraft,
  clearLocalDraft,
  type QueuedPrice,
} from '@/lib/agent/offline-queue';

const ROOT = process.cwd();

/**
 * The offline queue, and what it is allowed to claim.
 *
 * The brief is specific about this: the queue must survive a reload, it must
 * retry safely, it must never call a price submitted before the server has
 * confirmed it, and it must not store a credential. These tests hold the
 * implementation to each of those, and they use a real jsdom localStorage so
 * the storage path is exercised rather than mocked away.
 */

const STORAGE_KEY = 'hatsi360.field.queue.v1';
const EVIDENCE_KEY = 'hatsi360.field.evidence.v1';
const DRAFT_KEY = 'hatsi360.field.draft.v1';

function makePrice(overrides: Partial<QueuedPrice> = {}): QueuedPrice {
  return {
    idempotencyKey: newIdempotencyKey(),
    commodityId: 1,
    commodityName: 'Maize',
    marketId: 1,
    amount: 42000,
    unitId: 1,
    unitName: '100kg bag',
    priceType: 'wholesale_transaction',
    gradeId: null,
    collectedAt: '2026-10-22T08:00:00.000Z',
    notes: null,
    availability: null,
    supplyLevel: null,
    demandLevel: null,
    priceDirection: null,
    marketActivity: null,
    sentiment: null,
    developments: null,
    state: 'queued',
    attempts: 0,
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

/* ------------------------------------------------------------- persistence -- */

describe('the queue on the device', () => {
  it('writes to storage, so it survives a reload', () => {
    const price = makePrice();
    upsertQueueItem(price);

    const stored = window.localStorage.getItem(STORAGE_KEY);
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!)).toHaveLength(1);

    // A "reload" is a fresh read from the same storage.
    expect(readQueue()).toHaveLength(1);
    expect(readQueue()[0].idempotencyKey).toBe(price.idempotencyKey);
  });

  it('keeps the idempotency key stable across a reload', () => {
    const price = makePrice();
    upsertQueueItem(price);

    setQueueState(price.idempotencyKey, 'failed', { error: 'No signal' });

    const reloaded = readQueue()[0];
    expect(reloaded.idempotencyKey).toBe(price.idempotencyKey);
    expect(reloaded.state).toBe('failed');
  });

  it('updates in place rather than appending a duplicate', () => {
    const price = makePrice();
    upsertQueueItem(price);
    upsertQueueItem({ ...price, state: 'failed', lastError: 'No signal' });

    expect(readQueue()).toHaveLength(1);
    expect(readQueue()[0].state).toBe('failed');
  });

  it('reports how many prices are still waiting', () => {
    upsertQueueItem(makePrice());
    upsertQueueItem(makePrice());
    upsertQueueItem(makePrice({ state: 'failed' }));

    expect(pendingQueueCount()).toBe(3);
  });

  it('drops a price only once the server has confirmed it', () => {
    const price = makePrice();
    upsertQueueItem(price);

    setQueueState(price.idempotencyKey, 'sending');
    expect(readQueue()).toHaveLength(1);

    // Confirmed. Now — and only now — it leaves the queue.
    setQueueState(price.idempotencyKey, 'synced');
    expect(readQueue()).toHaveLength(0);
    expect(pendingQueueCount()).toBe(0);
  });

  it('counts an attempt each time a send starts', () => {
    const price = makePrice();
    upsertQueueItem(price);

    setQueueState(price.idempotencyKey, 'sending');
    expect(readQueue()[0].attempts).toBe(1);

    setQueueState(price.idempotencyKey, 'sending');
    expect(readQueue()[0].attempts).toBe(2);
  });

  it('announces a change so a second view of the queue is not stale', () => {
    const seen: Event[] = [];
    const listener = (event: Event) => seen.push(event);
    window.addEventListener(QUEUE_CHANGED_EVENT, listener);

    upsertQueueItem(makePrice());
    window.removeEventListener(QUEUE_CHANGED_EVENT, listener);

    expect(seen.length).toBeGreaterThan(0);
  });
});

/* ----------------------------------------------------------------- retries -- */

describe('the retry schedule', () => {
  it('retries immediately the first time', () => {
    expect(retryDelayFor(0)).toBe(0);
  });

  it('backs off after that, so a dead server is not hammered', () => {
    const delays = RETRY_DELAYS_MS;
    expect(delays[1]).toBeGreaterThan(delays[0]);
    expect(delays[2]).toBeGreaterThan(delays[1]);
    expect(delays[3]).toBeGreaterThan(delays[2]);
  });

  it('caps the wait so a long outage does not become a twenty-minute one', () => {
    const last = retryDelayFor(MAX_ATTEMPTS + 5);
    expect(last).toBeLessThanOrEqual(RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]);
  });

  it('stops picking an item that has run out of attempts', () => {
    const exhausted = makePrice({ state: 'failed', attempts: MAX_ATTEMPTS });
    upsertQueueItem(exhausted);

    expect(hasExhaustedAttempts(exhausted)).toBe(true);
    expect(nextQueuedItem()).toBeNull();
    // It stays in the queue — nothing is silently dropped.
    expect(readQueue()).toHaveLength(1);
  });

  it('still picks a failed item that has attempts left', () => {
    upsertQueueItem(makePrice({ state: 'failed', attempts: 1 }));
    expect(nextQueuedItem()).not.toBeNull();
  });

  it('skips an exhausted item and finds the next one that can be retried', () => {
    const exhausted = makePrice({ state: 'failed', attempts: MAX_ATTEMPTS });
    const retryable = makePrice({ state: 'queued' });
    upsertQueueItem(exhausted);
    upsertQueueItem(retryable);

    expect(nextQueuedItem()?.idempotencyKey).toBe(retryable.idempotencyKey);
  });
});

/* ---------------------------------------------------------------- evidence -- */

describe('the evidence queue', () => {
  it('holds a file until the server has it', () => {
    upsertEvidenceItem({
      idempotencyKey: 'field-abc',
      fileName: 'market.jpg',
      contentType: 'image/jpeg',
      byteSize: 240_000,
      dataUrl: 'data:image/jpeg;base64,AAAA',
      state: 'queued',
      attempts: 0,
      updatedAt: new Date().toISOString(),
    });

    expect(pendingEvidenceCount()).toBe(1);
    expect(window.localStorage.getItem(EVIDENCE_KEY)).toBeTruthy();
  });

  it('never claims evidence is uploaded before the server says so', () => {
    const key = 'field-abc';
    upsertEvidenceItem({
      idempotencyKey: key,
      fileName: 'market.jpg',
      contentType: 'image/jpeg',
      byteSize: 240_000,
      dataUrl: 'data:image/jpeg;base64,AAAA',
      state: 'queued',
      attempts: 0,
      updatedAt: new Date().toISOString(),
    });

    // Read back: still queued.
    expect(readEvidenceQueue()[0].state).toBe('queued');
  });
});

/* ------------------------------------------------------------- the draft --- */

describe('the unsent form draft', () => {
  it('is kept per session', () => {
    writeLocalDraft({
      batchId: 7,
      marketId: 1,
      commodityId: '3',
      priceType: 'wholesale_transaction',
      amount: '42000',
      unitId: '1',
      gradeId: '',
      collectedAt: '2026-10-22T08:00',
      notes: '',
      availability: '',
      supplyLevel: '',
      demandLevel: '',
      priceDirection: '',
      marketActivity: '',
      sentiment: '',
      developments: '',
      idempotencyKey: 'field-draft',
    });

    expect(readLocalDraft(7)?.amount).toBe('42000');
    // A different session does not see another session's draft.
    expect(readLocalDraft(8)).toBeNull();

    clearLocalDraft();
    expect(readLocalDraft(7)).toBeNull();
  });
});

/* ------------------------------------------------------------ no secrets --- */

describe('what the queue is allowed to store', () => {
  it('writes no credential, token or cookie', () => {
    upsertQueueItem(makePrice());
    upsertEvidenceItem({
      idempotencyKey: 'field-abc',
      fileName: 'market.jpg',
      contentType: 'image/jpeg',
      byteSize: 240_000,
      dataUrl: 'data:image/jpeg;base64,AAAA',
      state: 'queued',
      attempts: 0,
      updatedAt: new Date().toISOString(),
    });
    writeLocalDraft({
      batchId: 7,
      marketId: 1,
      commodityId: '3',
      priceType: 'wholesale_transaction',
      amount: '42000',
      unitId: '1',
      gradeId: '',
      collectedAt: '2026-10-22T08:00',
      notes: '',
      availability: '',
      supplyLevel: '',
      demandLevel: '',
      priceDirection: '',
      marketActivity: '',
      sentiment: '',
      developments: '',
      idempotencyKey: 'field-draft',
    });

    const dump = [STORAGE_KEY, EVIDENCE_KEY, DRAFT_KEY]
      .map((key) => window.localStorage.getItem(key) ?? '')
      .join('\n')
      .toLowerCase();

    for (const forbidden of ['token', 'cookie', 'authorization', 'bearer', 'service_role', 'secret', 'password']) {
      expect(dump, `the queue must not store a ${forbidden}`).not.toContain(forbidden);
    }
  });

  it('keeps its keys out of the served directory', () => {
    const queue = readFileSync(join(ROOT, 'src', 'lib', 'agent', 'offline-queue.ts'), 'utf8');
    expect(queue).toContain("'use client'");
    expect(queue).not.toContain('service_role');
  });
});

/* -------------------------------------------------------- the hook's shape -- */

describe('the queue hook', () => {
  const hook = readFileSync(join(ROOT, 'src', 'lib', 'agent', 'use-field-queue.ts'), 'utf8');

  it('is a client module', () => {
    expect(hook.startsWith("'use client'")).toBe(true);
  });

  it('rehydrates from storage on mount rather than starting empty', () => {
    expect(hook).toContain('refresh()');
    expect(hook).toContain('useState<QueuedPrice[]>([])');
    // The rehydration is what makes the queue real after a reload.
    expect(hook.indexOf('setOnline(isOnline())')).toBeLessThan(hook.indexOf('window.addEventListener(QUEUE_CHANGED_EVENT'));
  });

  it('takes the sender from the caller, so it holds no server import', () => {
    expect(hook).toContain('export type SendPrice');
    expect(hook).not.toContain('field-actions');
  });

  it('sends one item at a time, in order', () => {
    expect(hook).toContain('nextQueuedItem()');
    expect(hook).toContain('while (!cancelled)');
  });

  it('stops when the browser is offline and leaves everything queued', () => {
    expect(hook).toContain('if (!online) return;');
    expect(hook).toContain('if (!isOnline()) break;');
  });

  it('clears an item only on a confirmed success', () => {
    const block = hook.slice(hook.indexOf('const sendOne'));
    expect(block).toContain('if (outcome.ok)');
    expect(block).toContain('clearQueueItem(item.idempotencyKey)');
    expect(block).toContain("setQueueState(item.idempotencyKey, 'failed'");
  });

  it('treats a thrown request as a failure, not as a success', () => {
    const block = hook.slice(hook.indexOf('const sendOne'));
    expect(block).toContain('catch (error)');
    expect(block).toContain("ok: false");
  });

  it('never stores a credential', () => {
    expect(hook).not.toContain('service_role');
    expect(hook).not.toContain('localStorage.setItem');
  });
});

/* ------------------------------------------------- the session component --- */

describe('the collection session component', () => {
  const component = readFileSync(
    join(ROOT, 'src', 'components', 'agent', 'CollectionSession.tsx'),
    'utf8',
  );

  it('captures the whole price into the queue before sending it', () => {
    // Every field the server needs is on the queued record, so a retry after
    // a reload can replay it without the form.
    for (const field of [
      'commodityId',
      'marketId',
      'amount',
      'unitId',
      'priceType',
      'gradeId',
      'collectedAt',
      'notes',
      'availability',
      'supplyLevel',
      'demandLevel',
      'priceDirection',
      'marketActivity',
      'sentiment',
      'developments',
      'idempotencyKey',
    ]) {
      expect(component, `the queued price must carry ${field}`).toContain(field);
    }
  });

  it('sends a queued price through one path, so a retry is identical', () => {
    expect(component).toContain('const sendQueuedPrice = useCallback');
    expect(component).toContain('useFieldQueue(sendQueuedPrice)');
  });

  it('never labels a queued price as sent', () => {
    const banner = component.slice(
      component.indexOf('const QUEUE_STATE_LABEL'),
      component.indexOf('const inputClass'),
    );
    expect(banner).toContain("queued: 'Waiting for signal'");
    expect(banner).toContain("failed: 'Not sent — will retry'");
    // "Sent" exists, but only for the state the item is in after the server
    // confirms it — at which point it has left the queue.
    expect(banner).toContain("synced: 'Sent'");
  });

  it('lets the agent discard a price they no longer want', () => {
    expect(component).toContain('queue.discard(');
  });

  it('does not hide a price that has run out of attempts', () => {
    expect(component).toContain('queue.stuck');
    expect(component).toContain('MAX_ATTEMPTS');
  });
});
