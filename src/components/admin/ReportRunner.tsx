'use client';

import { useState, useTransition } from 'react';
import { runReportExport } from '@/lib/operations/actions';

/**
 * Run a report and download it.
 *
 * The file is produced on the server, audited there, and handed back as CSV.
 * The browser never assembles the rows itself.
 */
export function ReportRunner({
  reportId,
  label,
  days,
}: {
  reportId: string;
  label: string;
  days: number;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const run = () => {
    startTransition(async () => {
      const result = await runReportExport(reportId, days);

      if (!result.ok || !result.csv) {
        setMessage(result.message);
        return;
      }

      const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = result.filename ?? `${reportId}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      setMessage(result.message);
    });
  };

  return (
    <span className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-100 disabled:opacity-60"
      >
        {pending ? 'Building…' : 'Export CSV'}
      </button>
      {message ? <span className="text-[11px] text-ink-500">{message}</span> : null}
    </span>
  );
}
