import type { Metadata } from 'next';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth/guards';
import { listNotifications } from '@/lib/notifications';
import { PageHeader, Panel, Pill } from '@/components/ops/Primitives';
import { MarkReadButton } from '@/components/admin/NotificationControls';
import { formatDateTime } from '@/lib/money';

export const metadata: Metadata = {
  title: 'Notifications — Control Centre',
  robots: { index: false, follow: false },
};

const SEVERITY_TONE: Record<string, 'info' | 'success' | 'warning' | 'danger'> = {
  low: 'info',
  normal: 'info',
  high: 'warning',
  critical: 'danger',
};

export default async function NotificationsPage() {
  const profile = await requireStaff('/admin/notifications');
  const notifications = await listNotifications(profile.id, { limit: 100 });
  const unread = notifications.filter((notification) => !notification.readAt);

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Your notifications are private to you: nobody else, including an administrator, can read them. External channels (email, SMS, WhatsApp) are wired as adapters but are not connected in this deployment, so nothing is ever reported as delivered that the provider did not confirm."
        breadcrumbs={[
          { label: 'Control Centre', href: '/admin/overview' },
          { label: 'Notifications' },
        ]}
        actions={
          <MarkReadButton
            notificationIds={unread.map((notification) => notification.id)}
            label={`Mark all ${unread.length} as read`}
          />
        }
      />

      {notifications.length === 0 ? (
        <Panel>
          <p className="rounded-lg border border-dashed border-ink-200 bg-ink-50/60 px-4 py-10 text-center text-sm text-ink-500">
            You have no notifications yet. They appear when a submission is waiting for review, a
            correction is required or a market loses its agent.
          </p>
        </Panel>
      ) : (
        <ul className="space-y-2">
          {notifications.map((notification) => (
            <li key={notification.id}>
              <Panel>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-bold text-ink-900">{notification.title}</h2>
                      <Pill tone={SEVERITY_TONE[notification.severity] ?? 'info'}>
                        {notification.kind.replace(/_/g, ' ')}
                      </Pill>
                      {!notification.readAt ? <Pill tone="brand">New</Pill> : null}
                    </div>
                    {notification.body ? (
                      <p className="mt-1 text-xs leading-relaxed text-ink-600">{notification.body}</p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-ink-400">
                      {formatDateTime(notification.createdAt)}
                    </p>
                  </div>
                  {notification.actionUrl ? (
                    <Link
                      href={notification.actionUrl}
                      className="shrink-0 text-xs font-semibold text-brand-700 hover:underline"
                    >
                      Open
                    </Link>
                  ) : null}
                </div>
              </Panel>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
