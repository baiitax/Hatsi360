'use client';

/**
 * Hatsi360 Field — the offline queue.
 *
 * The agent is often in a market with no signal. The queue holds what has
 * been typed but not yet sent, keeps one idempotency key per price, and
 * reports the truth about each item: a price is "queued" until the server
 * has confirmed it, and it is never described as submitted before that
 * confirmation arrives.
 *
 * The queue is per-agent and per-device. It holds the values the agent
 * typed and the keys needed to send them — nothing else. No token, no
 * session cookie and no credential is written to storage.
 *
 * This module owns the storage and the arithmetic. The browser-side
 * behaviour — rehydration on reload, background retry, the online/offline
 * listeners — lives in `useFieldQueue`, which is a hook and therefore cannot
 * be imported from a server component.
 */

export type QueueState = 'queued' | 'sending' | 'synced' | 'failed';

export interface QueuedPrice {
  /** The idempotency key. The server uses it to refuse a duplicate. */
  idempotencyKey: string;
  /** The observation id the server gave back, once the price was saved. */
  observationId?: string;
  commodityId: number;
  commodityName: string;
  marketId: number;
  amount: number;
  unitId: number;
  unitName: string;
  priceType: string;
  gradeId?: number | null;
  collectedAt: string;
  notes?: string | null;
  availability?: string | null;
  supplyLevel?: string | null;
  demandLevel?: string | null;
  priceDirection?: string | null;
  marketActivity?: string | null;
  sentiment?: string | null;
  developments?: string | null;
  state: QueueState;
  attempts: number;
  lastError?: string;
  updatedAt: string;
}

/** Evidence the agent attached but could not upload yet. */
export interface QueuedEvidence {
  /** The idempotency key of the price this file belongs to. */
  idempotencyKey: string;
  fileName: string;
  contentType: string;
  byteSize: number;
  /** A data URL of the file, held only until it is uploaded or discarded. */
  dataUrl: string;
  caption?: string | null;
  state: 'queued' | 'sending' | 'synced' | 'failed';
  attempts: number;
  lastError?: string;
  updatedAt: string;
}

const STORAGE_KEY = 'hatsi360.field.queue.v1';
const EVIDENCE_KEY = 'hatsi360.field.evidence.v1';
const DRAFT_KEY = 'hatsi360.field.draft.v1';

/**
 * How long to wait before the next retry, in milliseconds.
 *
 * The first retry is immediate, because a dropped connection usually comes
 * back in a second or two. After that the wait doubles, so a phone that is
 * genuinely out of range does not spend its battery hammering a dead server.
 * The cap keeps a long outage from turning into a twenty-minute wait.
 */
export const RETRY_DELAYS_MS = [0, 2_000, 8_000, 30_000, 120_000];
export const MAX_ATTEMPTS = RETRY_DELAYS_MS.length;

/** The delay before the next attempt at the given attempt count. */
export function retryDelayFor(attempts: number): number {
  const index = Math.min(Math.max(attempts, 0), RETRY_DELAYS_MS.length - 1);
  return RETRY_DELAYS_MS[index];
}

/** Whether an item has run out of attempts and needs the agent's attention. */
export function hasExhaustedAttempts(item: { attempts: number }): boolean {
  return item.attempts >= MAX_ATTEMPTS;
}

/**
 * A stable key for one price.
 *
 * It is generated on the device, before anything is sent, and it never
 * changes. That is what makes a retry safe: the same key always resolves to
 * the same price, so a request that was received but whose reply was lost
 * cannot produce a second price.
 */
export function newIdempotencyKey(): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return `field-${random}`;
}

/** An event the queue fires whenever its contents change, so that a second
 * component looking at the same queue does not show a stale count. */
export const QUEUE_CHANGED_EVENT = 'hatsi360:field-queue-changed';

function announce(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(QUEUE_CHANGED_EVENT));
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // A full or unavailable storage must not break the collection flow. The
    // price is still on screen and can be sent again.
  }
  announce();
}

function loadQueue(): QueuedPrice[] {
  const items = readJson<QueuedPrice[]>(STORAGE_KEY, []);
  return Array.isArray(items) ? items : [];
}

function writeQueue(items: QueuedPrice[]): void {
  writeJson(STORAGE_KEY, items);
}

/** Every price waiting on the server, for this agent's markets. */
export function readQueue(): QueuedPrice[] {
  return loadQueue();
}

/** Add or replace a price in the queue. */
export function upsertQueueItem(item: QueuedPrice): void {
  const items = loadQueue();
  const index = items.findIndex((entry) => entry.idempotencyKey === item.idempotencyKey);
  if (index >= 0) items[index] = item;
  else items.push(item);
  writeQueue(items);
}

/**
 * Move a price to a new state.
 *
 * `synced` is a removal, not a state: the server has confirmed the price, so
 * it is no longer waiting on anything and it leaves the queue. Keeping it
 * would grow storage without bound and would leave a row the agent could
 * still "retry", which would be a duplicate. The observation id it was given
 * is not lost — it is on the server, and the interface reads it from there.
 */
export function setQueueState(
  idempotencyKey: string,
  state: QueueState,
  extra: { error?: string; observationId?: string } = {},
): void {
  if (state === 'synced') {
    clearQueueItem(idempotencyKey);
    return;
  }

  const items = loadQueue();
  const index = items.findIndex((entry) => entry.idempotencyKey === idempotencyKey);
  if (index < 0) return;
  items[index] = {
    ...items[index],
    state,
    lastError: extra.error,
    observationId: extra.observationId ?? items[index].observationId,
    attempts: state === 'sending' ? items[index].attempts + 1 : items[index].attempts,
    updatedAt: new Date().toISOString(),
  };
  writeQueue(items);
}

/**
 * Take the next item that still needs sending.
 *
 * Items that have run out of attempts are skipped: retrying them in a tight
 * loop would waste the battery and could duplicate work. They stay in the
 * queue, visible to the agent, until they are retried deliberately.
 */
export function nextQueuedItem(): QueuedPrice | null {
  return (
    loadQueue().find(
      (item) =>
        (item.state === 'queued' || item.state === 'failed') &&
        !hasExhaustedAttempts(item),
    ) ?? null
  );
}

/** Remove a price that the server has confirmed. */
export function clearQueueItem(idempotencyKey: string): void {
  writeQueue(loadQueue().filter((entry) => entry.idempotencyKey !== idempotencyKey));
}

/**
 * How many prices are still waiting on the server.
 *
 * A confirmed price has left the queue, so this is simply the length of what
 * is stored. It is never zero for a price the office has not confirmed.
 */
export function pendingQueueCount(): number {
  return loadQueue().length;
}

/* --------------------------------------------------- the evidence queue --- */

export function readEvidenceQueue(): QueuedEvidence[] {
  const items = readJson<QueuedEvidence[]>(EVIDENCE_KEY, []);
  return Array.isArray(items) ? items : [];
}

export function upsertEvidenceItem(item: QueuedEvidence): void {
  const items = readEvidenceQueue();
  const index = items.findIndex((entry) => entry.idempotencyKey === item.idempotencyKey);
  if (index >= 0) items[index] = item;
  else items.push(item);
  writeJson(EVIDENCE_KEY, items);
}

export function setEvidenceState(
  idempotencyKey: string,
  state: QueuedEvidence['state'],
  extra: { error?: string } = {},
): void {
  const items = readEvidenceQueue();
  const index = items.findIndex((entry) => entry.idempotencyKey === idempotencyKey);
  if (index < 0) return;
  items[index] = {
    ...items[index],
    state,
    lastError: extra.error,
    attempts: state === 'sending' ? items[index].attempts + 1 : items[index].attempts,
    updatedAt: new Date().toISOString(),
  };
  writeJson(EVIDENCE_KEY, items);
}

export function clearEvidenceItem(idempotencyKey: string): void {
  writeJson(
    EVIDENCE_KEY,
    readEvidenceQueue().filter((entry) => entry.idempotencyKey !== idempotencyKey),
  );
}

/** Evidence still waiting on the server, oldest first. */
export function nextEvidenceItem(): QueuedEvidence | null {
  return (
    readEvidenceQueue().find(
      (item) =>
        (item.state === 'queued' || item.state === 'failed') &&
        !hasExhaustedAttempts(item),
    ) ?? null
  );
}

export function pendingEvidenceCount(): number {
  return readEvidenceQueue().filter((item) => item.state !== 'synced').length;
}

/* ------------------------------------------------- the unsent form draft -- */

export interface LocalDraft {
  batchId: number;
  marketId: number;
  commodityId: string;
  priceType: string;
  amount: string;
  unitId: string;
  gradeId: string;
  collectedAt: string;
  notes: string;
  availability: string;
  supplyLevel: string;
  demandLevel: string;
  priceDirection: string;
  marketActivity: string;
  sentiment: string;
  developments: string;
  idempotencyKey: string;
}

/**
 * The form the agent is filling in right now.
 *
 * It is kept on the device so that a lost connection, a backgrounded browser
 * or an accidental navigation does not lose what was typed. It is never
 * described as a saved price until the server has confirmed it.
 */
export function readLocalDraft(batchId: number): LocalDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalDraft;
    return parsed.batchId === batchId ? parsed : null;
  } catch {
    return null;
  }
}

export function writeLocalDraft(draft: LocalDraft): void {
  writeJson(DRAFT_KEY, draft);
}

export function clearLocalDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Ignore.
  }
}

/**
 * Whether the browser currently believes it is online.
 *
 * The app never uses this to claim a price was sent. It is used only to
 * explain to the agent why the queue is filling up.
 */
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine !== false;
}
