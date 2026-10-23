'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { runJobNow, type OperationState } from '@/lib/operations/actions';

/**
 * Run one scheduled job on demand.
 *
 * The job is idempotent: running it twice in the same slot does not repeat
 * the work, it reports that the slot has already been used.
 */
export function RunJobButton({ jobName }: { jobName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<OperationState | null>(null);

  return (
    <span className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const outcome = await runJobNow(jobName);
            setResult(outcome);
            if (outcome.ok) router.refresh();
          })
        }
        className="rounded-md border border-ink-200 bg-white px-2 py-1 text-[11px] font-semibold text-ink-700 hover:bg-ink-100 disabled:opacity-60"
      >
        {pending ? 'Running…' : 'Run now'}
      </button>
      {result ? <span className="max-w-[16rem] text-[11px] text-ink-500">{result.message}</span> : null}
    </span>
  );
}
