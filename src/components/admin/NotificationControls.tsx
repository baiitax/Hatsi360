'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Mark notifications as read.
 *
 * The update runs as the signed-in user, and the database refuses to let
 * anybody read or change another person's notifications.
 */
export function MarkReadButton({
  notificationIds,
  label = 'Mark as read',
}: {
  notificationIds: string[];
  label?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (notificationIds.length === 0) return null;

  return (
    <span className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const response = await fetch('/api/notifications/read', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ notificationIds }),
            });
            const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string };
            setMessage(
              payload.ok
                ? `${notificationIds.length} marked as read.`
                : (payload.message ?? 'The update failed.'),
            );
            if (payload.ok) router.refresh();
          })
        }
        className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-100 disabled:opacity-60"
      >
        {pending ? 'Saving…' : label}
      </button>
      {message ? <span className="text-[11px] text-ink-500">{message}</span> : null}
    </span>
  );
}
