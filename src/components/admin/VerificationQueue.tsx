'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  approveObservation,
  rejectObservation,
  requestCorrection,
} from '@/lib/verification/actions';
import { PRICE_TYPE_META } from '@/types/domain';
import { formatDateTime } from '@/lib/money';

export interface QueueItem {
  id: string;
  commodityName: string;
  marketName: string;
  stateName: string;
  amount: number | null;
  unitName: string | null;
  priceType: string;
  collectedAt: string;
  submittedAt: string | null;
  notes: string | null;
  agentName: string | null;
  status: string;
}

/**
 * The verification queue.
 *
 * Approving calls the database's `publish_observation` function, so the
 * publication timestamp and the audit entry are written inside the database
 * and cannot be bypassed from the browser.
 */
export function VerificationQueue({ items }: { items: QueueItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Record<string, { ok: boolean; text: string }>>({});

  const run = (id: string, action: () => Promise<{ ok: boolean; message: string }>) => {
    startTransition(async () => {
      const result = await action();
      setMessages((prev) => ({ ...prev, [id]: { ok: result.ok, text: result.message } }));
      if (result.ok) router.refresh();
    });
  };

  if (items.length === 0) {
    return (
      <div className="card p-8 text-center">
        <h2 className="text-lg font-bold">The verification queue is empty</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-600">
          No observation is currently awaiting verification. Submissions from field agents appear
          here as soon as they are sent.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const priceType = PRICE_TYPE_META[item.priceType as keyof typeof PRICE_TYPE_META];
        const message = messages[item.id];

        return (
          <article key={item.id} className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg font-bold">
                  {item.commodityName}{' '}
                  <span className="font-normal text-ink-500">at</span> {item.marketName}
                </h2>
                <p className="mt-0.5 text-sm text-ink-600">
                  {item.stateName} · collected {formatDateTime(item.collectedAt)}
                  {item.submittedAt ? ` · submitted ${formatDateTime(item.submittedAt)}` : ''}
                </p>
                {item.agentName ? (
                  <p className="mt-0.5 text-xs text-ink-500">Collected by {item.agentName}</p>
                ) : null}
              </div>

              <div className="shrink-0 text-right">
                <p className="figure text-2xl text-ink-950">
                  {item.amount == null ? '—' : `₦${item.amount.toLocaleString('en-NG')}`}
                </p>
                <p className="text-xs text-ink-500">
                  {item.unitName ? `per ${item.unitName}` : 'unit not recorded'}
                </p>
                <p className="mt-1 text-xs font-semibold text-ink-600">
                  {priceType?.label ?? item.priceType}
                </p>
              </div>
            </div>

            {item.notes ? (
              <p className="mt-4 rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 text-sm leading-relaxed text-ink-700">
                <span className="font-semibold">Agent&rsquo;s note:</span> {item.notes}
              </p>
            ) : null}

            {!item.unitName ? (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                This observation has no measurement unit. It can be published, but it will be
                published as &ldquo;unit not recorded&rdquo; and will not be compared with
                unit-quoted prices.
              </p>
            ) : null}

            {message ? (
              <p
                role="status"
                className={`mt-4 rounded-xl border px-4 py-3 text-sm font-medium ${
                  message.ok
                    ? 'border-brand-200 bg-brand-50 text-brand-900'
                    : 'border-red-200 bg-red-50 text-red-800'
                }`}
              >
                {message.text}
              </p>
            ) : null}

            <div className="mt-5 border-t border-ink-100 pt-5">
              <label
                htmlFor={`reason-${item.id}`}
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-600"
              >
                Reason (required to reject or request a correction)
              </label>
              <input
                id={`reason-${item.id}`}
                type="text"
                value={reasons[item.id] ?? ''}
                onChange={(event) =>
                  setReasons((prev) => ({ ...prev, [item.id]: event.target.value }))
                }
                placeholder="e.g. Price does not match the market band; please confirm the unit."
                className="w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                maxLength={1000}
              />

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(item.id, () => approveObservation(item.id))}
                  className="rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:opacity-60"
                >
                  Approve &amp; publish
                </button>
                <button
                  type="button"
                  disabled={pending || (reasons[item.id] ?? '').trim().length < 5}
                  onClick={() =>
                    run(item.id, () => rejectObservation(item.id, reasons[item.id] ?? ''))
                  }
                  className="rounded-xl border border-red-300 px-5 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={pending || (reasons[item.id] ?? '').trim().length < 5}
                  onClick={() =>
                    run(item.id, () => requestCorrection(item.id, reasons[item.id] ?? ''))
                  }
                  className="rounded-xl border border-ink-300 px-5 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-400 hover:text-brand-800 disabled:opacity-50"
                >
                  Request correction
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
