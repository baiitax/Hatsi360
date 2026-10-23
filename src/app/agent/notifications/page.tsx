import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAgent } from '@/lib/auth/guards';
import { listNotifications } from '@/lib/notifications';
import { formatDateTime } from '@/lib/money';

export const metadata: Metadata = {
  title: 'Notifications — Field collection',
  robots: { index: false, follow: false },
};

export default async function AgentNotificationsPage() {
  const profile = await requireAgent('/agent/notifications');
  const notifications = await listNotifications(profile.id, { limit: 50 });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink-950">Notifications</h1>
        <p className="mt-0.5 text-sm text-ink-500">
          Only you can see these. Email and SMS are not connected in this deployment.
        </p>
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-200 bg-white p-6 text-center">
          <p className="text-sm font-semibold text-ink-700">Nothing new</p>
          <p className="mt-1 text-xs text-ink-500">
            A reviewer&rsquo;s decision, a correction request or a task reminder will appear here.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((notification) => (
            <li key={notification.id} className="rounded-xl border border-ink-200 bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ink-900">{notification.title}</p>
                  {notification.body ? (
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-600">{notification.body}</p>
                  ) : null}
                  <p className="mt-1 text-[11px] text-ink-400">
                    {formatDateTime(notification.createdAt)}
                  </p>
                </div>
                {!notification.readAt ? (
                  <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-800">
                    New
                  </span>
                ) : null}
              </div>
              {notification.actionUrl ? (
                <Link
                  href={notification.actionUrl}
                  className="mt-2 inline-block rounded-lg bg-ink-900 px-3 py-2 text-xs font-semibold text-white"
                >
                  Open
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
