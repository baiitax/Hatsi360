'use client';

import { useActionState } from 'react';
import { useState } from 'react';
import { resubmitFieldObservation } from '@/lib/operations/field-actions';
import { HatsiSpinner } from '@/components/loading/HatsiActionLoader';
import { FIELD_PRICE_TYPES } from '@/lib/operations/field-constants';

/**
 * The agent's answer to a correction request.
 *
 * The reviewer asked for a change. The agent supplies the corrected values
 * and an explanation, and the server appends a new record that supersedes
 * the one that was reviewed. The previous values are kept — the agent cannot
 * overwrite history from here, and the interface never offers that.
 */
export function CorrectionForm({
  observationId,
  commodityName,
  marketName,
  currentAmount,
  currentUnitName,
  currentPriceType,
  units,
  grades,
}: {
  observationId: string;
  commodityName: string;
  marketName: string;
  currentAmount: number | null;
  currentUnitName: string | null;
  currentPriceType: string;
  units: { id: number; code: string; name: string }[];
  grades: { id: number; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(resubmitFieldObservation, {
    ok: false,
    message: '',
  });
  const [expanded, setExpanded] = useState(false);

  if (state.ok) {
    return (
      <div className="rounded-xl border border-brand-200 bg-brand-50 p-3">
        <p className="text-sm font-bold text-brand-800">Correction sent</p>
        <p className="mt-1 text-xs leading-relaxed text-brand-800">{state.message}</p>
      </div>
    );
  }

  return (
    <div>
      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="min-h-[44px] w-full rounded-xl bg-brand-700 px-4 py-3 text-sm font-bold text-white"
        >
          Answer this correction
        </button>
      ) : (
        <form action={formAction} className="space-y-3 rounded-xl border border-ink-200 bg-white p-3">
          <input type="hidden" name="observationId" value={observationId} />

          <p className="text-xs text-ink-600">
            Correcting <strong>{commodityName}</strong> at <strong>{marketName}</strong>. The
            original values are kept on the record.
          </p>

          <label className="block">
            <span className="text-xs font-semibold text-ink-700">Corrected price</span>
            <input
              type="text"
              inputMode="decimal"
              name="amount"
              defaultValue={currentAmount ?? ''}
              required
              className="mt-1 min-h-[48px] w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-lg font-semibold tabular-nums text-ink-900 focus:border-brand-500 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-ink-700">Unit</span>
            <select
              name="unitId"
              required
              defaultValue=""
              className="mt-1 min-h-[44px] w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-brand-500 focus:outline-none"
            >
              <option value="" disabled>
                Choose the unit
              </option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                  {unit.code ? ` (${unit.code})` : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-ink-700">Price type</span>
            <select
              name="priceType"
              defaultValue={currentPriceType}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-brand-500 focus:outline-none"
            >
              {FIELD_PRICE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          {grades.length > 0 ? (
            <label className="block">
              <span className="text-xs font-semibold text-ink-700">Grade</span>
              <select
                name="gradeId"
                defaultValue=""
                className="mt-1 min-h-[44px] w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-brand-500 focus:outline-none"
              >
                <option value="">Not graded</option>
                {grades.map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    {grade.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="block">
            <span className="text-xs font-semibold text-ink-700">Why the change?</span>
            <textarea
              name="reason"
              rows={3}
              required
              placeholder="Explain what was wrong and what the correct value is."
              className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none"
            />
          </label>

          {state.message ? (
            <p role="alert" className="rounded-lg bg-error-50 px-3 py-2 text-xs font-semibold text-error-700">
              {state.message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {pending ? (
              <>
                <HatsiSpinner />
                Sending…
              </>
            ) : (
              'Send the correction'
            )}
          </button>
        </form>
      )}
    </div>
  );
}
