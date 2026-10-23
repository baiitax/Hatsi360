'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { generateTasks, type OperationState } from '@/lib/operations/actions';

/**
 * Generate the collection tasks for a day.
 *
 * The generation is idempotent: running it twice for the same date does not
 * create a second set of tasks.
 */
export function GenerateTasksForm({ defaultDate }: { defaultDate: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [date, setDate] = useState(defaultDate);
  const [result, setResult] = useState<OperationState | null>(null);

  const run = () => {
    startTransition(async () => {
      const outcome = await generateTasks(date);
      setResult(outcome);
      if (outcome.ok) router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="task-date" className="mb-1 block text-xs font-semibold text-ink-700">
          Date to generate
        </label>
        <input
          id="task-date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
      </div>
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="rounded-lg bg-brand-700 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
      >
        {pending ? 'Generating…' : 'Generate tasks'}
      </button>

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
    </div>
  );
}
