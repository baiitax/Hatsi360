'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  approvePrice,
  publishPrice,
  rejectPrice,
  requestCorrection,
  type OperationState,
} from '@/lib/operations/actions';
import { HatsiSpinner } from '@/components/loading/HatsiActionLoader';

/**
 * The verification decision panel.
 *
 * Approval and publication are two separate buttons, because they are two
 * separate acts: approving says the price is sound, publishing says it may be
 * shown to the public. Each one is a separate, audited database action.
 */
export function VerificationActions({
  observationId,
  status,
  canPublish,
}: {
  observationId: string;
  status: string;
  canPublish: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<'idle' | 'reject' | 'correct'>('idle');
  const [reason, setReason] = useState('');
  const [result, setResult] = useState<OperationState | null>(null);

  const run = (action: () => Promise<OperationState>) => {
    startTransition(async () => {
      const outcome = await action();
      setResult(outcome);
      if (outcome.ok) {
        setMode('idle');
        setReason('');
        router.refresh();
      }
    });
  };

  const isApproved = status === 'verified';
  const isPublished = status === 'verified' && canPublish;

  return (
    <div className="space-y-3">
      {result ? (
        <p
          role="status"
          className={`rounded-lg border px-3 py-2 text-xs font-medium ${
            result.ok
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {result.message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {!isApproved ? (
          <button
            type="button"
            disabled={pending}
            aria-busy={pending}
            onClick={() => run(() => approvePrice(observationId))}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {pending ? <HatsiSpinner /> : null}
            Approve
          </button>
        ) : null}

        {isApproved && !isPublished ? (
          <button
            type="button"
            disabled={pending}
            aria-busy={pending}
            onClick={() => run(() => publishPrice(observationId))}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-900 px-3 py-2 text-xs font-semibold text-white hover:bg-black disabled:opacity-60"
          >
            {pending ? <HatsiSpinner /> : null}
            Publish to the public site
          </button>
        ) : null}

        {isApproved && isPublished ? (
          <span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
            Approved and published
          </span>
        ) : null}

        <button
          type="button"
          disabled={pending}
          onClick={() => setMode(mode === 'correct' ? 'idle' : 'correct')}
          className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-100 disabled:opacity-60"
        >
          Ask for a correction
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() => setMode(mode === 'reject' ? 'idle' : 'reject')}
          className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          Reject
        </button>
      </div>

      {mode !== 'idle' ? (
        <div className="rounded-lg border border-ink-200 bg-ink-50 p-3">
          <label
            htmlFor={`reason-${observationId}`}
            className="block text-xs font-semibold text-ink-800"
          >
            {mode === 'reject'
              ? 'Why is this price rejected? The agent will see this.'
              : 'What must the agent correct? The agent will see this.'}
          </label>
          <textarea
            id={`reason-${observationId}`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            placeholder="At least 5 characters."
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={pending || reason.trim().length < 5}
              onClick={() =>
                run(() =>
                  mode === 'reject'
                    ? rejectPrice(observationId, reason)
                    : requestCorrection(observationId, reason),
                )
              }
              className="rounded-lg bg-ink-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {mode === 'reject' ? 'Reject the price' : 'Request the correction'}
            </button>
            <button
              type="button"
              onClick={() => setMode('idle')}
              className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-xs font-semibold text-ink-700"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
