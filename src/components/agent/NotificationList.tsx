'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { markFieldNotificationsRead } from '@/lib/operations/field-actions';
import { HatsiSpinner } from '@/components/loading/HatsiActionLoader';

export interface AgentNotification {
  id: string;
  kind: string;
  severity: string;
  title: string;
  body: string | null;
  actionUrl: string | null;
  readAt: string | null;
  createdAt: string;
  createdLabel: string;
}

/**
 * The agent's notifications.
 *
 * Each notification belongs to the signed-in agent — the database decides
 * that, not this component. Marking one as read writes the read time; it
 * never hides the notification, because a correction request the agent
 * cannot find is a correction request that never gets answered.
 */
export function NotificationList({ notifications }: { notifications: AgentNotification[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');

  const unread = notifications.filter((notification) => !notification.readAt);

  const mark = (ids: string[]) => {
    if (ids.length === 0) return;
    startTransition(async () => {
      const result = await markFieldNotificationsRead(ids);
      setMessage(result.message);
      if (result.ok) router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {unread.length > 0 ? (
        <button
          type="button"
          onClick={() => mark(unread.map((notification) => notification.id))}
          disabled={pending}
          aria-busy={pending}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2 text-sm font-bold text-ink-800 disabled:opacity-60"
        >
          {pending ? <HatsiSpinner /> : null}
          Mark all {unread.length} as read
        </button>
      ) : null}

      {message ? (
        <p role="status" className="text-xs font-semibold text-ink-600">
          {message}
        </p>
      ) : null}

      <ul className="space-y-2">
        {notifications.map((notification) => (
          <li
            key={notification.id}
            className={`rounded-xl border bg-white p-3 ${
              notification.readAt ? 'border-ink-200' : 'border-brand-300'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink-900">{notification.title}</p>
                {notification.body ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-600">
                    {notification.body}
                  </p>
                ) : null}
                <p className="mt-1 text-[11px] text-ink-400">{notification.createdLabel}</p>
              </div>
              {!notification.readAt ? (
                <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-700">
                  New
                </span>
              ) : null}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              {notification.actionUrl ? (
                <Link
                  href={notification.actionUrl}
                  className="inline-flex min-h-[36px] items-center rounded-lg bg-ink-900 px-3 py-1 text-xs font-bold text-white"
                >
                  Open
                </Link>
              ) : null}
              {!notification.readAt ? (
                <button
                  type="button"
                  onClick={() => mark([notification.id])}
                  disabled={pending}
                  className="text-[11px] font-bold text-brand-700 underline underline-offset-2 disabled:opacity-60"
                >
                  Mark as read
                </button>
              ) : (
                <span className="text-[11px] text-ink-400">Read</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
