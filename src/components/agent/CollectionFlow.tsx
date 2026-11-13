'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HatsiSpinner } from '@/components/loading/HatsiActionLoader';

/**
 * The guided collection flow.
 *
 * Six steps, in the order an agent actually works:
 *
 *   1. the market      2. the commodity     3. the price type and unit
 *   4. the amount      5. when and a note   6. check and submit
 *
 * Three properties matter in the field:
 *
 *   * It keeps the answer from the last step, so collecting several
 *     commodities at one market is a matter of typing one number.
 *   * It keeps a draft on the device, so a closed browser does not lose work.
 *   * It queues a failed submission and retries it with the same
 *     idempotency key, so a dropped connection cannot lose a price or
 *     duplicate one.
 */

export interface AgentMarketOption {
  id: number;
  name: string;
  stateName: string | null;
}

export interface AgentCommodityOption {
  id: number;
  name: string;
  inScope: boolean;
}

export interface AgentUnitOption {
  id: number;
  code: string;
  name: string;
  isSpecific: boolean;
}

export interface CollectionTaskOption {
  id: number;
  marketId: number;
  marketName: string;
  commodityIds: number[];
  commodityNames: string[];
  status: string;
}

const PRICE_TYPES = [
  { value: 'wholesale_transaction', label: 'Wholesale trade price' },
  { value: 'wholesale_asking', label: 'Wholesale asking price' },
  { value: 'farmgate', label: 'Farmgate price' },
  { value: 'retail', label: 'Retail price' },
  { value: 'processor_procurement', label: 'Processor price' },
  { value: 'export_buy', label: 'Exporter buying offer' },
  { value: 'export_sell', label: 'Exporter selling offer' },
  { value: 'indicative', label: 'Indicative estimate' },
];

const DRAFT_KEY = 'pluck-live.collection-draft';
const QUEUE_KEY = 'pluck-live.pending-submissions';

interface CollectionState {
  marketId: number | null;
  commodityId: number | null;
  priceType: string;
  unitId: number | null;
  amount: string;
  packageWeightKg: string;
  packageCount: string;
  collectedAt: string;
  notes: string;
  taskId: number | null;
  idempotencyKey: string;
}

const EMPTY: CollectionState = {
  marketId: null,
  commodityId: null,
  priceType: 'wholesale_transaction',
  unitId: null,
  amount: '',
  packageWeightKg: '',
  packageCount: '',
  collectedAt: '',
  notes: '',
  taskId: null,
  idempotencyKey: '',
};

function newKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `pl-${crypto.randomUUID()}`;
  }
  return `pl-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function nowLocalInput(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function readQueue(): CollectionState[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as CollectionState[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: CollectionState[]): void {
  try {
    // An empty queue removes the key rather than storing "[]", so the device
    // is not left carrying a record of nothing.
    if (queue.length === 0) {
      window.localStorage.removeItem(QUEUE_KEY);
      return;
    }
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // A device with no storage available still works, it just cannot queue.
  }
}

export function CollectionFlow({
  markets,
  commodities,
  units,
  tasks,
  initialMarketId = null,
}: {
  markets: AgentMarketOption[];
  commodities: AgentCommodityOption[];
  units: AgentUnitOption[];
  tasks: CollectionTaskOption[];
  /** Pre-selects a market the agent was assigned to. */
  initialMarketId?: number | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [state, setState] = useState<CollectionState>(EMPTY);
  const [queueLength, setQueueLength] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [restored, setRestored] = useState(false);

  // Restore the draft and the pending queue from the device.
  useEffect(() => {
    setQueueLength(readQueue().length);
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as CollectionState;
        const restored: CollectionState = {
          ...draft,
          idempotencyKey: draft.idempotencyKey || newKey(),
        };
        // A market pre-selected by the caller only fills an empty draft.
        if (!restored.marketId && initialMarketId) restored.marketId = initialMarketId;
        setState(restored);
        setRestored(true);
      } else {
        setState((current) => ({
          ...current,
          marketId: current.marketId ?? initialMarketId,
          idempotencyKey: newKey(),
          collectedAt: nowLocalInput(),
        }));
        if (initialMarketId) setStep(2);
      }
    } catch {
      setState((current) => ({
        ...current,
        marketId: current.marketId ?? initialMarketId,
        idempotencyKey: newKey(),
        collectedAt: nowLocalInput(),
      }));
      if (initialMarketId) setStep(2);
    }
  }, [initialMarketId]);

  // Keep the draft on the device as the agent types.
  useEffect(() => {
    if (!state.idempotencyKey) return;
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
    } catch {
      // Ignore: the device may have no storage.
    }
  }, [state]);

  const market = useMemo(
    () => markets.find((option) => option.id === state.marketId) ?? null,
    [markets, state.marketId],
  );

  const scopedCommodities = useMemo(() => {
    if (!state.marketId) return commodities;
    const task = tasks.find((option) => option.id === state.taskId);
    if (task && task.commodityIds.length > 0) {
      return commodities.filter((commodity) => task.commodityIds.includes(commodity.id));
    }
    const inScope = commodities.filter((commodity) => commodity.inScope);
    return inScope.length > 0 ? inScope : commodities;
  }, [commodities, state.marketId, state.taskId, tasks]);

  const commodity = useMemo(
    () => commodities.find((option) => option.id === state.commodityId) ?? null,
    [commodities, state.commodityId],
  );

  const unit = useMemo(
    () => units.find((option) => option.id === state.unitId) ?? null,
    [units, state.unitId],
  );

  const taskForMarket = tasks.filter(
    (task) => task.marketId === state.marketId && !['completed', 'cancelled'].includes(task.status),
  );

  const update = (patch: Partial<CollectionState>) => {
    setState((current) => ({ ...current, ...patch }));
    setMessage(null);
  };

  const canContinue = (): boolean => {
    switch (step) {
      case 1:
        return state.marketId !== null;
      case 2:
        return state.commodityId !== null;
      case 3:
        return state.unitId !== null && state.priceType !== '';
      case 4:
        return Number(state.amount) > 0;
      case 5:
        return state.collectedAt !== '';
      default:
        return true;
    }
  };

  const stepTitles = [
    'Market',
    'Commodity',
    'Price type and unit',
    'Price',
    'When and notes',
    'Check and submit',
  ];

  const submit = async (): Promise<boolean> => {
    setSubmitting(true);
    setMessage(null);

    const body = {
      marketId: state.marketId,
      commodityId: state.commodityId,
      priceType: state.priceType,
      amount: Number(state.amount),
      unitId: state.unitId,
      packageWeightKg: state.packageWeightKg ? Number(state.packageWeightKg) : null,
      packageCount: state.packageCount ? Number(state.packageCount) : null,
      collectedAt: state.collectedAt ? new Date(state.collectedAt).toISOString() : new Date().toISOString(),
      notes: state.notes || null,
      taskId: state.taskId,
      idempotencyKey: state.idempotencyKey,
    };

    try {
      const response = await fetch('/api/agent/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };

      if (!response.ok || !payload.ok) {
        const text = payload.message ?? 'The price could not be submitted.';
        // Keep it on the device: the agent must not lose the price.
        const queue = readQueue();
        queue.push(state);
        writeQueue(queue);
        setQueueLength(queue.length);
        setMessage({ ok: false, text: `${text} It is saved on this phone and will be sent again.` });
        return false;
      }

      try {
        window.localStorage.removeItem(DRAFT_KEY);
      } catch {
        // Ignore.
      }
      setMessage({ ok: true, text: 'Price submitted. It is now waiting for verification.' });
      router.refresh();
      return true;
    } catch {
      const queue = readQueue();
      queue.push(state);
      writeQueue(queue);
      setQueueLength(queue.length);
      setMessage({
        ok: false,
        text: 'There is no connection. The price is saved on this phone and will be sent again.',
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  /** Retry everything that is waiting on the device. */
  const retryQueue = async () => {
    const queue = readQueue();
    if (queue.length === 0) return;

    setSubmitting(true);
    const remaining: CollectionState[] = [];

    for (const entry of queue) {
      try {
        const response = await fetch('/api/agent/submit', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            marketId: entry.marketId,
            commodityId: entry.commodityId,
            priceType: entry.priceType,
            amount: Number(entry.amount),
            unitId: entry.unitId,
            packageWeightKg: entry.packageWeightKg ? Number(entry.packageWeightKg) : null,
            packageCount: entry.packageCount ? Number(entry.packageCount) : null,
            collectedAt: entry.collectedAt
              ? new Date(entry.collectedAt).toISOString()
              : new Date().toISOString(),
            notes: entry.notes || null,
            taskId: entry.taskId,
            idempotencyKey: entry.idempotencyKey,
          }),
        });
        if (!response.ok) remaining.push(entry);
      } catch {
        remaining.push(entry);
      }
    }

    writeQueue(remaining);
    setQueueLength(remaining.length);
    setSubmitting(false);
    setMessage(
      remaining.length === 0
        ? { ok: true, text: 'Every saved price has been sent.' }
        : {
            ok: false,
            text: `${remaining.length} price(s) still cannot be sent. They stay on this phone.`,
          },
    );
    if (remaining.length === 0) router.refresh();
  };

  /** Start the next commodity at the same market, keeping the unit and type. */
  const collectAnother = () => {
    setState({
      ...EMPTY,
      marketId: state.marketId,
      priceType: state.priceType,
      unitId: state.unitId,
      collectedAt: nowLocalInput(),
      idempotencyKey: newKey(),
      taskId: state.taskId,
    });
    setStep(2);
    setMessage({ ok: true, text: 'Ready for the next commodity at this market.' });
  };

  return (
    <div className="space-y-4">
      {queueLength > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-amber-900">
            {queueLength} price(s) waiting to be sent
          </p>
          <p className="mt-0.5 text-xs text-amber-800">
            They are saved on this phone. Nothing is lost.
          </p>
          <button
            type="button"
            onClick={retryQueue}
            disabled={submitting}
            aria-busy={submitting}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            {submitting ? (
              <>
                <HatsiSpinner />
                Sending…
              </>
            ) : (
              'Try sending again'
            )}
          </button>
        </div>
      ) : null}

      {restored ? (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-3 text-xs text-brand-900">
          A saved draft was found on this phone and restored.
        </div>
      ) : null}

      {message ? (
        <div
          role="status"
          className={`rounded-xl border p-3 text-sm font-medium ${
            message.ok
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          {message.text}
        </div>
      ) : null}

      {/* Progress */}
      <div>
        <div className="flex items-center justify-between text-xs font-semibold text-ink-600">
          <span>
            Step {step} of 6 — {stepTitles[step - 1]}
          </span>
          <span>{Math.round((step / 6) * 100)}%</span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-ink-200">
          <div
            className="h-full rounded-full bg-brand-600 transition-all"
            style={{ width: `${(step / 6) * 100}%` }}
          />
        </div>
      </div>

      <div className="card p-4">
        {step === 1 ? (
          <fieldset>
            <legend className="text-sm font-bold text-ink-900">Which market?</legend>
            <p className="mt-1 text-xs text-ink-500">Only the markets assigned to you are listed.</p>
            <div className="mt-3 space-y-2">
              {markets.map((option) => (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border px-3 py-3 ${
                    state.marketId === option.id
                      ? 'border-brand-600 bg-brand-50'
                      : 'border-ink-200 bg-white'
                  }`}
                >
                  <span>
                    <span className="block text-sm font-semibold text-ink-900">{option.name}</span>
                    {option.stateName ? (
                      <span className="block text-xs text-ink-500">{option.stateName}</span>
                    ) : null}
                  </span>
                  <input
                    type="radio"
                    name="market"
                    value={option.id}
                    checked={state.marketId === option.id}
                    onChange={() =>
                      update({ marketId: option.id, commodityId: null, taskId: null, unitId: null })
                    }
                    className="size-5"
                  />
                </label>
              ))}
              {markets.length === 0 ? (
                <p className="rounded-xl border border-dashed border-ink-200 p-4 text-center text-sm text-ink-500">
                  You have no market assigned yet. Contact your supervisor.
                </p>
              ) : null}
            </div>

            {taskForMarket.length > 0 ? (
              <div className="mt-4">
                <label htmlFor="task" className="mb-1 block text-xs font-semibold text-ink-700">
                  Attach to a task (optional)
                </label>
                <select
                  id="task"
                  value={state.taskId ?? ''}
                  onChange={(event) =>
                    update({ taskId: event.target.value ? Number(event.target.value) : null })
                  }
                  className="w-full rounded-xl border border-ink-200 bg-white px-3 py-3 text-sm outline-none focus:border-brand-500"
                >
                  <option value="">No task</option>
                  {taskForMarket.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.commodityNames.join(', ') || 'Market round'}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </fieldset>
        ) : null}

        {step === 2 ? (
          <fieldset>
            <legend className="text-sm font-bold text-ink-900">Which commodity?</legend>
            <p className="mt-1 text-xs text-ink-500">
              The commodities this market is expected to report are listed first.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {scopedCommodities.map((option) => (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-3 ${
                    state.commodityId === option.id
                      ? 'border-brand-600 bg-brand-50'
                      : 'border-ink-200 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="commodity"
                    value={option.id}
                    checked={state.commodityId === option.id}
                    onChange={() => update({ commodityId: option.id })}
                    className="size-5"
                  />
                  <span className="text-sm font-medium text-ink-900">{option.name}</span>
                </label>
              ))}
            </div>
            {scopedCommodities.length === 0 ? (
              <p className="mt-3 text-sm text-ink-500">
                No commodity is configured for this market. Go back and choose another market, or
                record the price without a task.
              </p>
            ) : null}
          </fieldset>
        ) : null}

        {step === 3 ? (
          <fieldset className="space-y-4">
            <legend className="text-sm font-bold text-ink-900">
              What kind of price is it, and in what unit?
            </legend>
            <div>
              <label htmlFor="priceType" className="mb-1 block text-xs font-semibold text-ink-700">
                Price type
              </label>
              <select
                id="priceType"
                value={state.priceType}
                onChange={(event) => update({ priceType: event.target.value })}
                className="w-full rounded-xl border border-ink-200 bg-white px-3 py-3 text-sm outline-none focus:border-brand-500"
              >
                {PRICE_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="unit" className="mb-1 block text-xs font-semibold text-ink-700">
                Unit
              </label>
              <select
                id="unit"
                value={state.unitId ?? ''}
                onChange={(event) =>
                  update({ unitId: event.target.value ? Number(event.target.value) : null })
                }
                className="w-full rounded-xl border border-ink-200 bg-white px-3 py-3 text-sm outline-none focus:border-brand-500"
              >
                <option value="">Choose a unit</option>
                {units.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name} ({option.code})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-ink-500">
                Prices in different units are never compared with each other. If the source did not
                state a unit, choose the unit that was used and say so in the notes.
              </p>
            </div>
          </fieldset>
        ) : null}

        {step === 4 ? (
          <fieldset className="space-y-4">
            <legend className="text-sm font-bold text-ink-900">How much?</legend>
            <div>
              <label htmlFor="amount" className="mb-1 block text-xs font-semibold text-ink-700">
                Price in {unit ? unit.name : 'the chosen unit'} (₦)
              </label>
              <input
                id="amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={state.amount}
                onChange={(event) => update({ amount: event.target.value })}
                className="w-full rounded-xl border border-ink-200 bg-white px-3 py-4 text-2xl font-bold tabular-nums outline-none focus:border-brand-500"
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="packageCount"
                  className="mb-1 block text-xs font-semibold text-ink-700"
                >
                  Number of bags (optional)
                </label>
                <input
                  id="packageCount"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={state.packageCount}
                  onChange={(event) => update({ packageCount: event.target.value })}
                  className="w-full rounded-xl border border-ink-200 bg-white px-3 py-3 text-sm outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label
                  htmlFor="packageWeightKg"
                  className="mb-1 block text-xs font-semibold text-ink-700"
                >
                  Weight of one bag in kg (optional)
                </label>
                <input
                  id="packageWeightKg"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  value={state.packageWeightKg}
                  onChange={(event) => update({ packageWeightKg: event.target.value })}
                  className="w-full rounded-xl border border-ink-200 bg-white px-3 py-3 text-sm outline-none focus:border-brand-500"
                />
                <p className="mt-1 text-[11px] text-ink-500">
                  Only fill this in if the weight was actually stated. A bag of maize is not a bag
                  of cocoa.
                </p>
              </div>
            </div>
          </fieldset>
        ) : null}

        {step === 5 ? (
          <fieldset className="space-y-4">
            <legend className="text-sm font-bold text-ink-900">When and anything to note</legend>
            <div>
              <label htmlFor="collectedAt" className="mb-1 block text-xs font-semibold text-ink-700">
                When did you collect it?
              </label>
              <input
                id="collectedAt"
                type="datetime-local"
                value={state.collectedAt}
                onChange={(event) => update({ collectedAt: event.target.value })}
                className="w-full rounded-xl border border-ink-200 bg-white px-3 py-3 text-sm outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label htmlFor="notes" className="mb-1 block text-xs font-semibold text-ink-700">
                Note for the reviewer (optional)
              </label>
              <textarea
                id="notes"
                rows={3}
                value={state.notes}
                onChange={(event) => update({ notes: event.target.value })}
                placeholder="Anything the reviewer should know."
                className="w-full rounded-xl border border-ink-200 bg-white px-3 py-3 text-sm outline-none focus:border-brand-500"
              />
            </div>
          </fieldset>
        ) : null}

        {step === 6 ? (
          <div>
            <h2 className="text-sm font-bold text-ink-900">Check and send</h2>
            <dl className="mt-3 divide-y divide-ink-100 rounded-xl border border-ink-200">
              {[
                ['Market', market?.name ?? '—'],
                ['Commodity', commodity?.name ?? '—'],
                [
                  'Price type',
                  PRICE_TYPES.find((option) => option.value === state.priceType)?.label ?? state.priceType,
                ],
                ['Unit', unit ? `${unit.name} (${unit.code})` : '—'],
                ['Price', state.amount ? `₦${state.amount}` : '—'],
                ['Bags', state.packageCount || '—'],
                ['Bag weight', state.packageWeightKg ? `${state.packageWeightKg} kg` : '—'],
                ['Collected', state.collectedAt ? state.collectedAt.replace('T', ' ') : '—'],
                ['Note', state.notes || '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4 px-3 py-2.5">
                  <dt className="text-xs font-medium text-ink-500">{label}</dt>
                  <dd className="text-right text-sm font-medium text-ink-900">{value}</dd>
                </div>
              ))}
            </dl>

            {unit && !unit.isSpecific ? (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                The unit you chose does not state a specific measure. The price will be published
                with an &ldquo;unit not recorded&rdquo; label, because a figure without a unit
                cannot be compared with one that has a unit.
              </p>
            ) : null}

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                aria-busy={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-4 text-base font-bold text-white disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <HatsiSpinner />
                    Sending…
                  </>
                ) : (
                  'Send for verification'
                )}
              </button>
              <button
                type="button"
                onClick={collectAnother}
                className="w-full rounded-xl border border-brand-200 bg-brand-50 px-5 py-3 text-sm font-semibold text-brand-800"
              >
                Collect another commodity here
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {step < 6 ? (
        <div className="flex gap-2">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((current) => current - 1)}
              className="rounded-xl border border-ink-200 bg-white px-5 py-3 text-sm font-semibold text-ink-700"
            >
              Back
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setStep((current) => current + 1)}
            disabled={!canContinue()}
            className="flex-1 rounded-xl bg-brand-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            Continue
          </button>
        </div>
      ) : null}
    </div>
  );
}
