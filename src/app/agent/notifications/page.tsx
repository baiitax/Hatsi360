import type { Metadata } from 'next';
import { requireAgent } from '@/lib/auth/guards';
import { listNotifications } from '@/lib/notifications';
import { formatDateTime } from '@/lib/money';
import { NotificationList } from '@/components/agent/NotificationList';
import { FieldEmpty } from '@/components/agent/FieldUi';

export const metadata: Metadata = {
  title: 'Notifications — Field collection',
  robots: { index: false, follow: false },
};

/**
 * The agent's notifications.
 *
 * These are the real rows in the notifications table for the signed-in
 * agent. A reviewer's decision, a correction request and a task reminder all
 * arrive here, and each one links to the thing it is about.
 */
export default async function AgentNotificationsPage() {
  const profile = await requireAgent('/agent/notifications');
  const notifications = await listNotifications(profile.id, { limit: 50 });

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold tracking-tight text-ink-950">Notifications</h1>
        <p className="mt-0.5 text-sm text-ink-500">
          Only you can see these. They are not emailed in this deployment.
        </p>
      </header>

      {notifications.length === 0 ? (
        <FieldEmpty
          title="Nothing new"
          body="A reviewer's decision, a correction request or a task reminder will appear here. Nothing has been sent to you yet."
        />
      ) : (
        <NotificationList
          notifications={notifications.map((notification) => ({
            id: notification.id,
            kind: notification.kind,
            severity: notification.severity,
            title: notification.title,
            body: notification.body,
            actionUrl: notification.actionUrl,
            readAt: notification.readAt,
            createdAt: notification.createdAt,
            createdLabel: formatDateTime(notification.createdAt),
          }))}
        />
      )}
    </div>
  );
}
