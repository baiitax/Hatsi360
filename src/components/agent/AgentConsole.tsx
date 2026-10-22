'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitObservation, type SubmissionResult } from '@/lib/observations/actions';
import {
  OBSERVATION_PRICE_TYPES,
  buildQualityHints,
  observationIdempotencyKey,
} from '@/lib/observations/validation';
import { PRICE_TYPE_META, type PriceType } from '@/types/domain';
import type { SessionProfile } from '@/lib/auth';

export interface AgentMarket {
  id: number;
  name: string;
  stateName: string;
}

export interface AgentCommodity {
  id: number;
  name: string;
  categoryName: string | null;
}

export interface AgentUnit {
  id: number;
  code: string;
  name: string;
  isSpecific: boolean;
}

export interface AgentSubmission {
  id: string;
  commodityName: string;
  marketName: string;
  amount: number;
  unitName: string | null;
  collectedAt: string;
  status: string;
  submittedAt: string | null;
}

const DRAFT_KEY = 'pluck-live.drafts.v1';

interface LocalDraft {
  key: string;
  savedAt: string;
  payload: Record<string, unknown>;
}

function nowLocalInputValue(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export function AgentConsole({
  profile,
  markets,
  commodities,
  units,
  submissions,
}: {
  profile: SessionProfile;
  markets: AgentMarket[];
  commodities: AgentCommodity[];
  units: AgentUnit[];
  submissions: AgentSubmission[];
}) {
  const router = useRouter();

  const [marketId, setMarketId] = useState<string>('');
  const [commodityId, setCommodityId] = useState<string>('');
  const [priceType, setPriceType] = useState<string>('wholesale_transaction');
  const [amount, setAmount] = useState('');
  const [unitId, setUnitId] = useState('');
  const [packageWeight, setPackageWeight] = useState('');
  const [collectedAt, setCollectedAt] = useState(nowLocalInputValue);
  const [notes, setNotes] = useState('');

  const [drafts, setDrafts] = useState<LocalDraft[]>([]);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(true);

  // Load local drafts on mount.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) setDrafts(JSON.parse(raw) as LocalDraft[]);
    } catch {
      // Storage unavailable (private mode). Drafts simply will not persist.
    }
  }, []);

  const persistDrafts = (next: LocalDraft[]) => {
    setDrafts(next);
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
    } catch {
      // Ignore — the in-memory list still works for this session.
    }
  };

  const selectedUnit = units.find((u) => u.id === Number(unitId));

  const hints = useMemo(() => {
    if (!amount || !commodityId || !marketId) return [];
    return buildQualityHints(
      {
        marketId: Number(marketId),
        commodityId: Number(commodityId),
        gradeId: null,
        varietyId: null,
        priceType: priceType as never,
        amount: Number(amount),
        unitId: Number(unitId) || 0,
        packageWeightKg: packageWeight ? Number(packageWeight) : null,
        packageCount: null,
        collectedAt: new Date(collectedAt).toISOString(),
        notes,
      },
      {
        recentAmounts: submissions
          .filter((s) => s.commodityName === commodities.find((c) => c.id === Number(commodityId))?.name)
          .map((s) => s.amount),
        bagUnitId: units.find((u) => u.code === 'bag')?.id,
      },
    );
  }, [amount, commodityId, marketId, priceType, unitId, packageWeight, collectedAt, notes, submissions, commodities, units]);

  const resetForm = () => {
    setAmount('');
    setPackageWeight('');
    setNotes('');
    setCollectedAt(nowLocalInputValue());
    setResult(null);
  };

  const saveLocalDraft = () => {
    const payload = {
      marketId: Number(marketId),
      commodityId: Number(commodityId),
      priceType,
      amount: Number(amount),
      unitId: Number(unitId),
      packageWeightKg: packageWeight ? Number(packageWeight) : null,
      collectedAt: new Date(collectedAt).toISOString(),
      notes,
    };
    const key = observationIdempotencyKey({
      userId: profile.id,
      commodityId: Number(marketId) ? Number(commodityId) : 0,
      marketId: Number(marketId),
      priceType: priceType as never,
      amount: Number(amount),
      unitId: Number(unitId),
      collectedAt: payload.collectedAt,
    });
    const next: LocalDraft[] = [
      { key, savedAt: new Date().toISOString(), payload },
      ...drafts.filter((d) => d.key !== key),
    ].slice(0, 20);
    persistDrafts(next);
    setResult({
      ok: true,
      synced: false,
      message:
        'Saved as a local draft on this device. It has NOT been sent to Pluck Live yet — use “Submit for verification” when you have a connection.',
    });
  };

  const handleSubmit = async (mode: 'draft' | 'submit') => {
    setBusy(true);
    setResult(null);
    try {
      const response = await submitObservation(
        {
          marketId,
          commodityId,
          gradeId: null,
          varietyId: null,
          priceType,
          amount,
          unitId,
          packageWeightKg: packageWeight ? Number(packageWeight) : null,
          packageCount: null,
          collectedAt: new Date(collectedAt).toISOString(),
          notes,
        },
        mode,
      );
      setResult(response);
      if (response.ok && response.synced) {
        // Remove any local draft that matches what we just stored.
        const key = observationIdempotencyKey({
          userId: profile.id,
          commodityId: Number(commodityId),
          marketId: Number(marketId),
          priceType: priceType as never,
          amount: Number(amount),
          unitId: Number(unitId),
          collectedAt: new Date(collectedAt).toISOString(),
        });
        persistDrafts(drafts.filter((d) => d.key !== key));
        resetForm();
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  const fieldClass =
    'w-full rounded-xl border border-ink-200 bg-white px-3.5 py-3 text-base text-ink-900 focus:border-brand-500 focus:outline-none';

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-6">
        {/* --------------------------------------------- new observation -- */}
        <section className="card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">New observation</h2>
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm font-medium text-ink-700"
            >
              {showForm ? 'Hide' : 'Show'}
            </button>
          </div>

          {showForm ? (
            <>
              {markets.length === 0 ? (
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  You have no active market assignments. Ask your supervisor to assign you to a
                  market before submitting observations.
                </p>
              ) : null}

              {result ? (
                <p
                  role="status"
                  className={`mt-4 rounded-xl border px-4 py-3 text-sm font-medium ${
                    result.ok && result.synced
                      ? 'border-brand-200 bg-brand-50 text-brand-900'
                      : result.ok
                        ? 'border-amber-200 bg-amber-50 text-amber-900'
                        : 'border-red-200 bg-red-50 text-red-800'
                  }`}
                >
                  {result.message}
                  {result.ok && !result.synced ? (
                    <span className="mt-1 block text-xs font-normal">
                      Status: <strong>local draft only — not synchronized with the database.</strong>
                    </span>
                  ) : null}
                </p>
              ) : null}

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="market" className="mb-1.5 block text-sm font-semibold text-ink-800">
                    Market *
                  </label>
                  <select
                    id="market"
                    value={marketId}
                    onChange={(e) => setMarketId(e.target.value)}
                    className={fieldClass}
                    required
                  >
                    <option value="">Choose a market…</option>
                    {markets.map((market) => (
                      <option key={market.id} value={market.id}>
                        {market.name} — {market.stateName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="commodity" className="mb-1.5 block text-sm font-semibold text-ink-800">
                    Commodity *
                  </label>
                  <select
                    id="commodity"
                    value={commodityId}
                    onChange={(e) => setCommodityId(e.target.value)}
                    className={fieldClass}
                    required
                  >
                    <option value="">Choose a commodity…</option>
                    {commodities.map((commodity) => (
                      <option key={commodity.id} value={commodity.id}>
                        {commodity.name}
                        {commodity.categoryName ? ` — ${commodity.categoryName}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="amount" className="mb-1.5 block text-sm font-semibold text-ink-800">
                    Price *
                  </label>
                  <input
                    id="amount"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={fieldClass}
                    placeholder="40550.00"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="unit" className="mb-1.5 block text-sm font-semibold text-ink-800">
                    Unit *
                  </label>
                  <select
                    id="unit"
                    value={unitId}
                    onChange={(e) => setUnitId(e.target.value)}
                    className={fieldClass}
                    required
                  >
                    <option value="">Choose a unit…</option>
                    {units
                      .filter((unit) => unit.isSpecific)
                      .map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="priceType" className="mb-1.5 block text-sm font-semibold text-ink-800">
                    Price type *
                  </label>
                  <select
                    id="priceType"
                    value={priceType}
                    onChange={(e) => setPriceType(e.target.value)}
                    className={fieldClass}
                    required
                  >
                    {OBSERVATION_PRICE_TYPES.filter((t) => t !== 'unspecified').map((type) => (
                      <option key={type} value={type}>
                        {PRICE_TYPE_META[type].label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-xs text-ink-500">
                    {PRICE_TYPE_META[priceType as PriceType]?.description}
                  </p>
                </div>

                <div>
                  <label htmlFor="collectedAt" className="mb-1.5 block text-sm font-semibold text-ink-800">
                    Collected at *
                  </label>
                  <input
                    id="collectedAt"
                    type="datetime-local"
                    value={collectedAt}
                    onChange={(e) => setCollectedAt(e.target.value)}
                    className={fieldClass}
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="packageWeight"
                    className="mb-1.5 block text-sm font-semibold text-ink-800"
                  >
                    Package weight (kg)
                  </label>
                  <input
                    id="packageWeight"
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="0"
                    value={packageWeight}
                    onChange={(e) => setPackageWeight(e.target.value)}
                    className={fieldClass}
                    placeholder="50"
                  />
                  <p className="mt-1.5 text-xs text-ink-500">
                    If the price was quoted per bag, record the actual weight of that bag. We never
                    assume a bag weighs the same for every commodity.
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="notes" className="mb-1.5 block text-sm font-semibold text-ink-800">
                    Market conditions
                  </label>
                  <textarea
                    id="notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className={`${fieldClass} resize-y`}
                    placeholder="Road closure, festival, shortage, unusual supply…"
                    maxLength={1000}
                  />
                </div>
              </div>

              {hints.length > 0 ? (
                <ul className="mt-5 space-y-2">
                  {hints.map((hint) => (
                    <li
                      key={hint.message}
                      className={`rounded-xl border px-4 py-3 text-sm ${
                        hint.level === 'warning'
                          ? 'border-amber-200 bg-amber-50 text-amber-900'
                          : 'border-blue-200 bg-blue-50 text-blue-900'
                      }`}
                    >
                      {hint.message}
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => handleSubmit('submit')}
                  disabled={busy || markets.length === 0}
                  className="flex-1 rounded-xl bg-brand-700 px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-brand-800 disabled:opacity-60"
                >
                  {busy ? 'Sending…' : 'Submit for verification'}
                </button>
                <button
                  type="button"
                  onClick={saveLocalDraft}
                  disabled={busy || !marketId || !commodityId || !amount}
                  className="rounded-xl border border-ink-300 px-6 py-3.5 text-base font-semibold text-ink-700 transition-colors hover:border-brand-400 hover:text-brand-800 disabled:opacity-50"
                >
                  Save draft on this device
                </button>
              </div>
            </>
          ) : null}
        </section>

        {/* ------------------------------------------------- submissions -- */}
        <section className="card overflow-hidden">
          <div className="border-b border-ink-200 bg-ink-50 px-5 py-3">
            <h2 className="text-base font-bold">My submissions</h2>
            <p className="mt-0.5 text-xs text-ink-500">
              Records that have reached the Pluck Live database.
            </p>
          </div>

          {submissions.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink-500">
              You have not submitted anything yet.
            </p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {submissions.map((submission) => (
                <li key={submission.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold text-ink-900">{submission.commodityName}</p>
                    <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-semibold text-ink-700">
                      {submission.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-600">
                    {submission.marketName} · ₦{submission.amount.toLocaleString('en-NG')}
                    {submission.unitName ? ` per ${submission.unitName}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-ink-500">
                    Collected {new Date(submission.collectedAt).toLocaleString('en-GB')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ------------------------------------------------ local drafts -- */}
      <aside className="space-y-5">
        <section className="card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink-600">
            Drafts on this device
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-ink-500">
            Drafts are stored in this browser only. They are <strong>not</strong> in the Pluck Live
            database until you submit them with a working connection.
          </p>

          {drafts.length === 0 ? (
            <p className="mt-4 text-sm text-ink-500">No local drafts.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {drafts.map((draft) => {
                const commodity = commodities.find(
                  (c) => c.id === Number(draft.payload.commodityId),
                );
                const market = markets.find((m) => m.id === Number(draft.payload.marketId));
                return (
                  <li key={draft.key} className="rounded-xl border border-ink-200 p-3">
                    <p className="text-sm font-semibold text-ink-900">
                      {commodity?.name ?? 'Commodity'} — ₦
                      {Number(draft.payload.amount).toLocaleString('en-NG')}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-500">{market?.name ?? 'Market'}</p>
                    <p className="mt-1 text-xs text-amber-800">
                      Saved locally {new Date(draft.savedAt).toLocaleString('en-GB')}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setMarketId(String(draft.payload.marketId ?? ''));
                        setCommodityId(String(draft.payload.commodityId ?? ''));
                        setPriceType(String(draft.payload.priceType ?? 'wholesale_transaction'));
                        setAmount(String(draft.payload.amount ?? ''));
                        setUnitId(String(draft.payload.unitId ?? ''));
                        setPackageWeight(
                          draft.payload.packageWeightKg ? String(draft.payload.packageWeightKg) : '',
                        );
                        setCollectedAt(
                          new Date(String(draft.payload.collectedAt)).toISOString().slice(0, 16),
                        );
                        setNotes(String(draft.payload.notes ?? ''));
                        setShowForm(true);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="mt-2 text-xs font-semibold text-brand-700 underline"
                    >
                      Load into the form
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink-600">
            What happens next
          </h2>
          <ol className="mt-3 space-y-2.5 text-sm leading-relaxed text-ink-600">
            <li>1. Your observation is checked for duplicates and obvious errors.</li>
            <li>2. A verification officer reviews it against the market&rsquo;s history.</li>
            <li>3. It is approved, rejected with a reason, or returned to you to correct.</li>
            <li>4. Only approved observations are published.</li>
          </ol>
        </section>
      </aside>
    </div>
  );
}
