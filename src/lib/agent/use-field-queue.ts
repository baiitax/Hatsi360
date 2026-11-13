'use client';

/**
 * Hatsi360 Field — the queue as the browser sees it.
 *
 * The storage module in `offline-queue.ts` is deliberately plain: it reads
 * and writes localStorage and does the arithmetic. This hook is the part
 * that lives in a browser, and it answers three questions the brief asks:
 *
 *   1. **Does the queue survive a reload?** It is read from storage on mount,
 *      so an agent who backgrounds the app, loses the tab or reboots the
 *      phone comes back to the same queue, with the same idempotency keys.
 *
 *   2. **Does anything retry?** When the browser reports that it is online
 *      and there is something queued, the hook sends the oldest item, waits
 *      for the server's answer, and only then moves to the next one. One at
 *      a time, in order, so a session's prices arrive in the order they were
 *      collected.
 *
 *   3. **What does the agent see?** The truth. A price is "waiting" until
 *      the server confirms it. `synced` means the server said so, and only
 *      then does the item leave the queue. There is no state in which the
 *      app says a price is submitted when it is not.
 *
 * The hook never stores a credential and never touches the auth session. It
 * calls the server action it is given, which runs with the agent's own
 * cookies, exactly as a form submission would.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  QUEUE_CHANGED_EVENT,
  clearQueueItem,
  hasExhaustedAttempts,
  isOnline,
  nextQueuedItem,
  readQueue,
  retryDelayFor,
  setQueueState,
  upsertQueueItem,
  type QueuedPrice,
} from '@/lib/agent/offline-queue';

/** What the server said about one send. */
export interface SendOutcome {
  ok: boolean;
  message: string;
  observationId?: string;
}

/** How to send one queued price. The caller supplies the server action. */
export type SendPrice = (item: QueuedPrice) => Promise<SendOutcome>;

export interface FieldQueue {
  /** Every item in the queue, oldest first. */
  items: QueuedPrice[];
  /** Items still waiting on the server, in any state. */
  pending: QueuedPrice[];
  /** Items that have run out of attempts and need the agent. */
  stuck: QueuedPrice[];
  /** Whether the browser believes it is online. */
  online: boolean;
  /** Whether the hook is currently trying to send something. */
  syncing: boolean;
  /** The last thing the server said, for the banner. */
  lastResult: SendOutcome | null;
  /** Put an item in the queue, or update it in place. */
  enqueue: (item: QueuedPrice) => void;
  /** Send one item now, ignoring the schedule. Returns what the server said. */
  retryNow: (idempotencyKey: string) => Promise<SendOutcome | null>;
  /** Forget an item the agent has given up on. */
  discard: (idempotencyKey: string) => void;
}

export function useFieldQueue(send: SendPrice): FieldQueue {
  const [items, setItems] = useState<QueuedPrice[]>([]);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SendOutcome | null>(null);

  // The sender is held in a ref so that a new render — which creates a new
  // `send` closure — does not restart a sync that is already in flight.
  const sendRef = useRef(send);
  sendRef.current = send;

  // The timer for the next retry, so it can be cancelled on unmount.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runningRef = useRef(false);

  /** Re-read storage and publish it. */
  const refresh = useCallback(() => {
    setItems(readQueue());
  }, []);

  // Rehydrate on mount. This is the whole point of the module: the queue is
  // real after a reload, not an empty array waiting to be filled by a failed
  // request.
  useEffect(() => {
    setOnline(isOnline());
    refresh();

    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener(QUEUE_CHANGED_EVENT, refresh);
    window.addEventListener('storage', refresh);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener(QUEUE_CHANGED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [refresh]);

  const enqueue = useCallback((item: QueuedPrice) => {
    upsertQueueItem(item);
  }, []);

  const discard = useCallback((idempotencyKey: string) => {
    clearQueueItem(idempotencyKey);
  }, []);

  /**
   * Send one item and record what the server said.
   *
   * The state moves to `sending` before the request and stays there until the
   * answer arrives, so the interface can show "sending" without claiming the
   * price has been saved. On success the item leaves the queue — that is the
   * moment it stops being a local claim and becomes a server record.
   */
  const sendOne = useCallback(async (item: QueuedPrice): Promise<SendOutcome> => {
    setQueueState(item.idempotencyKey, 'sending');
    refresh();

    let outcome: SendOutcome;
    try {
      outcome = await sendRef.current(item);
    } catch (error) {
      outcome = {
        ok: false,
        message:
          error instanceof Error
            ? `Could not reach the server: ${error.message}`
            : 'Could not reach the server.',
      };
    }

    if (outcome.ok) {
      clearQueueItem(item.idempotencyKey);
    } else {
      setQueueState(item.idempotencyKey, 'failed', { error: outcome.message });
    }
    refresh();
    setLastResult(outcome);
    return outcome;
  }, [refresh]);

  const retryNow = useCallback(
    async (idempotencyKey: string) => {
      const item = readQueue().find((entry) => entry.idempotencyKey === idempotencyKey);
      if (!item) return null;
      return sendOne(item);
    },
    [sendOne],
  );

  /**
   * The background loop.
   *
   * It runs while there is something to send and the browser is online. It
   * takes the oldest eligible item, sends it, waits, and repeats. When the
   * browser goes offline it stops and leaves everything queued — nothing is
   * marked as sent, because nothing was.
   */
  useEffect(() => {
    if (!online) return;

    let cancelled = false;

    const pump = async () => {
      if (cancelled || runningRef.current) return;
      runningRef.current = true;
      setSyncing(true);

      try {
        while (!cancelled) {
          if (!isOnline()) break;
          const next = nextQueuedItem();
          if (!next) break;
          await sendOne(next);
        }
      } finally {
        runningRef.current = false;
        if (!cancelled) setSyncing(false);
      }
    };

    // Give a freshly mounted queue a moment so a session that is only being
    // rendered does not immediately fire a request.
    const startDelay = items.some((item) => item.state === 'queued') ? 0 : 250;
    const start = setTimeout(pump, startDelay);

    return () => {
      cancelled = true;
      clearTimeout(start);
    };
  }, [items, online, sendOne]);

  /**
   * The retry timer for a single failed item.
   *
   * A failed item is retried after its backoff. The delay is read from the
   * queue module, so the schedule is one number in one place rather than a
   * literal in the component.
   */
  useEffect(() => {
    if (!online) return;
    const failed = items.find((item) => item.state === 'failed' && !hasExhaustedAttempts(item));
    if (!failed) return;

    const delay = retryDelayFor(failed.attempts);
    if (delay <= 0) return;

    const timer = setTimeout(() => {
      if (isOnline()) void sendOne(failed);
    }, delay);

    return () => clearTimeout(timer);
  }, [items, online, sendOne]);

  // Cancel any pending timer on unmount.
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const pending = items.filter((item) => item.state !== 'synced');
  const stuck = items.filter((item) => hasExhaustedAttempts(item));

  return {
    items,
    pending,
    stuck,
    online,
    syncing,
    lastResult,
    enqueue,
    retryNow,
    discard,
  };
}
