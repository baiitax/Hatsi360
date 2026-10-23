'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { transitionOwnTask, type OperationState } from '@/lib/operations/actions';

/**
 * Move one of the agent's own tasks forward.
 *
 * The transition is validated by the database function `transition_task`,
 * which only accepts a status the agent is allowed to move a task to.
 */
export function TaskControls({
  taskId,
  status,
  canStart,
  canComplete,
}: {
  taskId: number;
  status: string;
  canStart: boolean;
  canComplete: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<OperationState | null>(null);
  const [reason, setReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);

  const run = (next: 'in_progress' | 'completed' | 'cancelled', cancelReason?: string) => {
    startTransition(async () => {
      const result = await transitionOwnTask(taskId, next, cancelReason);
      setMessage(result);
      if (result.ok) router.refresh();
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {canStart ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run('in_progress')}
            className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-800 disabled:opacity-60"
          >
            Start
          </button>
        ) : null}

        {canComplete ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run('completed')}
            className="rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            Mark done
          </button>
        ) : null}

        {status !== 'completed' && status !== 'cancelled' ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => setShowCancel((value) => !value)}
            className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-xs font-semibold text-ink-700 disabled:opacity-60"
          >
            Cannot do it
          </button>
        ) : null}
      </div>

      {showCancel ? (
        <div className="rounded-lg border border-ink-200 bg-ink-50 p-2">
          <label htmlFor={`cancel-${taskId}`} className="block text-xs font-semibold text-ink-700">
            Why can this not be collected?
          </label>
          <input
            id={`cancel-${taskId}`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="mt-1 w-full rounded-lg border border-ink-200 bg-white px-2 py-2 text-sm outline-none focus:border-brand-500"
            placeholder="Market closed, commodity unavailable…"
          />
          <button
            type="button"
            disabled={pending || reason.trim().length < 3}
            onClick={() => run('cancelled', reason)}
            className="mt-2 rounded-lg bg-ink-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            Cancel this task
          </button>
        </div>
      ) : null}

      {message ? (
        <p
          className={`text-xs ${message.ok ? 'text-emerald-700' : 'text-red-700'}`}
          role="status"
        >
          {message.message}
        </p>
      ) : null}
    </div>
  );
}
