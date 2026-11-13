'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  addFieldObservation,
  submitFieldDraft,
  removeFieldDraft,
  closeFieldSession,
  type FieldActionState,
} from '@/lib/operations/field-actions';
import {
  MAX_ATTEMPTS,
  newIdempotencyKey,
  upsertQueueItem,
  readLocalDraft,
  writeLocalDraft,
  clearLocalDraft,
  isOnline,
  type QueuedPrice,
} from '@/lib/agent/offline-queue';
import { useFieldQueue, type SendOutcome } from '@/lib/agent/use-field-queue';
import { FIELD_PRICE_TYPES } from '@/lib/operations/field-constants';
import { HatsiSpinner } from '@/components/loading/HatsiActionLoader';
import { EvidencePanel } from '@/components/agent/EvidencePanel';

interface CommodityOption {
  id: number;
  name: string;
  inScope: boolean;
}

interface UnitOption {
  id: number;
  code: string;
  name: string;
  isSpecific: boolean;
}

interface GradeOption {
  id: number;
  name: string;
  commodityId: number;
}

interface SessionObservation {
  id: string;
  commodityId: number;
  commodityName: string;
  gradeName: string | null;
  priceType: string;
  amount: number | null;
  unitName: string | null;
  currencyCode: string;
  collectedAt: string;
  submittedAt: string | null;
  verificationStatus: string;
  notes: string | null;
  qualityFlags: string[];
  evidenceCount: number;
  evidence: {
    id: number;
    fileName: string;
    caption: string | null;
    contentType: string;
    byteSize: number;
  }[];
  intelligence: {
    availability: string | null;
    supplyLevel: string | null;
    demandLevel: string | null;
    priceDirection: string | null;
    marketActivity: string | null;
    sentiment: string | null;
    developments: string | null;
  } | null;
}

const AVAILABILITY = [
  { value: '', label: 'Not recorded' },
  { value: 'scarce', label: 'Scarce' },
  { value: 'limited', label: 'Limited' },
  { value: 'adequate', label: 'Adequate' },
  { value: 'abundant', label: 'Abundant' },
  { value: 'surplus', label: 'Surplus' },
];

const LEVELS = [
  { value: '', label: 'Not recorded' },
  { value: 'very_low', label: 'Very low' },
  { value: 'low', label: 'Low' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'high', label: 'High' },
  { value: 'very_high', label: 'Very high' },
];

const DIRECTIONS = [
  { value: '', label: 'Not recorded' },
  { value: 'rising', label: 'Rising' },
  { value: 'stable', label: 'Stable' },
  { value: 'falling', label: 'Falling' },
  { value: 'volatile', label: 'Volatile' },
];

const SENTIMENTS = [
  { value: '', label: 'Not recorded' },
  { value: 'positive', label: 'Positive' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'negative', label: 'Negative' },
];

/**
 * How each queue state is described to the agent.
 *
 * The words matter. "Waiting" and "Sending" are both honest about a price
 * the office has not confirmed. "Sent" is reserved for the moment the server
 * says so — and at that moment the item leaves the queue, so it is never
 * shown in this list at all.
 */
const QUEUE_STATE_LABEL: Record<QueuedPrice['state'], string> = {
  queued: 'Waiting for signal',
  sending: 'Sending now',
  synced: 'Sent',
  failed: 'Not sent — will retry',
};

const inputClass =
  'mt-1 min-h-[48px] w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-base text-ink-900 focus:border-brand-500 focus:outline-none';
const labelClass = 'text-xs font-semibold text-ink-700';

/**
 * The collection session.
 *
 * One market visit, several commodities, one price each. Every price is kept
 * as its own observation with its own grade, unit and price type — the app
 * never merges two commodities into one number, because a price per bag of
 * maize and a price per kilogram of rice are not the same measurement.
 *
 * The flow has three states for a price, and they are kept apart:
 *   draft    — saved on the server, not sent for review
 *   queued   — typed here, waiting for a connection
 *   submitted — the server has confirmed it, and only then
 */
export function CollectionSession({
  batchId,
  marketId,
  marketName,
  completed,
  taskId,
  observations,
  expectedCommodities,
  commodities,
  units,
  grades,
  evidenceRequired,
}: {
  batchId: number;
  marketId: number;
  marketName: string;
  completed: boolean;
  taskId: number | null;
  observations: SessionObservation[];
  expectedCommodities: { id: number; name: string; collected: boolean }[];
  commodities: CommodityOption[];
  units: UnitOption[];
  grades: GradeOption[];
  evidenceRequired: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<FieldActionState>({ ok: false, message: '' });
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<'commodity' | 'price' | 'context'>('commodity');
  const [online, setOnline] = useState(true);

  const [commodityId, setCommodityId] = useState('');
  const [priceType, setPriceType] = useState('wholesale_transaction');
  const [amount, setAmount] = useState('');
  const [unitId, setUnitId] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [collectedAt, setCollectedAt] = useState(() => toLocalInput(new Date()));
  const [notes, setNotes] = useState('');
  const [availability, setAvailability] = useState('');
  const [supplyLevel, setSupplyLevel] = useState('');
  const [demandLevel, setDemandLevel] = useState('');
  const [priceDirection, setPriceDirection] = useState('');
  const [marketActivity, setMarketActivity] = useState('');
  const [sentiment, setSentiment] = useState('');
  const [developments, setDevelopments] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(() => newIdempotencyKey());

  /**
   * Send one queued price.
   *
   * This is the only place the component talks to the server for a queued
   * price, and it is passed to the queue hook rather than called directly, so
   * the same path serves the agent's own "Add" press and the background
   * retry after a reload. The idempotency key travels with the item, so a
   * request that was received but whose reply was lost cannot produce a
   * second price.
   */
  const sendQueuedPrice = useCallback(
    async (item: QueuedPrice): Promise<SendOutcome> => {
      const formData = new FormData();
      formData.set('batchId', String(batchId));
      formData.set('marketId', String(item.marketId));
      formData.set('commodityId', String(item.commodityId));
      formData.set('priceType', item.priceType);
      formData.set('amount', String(item.amount));
      formData.set('unitId', String(item.unitId));
      formData.set('gradeId', item.gradeId ? String(item.gradeId) : '');
      formData.set('collectedAt', item.collectedAt);
      formData.set('notes', item.notes ?? '');
      formData.set('taskId', taskId ? String(taskId) : '');
      formData.set('idempotencyKey', item.idempotencyKey);
      formData.set('availability', item.availability ?? '');
      formData.set('supplyLevel', item.supplyLevel ?? '');
      formData.set('demandLevel', item.demandLevel ?? '');
      formData.set('priceDirection', item.priceDirection ?? '');
      formData.set('marketActivity', item.marketActivity ?? '');
      formData.set('sentiment', item.sentiment ?? '');
      formData.set('developments', item.developments ?? '');

      const result = await addFieldObservation({ ok: false, message: '' }, formData);
      if (result.ok) router.refresh();
      return {
        ok: result.ok,
        message: result.message,
        observationId: result.observationId,
      };
    },
    [batchId, router, taskId],
  );

  // The queue is read on the device, so it can only be read in the browser.
  // `queue.pending` is what the agent sees, and it is rehydrated from storage
  // on mount rather than starting empty — a price typed before a reload is
  // still waiting, and still has the idempotency key it was typed with.
  const queue = useFieldQueue(sendQueuedPrice);
  const pendingQueue = queue.pending;
  useEffect(() => {
    setOnline(isOnline());
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Restore the form the agent was in the middle of.
  useEffect(() => {
    const draft = readLocalDraft(batchId);
    if (!draft) return;
    setCommodityId(draft.commodityId);
    setPriceType(draft.priceType);
    setAmount(draft.amount);
    setUnitId(draft.unitId);
    setGradeId(draft.gradeId);
    setCollectedAt(draft.collectedAt);
    setNotes(draft.notes);
    setAvailability(draft.availability);
    setSupplyLevel(draft.supplyLevel);
    setDemandLevel(draft.demandLevel);
    setPriceDirection(draft.priceDirection);
    setMarketActivity(draft.marketActivity);
    setSentiment(draft.sentiment);
    setDevelopments(draft.developments);
    setIdempotencyKey(draft.idempotencyKey);
    if (draft.commodityId) setStep('price');
  }, [batchId]);

  // Keep the form on the device as it changes.
  useEffect(() => {
    if (!commodityId && !amount) return;
    writeLocalDraft({
      batchId,
      marketId,
      commodityId,
      priceType,
      amount,
      unitId,
      gradeId,
      collectedAt,
      notes,
      availability,
      supplyLevel,
      demandLevel,
      priceDirection,
      marketActivity,
      sentiment,
      developments,
      idempotencyKey,
    });
  }, [
    batchId,
    marketId,
    commodityId,
    priceType,
    amount,
    unitId,
    gradeId,
    collectedAt,
    notes,
    availability,
    supplyLevel,
    demandLevel,
    priceDirection,
    marketActivity,
    sentiment,
    developments,
    idempotencyKey,
  ]);

  const commodityGrades = useMemo(
    () => grades.filter((grade) => String(grade.commodityId) === commodityId),
    [grades, commodityId],
  );

  const drafts = observations.filter((o) => o.verificationStatus === 'draft');
  const submitted = observations.filter((o) => o.verificationStatus !== 'draft');
  const collectedCommodityIds = new Set(observations.map((o) => o.commodityId));

  const resetForm = () => {
    setStep('commodity');
    setCommodityId('');
    setAmount('');
    setUnitId('');
    setGradeId('');
    setNotes('');
    setAvailability('');
    setSupplyLevel('');
    setDemandLevel('');
    setPriceDirection('');
    setMarketActivity('');
    setSentiment('');
    setDevelopments('');
    setCollectedAt(toLocalInput(new Date()));
    setIdempotencyKey(newIdempotencyKey());
    setState({ ok: false, message: '' });
    clearLocalDraft();
  };

  /**
   * Turn the form into a queued price.
   *
   * Everything the server needs is captured here, before anything is sent,
   * and written to the device. That is what makes the price replayable: the
   * background sync does not hold the form open, it holds this record. If the
   * request fails, the record is still on the device with its original
   * idempotency key, so the retry resolves to the same price.
   */
  const buildQueuedPrice = (values: {
    amount: string;
    unitId: string;
    gradeId: string;
    priceType: string;
    collectedAt: string;
    notes: string;
    commodityId: string;
    key: string;
  }): QueuedPrice => ({
    idempotencyKey: values.key,
    commodityId: Number(values.commodityId),
    commodityName:
      commodities.find((c) => String(c.id) === values.commodityId)?.name ?? 'Price',
    marketId,
    amount: Number(values.amount),
    unitId: Number(values.unitId),
    unitName: units.find((u) => String(u.id) === values.unitId)?.name ?? '',
    priceType: values.priceType,
    gradeId: values.gradeId ? Number(values.gradeId) : null,
    collectedAt: new Date(values.collectedAt).toISOString(),
    notes: values.notes || null,
    availability: availability || null,
    supplyLevel: supplyLevel || null,
    demandLevel: demandLevel || null,
    priceDirection: priceDirection || null,
    marketActivity: marketActivity || null,
    sentiment: sentiment || null,
    developments: developments || null,
    state: 'queued',
    attempts: 0,
    updatedAt: new Date().toISOString(),
  });

  /** Send one price. The server decides whether it was accepted. */
  const sendPrice = async (values: {
    amount: string;
    unitId: string;
    gradeId: string;
    priceType: string;
    collectedAt: string;
    notes: string;
    commodityId: string;
    key: string;
  }) => {
    // The price is written to the device first. Whether or not the request
    // succeeds, the record exists locally with a stable key.
    const item = buildQueuedPrice(values);
    upsertQueueItem(item);

    // Then it is sent. `retryNow` moves the item to `sending`, calls the
    // server, and either clears it (confirmed) or marks it failed (not
    // confirmed). It never marks it sent on the strength of a request.
    const outcome = await queue.retryNow(item.idempotencyKey);
    const result: FieldActionState = outcome
      ? { ok: outcome.ok, message: outcome.message }
      : { ok: false, message: 'That price is no longer in the queue.' };
    if (result.ok) {
      router.refresh();
      resetForm();
    }
    return result;
  };

  const onAdd = () => {
    startTransition(async () => {
      const result = await sendPrice({
        amount,
        unitId,
        gradeId,
        priceType,
        collectedAt,
        notes,
        commodityId,
        key: idempotencyKey,
      });
      if (result.ok) resetForm();
      else setState(result);
    });
  };
  const onSubmitDraft = (observation: SessionObservation) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set('observationId', observation.id);
      formData.set('amount', String(observation.amount ?? ''));
      formData.set('unitId', String(
        units.find((u) => u.name === observation.unitName)?.id ?? '',
      ));
      formData.set('marketId', String(marketId));
      formData.set('commodityId', String(observation.commodityId));
      formData.set('priceType', observation.priceType);
      formData.set('idempotencyKey', `draft-${observation.id}`);

      const result = await submitFieldDraft({ ok: false, message: '' }, formData);
      setState(result);
      if (result.ok) router.refresh();
    });
  };

  const onRemoveDraft = (observation: SessionObservation) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set('observationId', observation.id);
      const result = await removeFieldDraft({ ok: false, message: '' }, formData);
      setState(result);
      if (result.ok) router.refresh();
    });
  };

  const onClose = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set('batchId', String(batchId));
      const result = await closeFieldSession({ ok: false, message: '' }, formData);
      setState(result);
      if (result.ok) router.refresh();
    });
  };

  const amountError = state.fieldErrors?.amount;
  const unitError = state.fieldErrors?.unitId;

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------------ the progress */}
      <div className="rounded-xl border border-ink-200 bg-white p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-ink-900">{marketName}</p>
            <p className="mt-0.5 font-mono text-[11px] text-ink-500">
              Session {batchId} · {observations.length} price(s) recorded
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
              online ? 'bg-brand-50 text-brand-700' : 'bg-warning-50 text-warning-700'
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${online ? 'bg-brand-600' : 'bg-warning-500'}`}
              aria-hidden="true"
            />
            {online ? 'Online' : 'No signal'}
          </span>
        </div>

        {expectedCommodities.length > 0 ? (
          <div className="mt-2.5">
            <div className="flex items-center justify-between text-[11px] text-ink-500">
              <span>
                {expectedCommodities.filter((c) => c.collected).length} of{' '}
                {expectedCommodities.length} planned commodities recorded
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100">
              <div
                className="h-full rounded-full bg-brand-600"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(
                      (expectedCommodities.filter((c) => c.collected).length /
                        expectedCommodities.length) *
                        100,
                    ),
                  )}%`,
                }}
              />
            </div>
          </div>
        ) : null}
      </div>

      {!online ? (
        <div className="rounded-xl border border-warning-200 bg-warning-50 p-3">
          <p className="text-sm font-bold text-warning-700">No signal</p>
          <p className="mt-1 text-xs leading-relaxed text-warning-700">
            You can keep typing. What you enter is held on this phone and is sent when the
            signal returns. Nothing you type is described as submitted until the office confirms
            it.
          </p>
        </div>
      ) : null}

      {state.message ? (
        <div
          role="status"
          className={`rounded-xl border p-3 ${
            state.ok ? 'border-brand-200 bg-brand-50' : 'border-error-200 bg-error-50'
          }`}
        >
          <p
            className={`text-sm font-semibold ${
              state.ok ? 'text-brand-800' : 'text-error-700'
            }`}
          >
            {state.message}
          </p>
        </div>
      ) : null}

      {/* ------------------------------------------------------- the recorder */}
      {!completed ? (
        <section className="rounded-xl border border-ink-200 bg-white p-4">
          <h2 className="text-base font-bold text-ink-900">
            {step === 'commodity'
              ? 'Which commodity?'
              : step === 'price'
                ? 'What was the price?'
                : 'What did you see?'}
          </h2>

          {step === 'commodity' ? (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-ink-500">
                The commodities this market covers are listed first. You may record any commodity
                in the catalogue.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {commodities.map((commodity) => {
                  const done = collectedCommodityIds.has(commodity.id);
                  return (
                    <button
                      key={commodity.id}
                      type="button"
                      onClick={() => {
                        setCommodityId(String(commodity.id));
                        setGradeId('');
                        setStep('price');
                      }}
                      className={`flex min-h-[48px] items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm font-semibold ${
                        commodity.inScope
                          ? 'border-brand-300 bg-brand-50 text-brand-900'
                          : 'border-ink-200 bg-white text-ink-800'
                      }`}
                    >
                      <span className="min-w-0 truncate">{commodity.name}</span>
                      {done ? (
                        <span className="shrink-0 text-[11px] font-bold text-brand-700">
                          recorded
                        </span>
                      ) : commodity.inScope ? (
                        <span className="shrink-0 text-[11px] text-brand-600">in scope</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {step === 'price' ? (
            <div className="mt-3 space-y-4">
              <div className="rounded-lg bg-ink-50 px-3 py-2">
                <p className="text-xs text-ink-600">
                  {commodities.find((c) => String(c.id) === commodityId)?.name}
                </p>
                <button
                  type="button"
                  onClick={() => setStep('commodity')}
                  className="mt-0.5 text-[11px] font-bold text-brand-700 underline underline-offset-2"
                >
                  Change the commodity
                </button>
              </div>

              <label className="block">
                <span className={labelClass}>Price (₦)</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0"
                  aria-invalid={amountError ? true : undefined}
                  className={`${inputClass} text-2xl font-bold tabular-nums ${
                    amountError ? 'border-error-500' : ''
                  }`}
                />
                {amountError ? (
                  <span className="mt-1 block text-xs font-semibold text-error-700">
                    {amountError}
                  </span>
                ) : null}
              </label>

              <label className="block">
                <span className={labelClass}>Unit</span>
                <select
                  value={unitId}
                  onChange={(event) => setUnitId(event.target.value)}
                  aria-invalid={unitError ? true : undefined}
                  className={`${inputClass} ${unitError ? 'border-error-500' : ''}`}
                >
                  <option value="">Choose the unit it was quoted in</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} ({unit.code})
                    </option>
                  ))}
                </select>
                {unitError ? (
                  <span className="mt-1 block text-xs font-semibold text-error-700">{unitError}</span>
                ) : (
                  <span className="mt-1 block text-[11px] text-ink-500">
                    The price is recorded in the unit it was quoted in. The platform does not
                    convert between units for you.
                  </span>
                )}
              </label>

              <label className="block">
                <span className={labelClass}>Price type</span>
                <select
                  value={priceType}
                  onChange={(event) => setPriceType(event.target.value)}
                  className={inputClass}
                >
                  {FIELD_PRICE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>

              {commodityGrades.length > 0 ? (
                <label className="block">
                  <span className={labelClass}>Grade</span>
                  <select
                    value={gradeId}
                    onChange={(event) => setGradeId(event.target.value)}
                    className={inputClass}
                  >
                    <option value="">Not graded</option>
                    {commodityGrades.map((grade) => (
                      <option key={grade.id} value={grade.id}>
                        {grade.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="block">
                <span className={labelClass}>When did you collect it?</span>
                <input
                  type="datetime-local"
                  value={collectedAt}
                  onChange={(event) => setCollectedAt(event.target.value)}
                  className={inputClass}
                />
              </label>

              <label className="block">
                <span className={labelClass}>Notes (optional)</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={2}
                  placeholder="Anything a reviewer would want to know."
                  className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none"
                />
              </label>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setStep('context')}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 py-2 text-sm font-bold text-ink-800"
                >
                  Add market context
                </button>
                <button
                  type="button"
                  onClick={onAdd}
                  disabled={pending}
                  aria-busy={pending}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                >
                  {pending ? (
                    <>
                      <HatsiSpinner />
                      Saving…
                    </>
                  ) : (
                    'Add to session'
                  )}
                </button>
              </div>
              <p className="text-[11px] leading-relaxed text-ink-500">
                Adding to the session saves a draft on the server. It is not sent for review
                until you submit it.
              </p>
            </div>
          ) : null}

          {step === 'context' ? (
            <div className="mt-3 space-y-4">
              <p className="text-xs leading-relaxed text-ink-500">
                What you saw around the price. A reviewer uses this to judge whether the number
                makes sense.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className={labelClass}>Availability</span>
                  <select
                    value={availability}
                    onChange={(event) => setAvailability(event.target.value)}
                    className={inputClass}
                  >
                    {AVAILABILITY.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className={labelClass}>Supply</span>
                  <select
                    value={supplyLevel}
                    onChange={(event) => setSupplyLevel(event.target.value)}
                    className={inputClass}
                  >
                    {LEVELS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className={labelClass}>Demand</span>
                  <select
                    value={demandLevel}
                    onChange={(event) => setDemandLevel(event.target.value)}
                    className={inputClass}
                  >
                    {LEVELS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className={labelClass}>Price direction</span>
                  <select
                    value={priceDirection}
                    onChange={(event) => setPriceDirection(event.target.value)}
                    className={inputClass}
                  >
                    {DIRECTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className={labelClass}>Market activity</span>
                  <select
                    value={marketActivity}
                    onChange={(event) => setMarketActivity(event.target.value)}
                    className={inputClass}
                  >
                    {LEVELS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className={labelClass}>Sentiment</span>
                  <select
                    value={sentiment}
                    onChange={(event) => setSentiment(event.target.value)}
                    className={inputClass}
                  >
                    {SENTIMENTS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className={labelClass}>Developments (optional)</span>
                <textarea
                  value={developments}
                  onChange={(event) => setDevelopments(event.target.value)}
                  rows={3}
                  placeholder="What changed today — a road, a policy, a change in who is buying."
                  className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none"
                />
              </label>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setStep('price')}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 py-2 text-sm font-bold text-ink-800"
                >
                  Back to the price
                </button>
                <button
                  type="button"
                  onClick={onAdd}
                  disabled={pending}
                  aria-busy={pending}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                >
                  {pending ? (
                    <>
                      <HatsiSpinner />
                      Saving…
                    </>
                  ) : (
                    'Add to session'
                  )}
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* --------------------------------------------------- the queue */}
      {pendingQueue.length > 0 ? (
        <section className="rounded-xl border border-warning-200 bg-warning-50 p-3">
          <h2 className="text-sm font-bold text-warning-700">
            {pendingQueue.length} price(s) not yet sent
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-warning-700">
            These are held on this phone. They are not with the office yet, and
            nothing here counts as submitted until the server confirms it.
          </p>
          {queue.stuck.length > 0 ? (
            <p className="mt-2 rounded-lg bg-warning-200 p-2 text-[11px] leading-relaxed text-ink-900">
              {queue.stuck.length} price(s) have been tried{' '}
              {MAX_ATTEMPTS} times without an answer. They are still here and
              still unsent — press “Try again” when you have signal.
            </p>
          ) : null}
          <ul className="mt-2 space-y-2">
            {pendingQueue.map((item) => (
              <li key={item.idempotencyKey} className="rounded-lg bg-white p-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-900">{item.commodityName}</p>
                    <p className="text-xs tabular-nums text-ink-600">
                      ₦{item.amount.toLocaleString('en-NG')}
                      {item.unitName ? ` per ${item.unitName}` : ''}
                    </p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wide text-ink-500">
                      {QUEUE_STATE_LABEL[item.state]}
                      {item.attempts > 0 ? ` · attempt ${item.attempts}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-warning-50 px-2 py-0.5 text-[10px] font-bold uppercase text-warning-700">
                    {QUEUE_STATE_LABEL[item.state]}
                  </span>
                </div>
                {item.lastError ? (
                  <p className="mt-1 text-[11px] text-error-700">{item.lastError}</p>
                ) : null}
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      startTransition(async () => {
                        const outcome = await queue.retryNow(item.idempotencyKey);
                        if (outcome?.ok) {
                          setState({ ok: true, message: outcome.message });
                        } else if (outcome) {
                          setState({ ok: false, message: outcome.message });
                        }
                      })
                    }
                    disabled={pending || queue.syncing}
                    className="min-h-[44px] rounded-lg border border-ink-200 bg-white px-3 py-1 text-xs font-bold text-ink-800 disabled:opacity-60"
                  >
                    Try again
                  </button>
                  <button
                    type="button"
                    onClick={() => queue.discard(item.idempotencyKey)}
                    disabled={pending || queue.syncing}
                    className="min-h-[44px] rounded-lg border border-ink-200 bg-white px-3 py-1 text-xs font-bold text-ink-600 disabled:opacity-60"
                  >
                    Discard
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ------------------------------------------------ the session prices */}
      <section>
        <h2 className="mb-2 text-base font-bold text-ink-900">
          Prices in this session ({observations.length})
        </h2>

        {observations.length === 0 ? (
          <p className="rounded-xl border border-dashed border-ink-200 bg-white p-4 text-sm text-ink-500">
            Nothing recorded yet. Add the first commodity above.
          </p>
        ) : (
          <ul className="space-y-2">
            {observations.map((observation) => {
              const isDraft = observation.verificationStatus === 'draft';
              return (
                <li key={observation.id} className="rounded-xl border border-ink-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink-900">
                        {observation.commodityName}
                        {observation.gradeName ? (
                          <span className="ml-1 font-normal text-ink-500">
                            · {observation.gradeName}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-500">
                        {FIELD_PRICE_TYPES.find((t) => t.value === observation.priceType)?.label ??
                          observation.priceType}
                        {observation.unitName ? ` · per ${observation.unitName}` : ''}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        isDraft
                          ? 'bg-ink-100 text-ink-700'
                          : 'bg-brand-100 text-brand-700'
                      }`}
                    >
                      {isDraft ? 'Draft' : 'Sent for review'}
                    </span>
                  </div>

                  <p className="mt-1.5 text-lg font-bold tabular-nums text-ink-950">
                    {observation.amount === null
                      ? 'No amount'
                      : `${observation.currencyCode} ${observation.amount.toLocaleString('en-NG')}`}
                  </p>

                  {observation.intelligence ? (
                    <p className="mt-1 text-[11px] text-ink-500">
                      {[
                        observation.intelligence.availability
                          ? `availability ${observation.intelligence.availability.replace(/_/g, ' ')}`
                          : null,
                        observation.intelligence.priceDirection
                          ? `price ${observation.intelligence.priceDirection}`
                          : null,
                        observation.intelligence.sentiment
                          ? `${observation.intelligence.sentiment} sentiment`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  ) : null}

                  {observation.evidenceCount > 0 || (evidenceRequired && isDraft) ? (
                    <div className="mt-2">
                      {evidenceRequired && isDraft && observation.evidenceCount === 0 ? (
                        <p className="mb-2 text-[11px] font-semibold text-warning-700">
                          This schedule asks for evidence. Attach a photograph before the price is
                          sent.
                        </p>
                      ) : null}
                      <EvidencePanel
                        observationId={observation.id}
                        evidence={observation.evidence}
                        canEdit={isDraft}
                      />
                    </div>
                  ) : null}

                  {observation.qualityFlags.length > 0 ? (
                    <p className="mt-1 text-[11px] font-semibold text-harvest-700">
                      Flagged: {observation.qualityFlags.join(', ').replace(/_/g, ' ')}
                    </p>
                  ) : null}

                  {isDraft ? (
                    <div className="mt-2.5 flex gap-2">
                      <button
                        type="button"
                        onClick={() => onSubmitDraft(observation)}
                        disabled={pending}
                        className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-brand-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                      >
                        {pending ? <HatsiSpinner /> : null}
                        Send for review
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveDraft(observation)}
                        disabled={pending}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs font-bold text-ink-700 disabled:opacity-60"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <p className="mt-1.5 text-[11px] text-ink-400">
                      Sent {observation.submittedAt ? new Date(observation.submittedAt).toLocaleString('en-GB') : ''}.
                      It is with the office for review.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ------------------------------------------------------ the closing */}
      {!completed ? (
        <section className="rounded-xl border border-ink-200 bg-white p-4">
          <h2 className="text-base font-bold text-ink-900">Finish the visit</h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-600">
            {drafts.length > 0
              ? `${drafts.length} price(s) in this session are still drafts. Send them for review before you close the session, or close it and send them from your prices list.`
              : 'Every price in this session has been sent for review. Closing the session records the visit and tells the office the round is done.'}
          </p>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            aria-busy={pending}
            className="mt-3 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-ink-900 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {pending ? (
              <>
                <HatsiSpinner />
                Closing…
              </>
            ) : (
              'Close this collection session'
            )}
          </button>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-400">
            Closing a session does not approve anything. Prices that have been sent are still with
            the office for review.
          </p>
        </section>
      ) : (
        <section className="rounded-xl border border-brand-200 bg-brand-50 p-4">
          <h2 className="text-base font-bold text-brand-900">This session is closed</h2>
          <p className="mt-1 text-xs leading-relaxed text-brand-800">
            {submitted.length} price(s) were sent to the office. Closing the session does not
            approve them — they are still awaiting a reviewer.
          </p>
        </section>
      )}
    </div>
  );
}

/** The value a `datetime-local` input expects. */
function toLocalInput(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
