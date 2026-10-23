'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { raiseQualityFlag, resolveQualityFlag, type OperationState } from '@/lib/operations/actions';

/** Resolve one quality flag. The flag row itself is kept. */
export function ResolveFlagButton({ flagId }: { flagId: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <span className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await resolveQualityFlag(flagId);
            setMessage(result.message);
            if (result.ok) router.refresh();
          })
        }
        className="rounded-md border border-ink-200 bg-white px-2 py-1 text-[11px] font-semibold text-ink-700 hover:bg-ink-100 disabled:opacity-60"
      >
        {pending ? 'Resolving…' : 'Resolve'}
      </button>
      {message ? <span className="text-[11px] text-ink-500">{message}</span> : null}
    </span>
  );
}

/** Raise a quality flag against an observation. */
export function RaiseFlagForm({ observationId }: { observationId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [flag, setFlag] = useState('price_outlier');
  const [detail, setDetail] = useState('');
  const [result, setResult] = useState<OperationState | null>(null);

  return (
    <div className="space-y-2 rounded-lg border border-ink-200 bg-ink-50 p-3">
      <div className="flex flex-wrap gap-2">
        <select
          value={flag}
          onChange={(event) => setFlag(event.target.value)}
          aria-label="Quality flag"
          className="rounded-md border border-ink-200 bg-white px-2 py-1 text-xs outline-none"
        >
          <option value="price_outlier">Price outlier</option>
          <option value="duplicate_suspected">Duplicate suspected</option>
          <option value="unit_conversion_unverified">Unit conversion unverified</option>
          <option value="bag_weight_inconsistent">Bag weight inconsistent</option>
          <option value="timestamp_inconsistent">Timestamp inconsistent</option>
          <option value="missing_evidence">Missing evidence</option>
          <option value="conflicting_report">Conflicting report</option>
          <option value="stale">Stale</option>
        </select>
        <input
          value={detail}
          onChange={(event) => setDetail(event.target.value)}
          placeholder="What is wrong with this record?"
          aria-label="Flag detail"
          className="min-w-[12rem] flex-1 rounded-md border border-ink-200 bg-white px-2 py-1 text-xs outline-none"
        />
        <button
          type="button"
          disabled={pending || detail.trim().length < 3}
          onClick={() =>
            startTransition(async () => {
              const outcome = await raiseQualityFlag(observationId, flag as never, detail, 'review');
              setResult(outcome);
              if (outcome.ok) {
                setDetail('');
                router.refresh();
              }
            })
          }
          className="rounded-md bg-ink-900 px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
        >
          Raise flag
        </button>
      </div>
      {result ? (
        <p className="text-[11px] text-ink-600">{result.message}</p>
      ) : null}
    </div>
  );
}
