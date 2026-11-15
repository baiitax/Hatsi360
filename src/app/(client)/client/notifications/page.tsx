import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { IconBell } from '@/components/ui/icons';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Get all notifications
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  // Get unread count
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', session.user.id)
    .is('read_at', null);

  const unreadNotifications = notifications?.filter(n => !n.read_at) || [];
  const readNotifications = notifications?.filter(n => n.read_at) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
        <p className="text-gray-600">
          Stay updated with alerts, price changes, and system notifications.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Unread</h3>
          <p className="text-3xl font-bold text-[#1D805A]">{unreadCount || 0}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total</h3>
          <p className="text-3xl font-bold text-gray-900">{notifications?.length || 0}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Read</h3>
          <p className="text-3xl font-bold text-gray-400">{readNotifications.length}</p>
        </div>
      </div>

      {/* Unread Notifications */}
      {unreadNotifications.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-[#FFF3E0] rounded-lg mr-3">
                <IconBell className="w-5 h-5 text-[#C7A45A]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Unread Notifications</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {unreadNotifications.length} new notification{unreadNotifications.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {unreadNotifications.map((notification) => (
              <div key={notification.id} className="p-6 hover:bg-gray-50 transition-colors bg-[#FAFAFA]">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2 ${
                        notification.severity === 'high' 
                          ? 'bg-red-100 text-red-800' 
                          : notification.severity === 'normal'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {notification.kind}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(notification.created_at).toLocaleString()}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {notification.title}
                    </h3>

                    {notification.body && (
                      <p className="text-gray-600 text-sm mb-2">
                        {notification.body}
                      </p>
                    )}

                    {notification.action_url && (
                      <a
                        href={notification.action_url}
                        className="text-sm font-medium text-[#1D805A] hover:text-[#103C2D]"
                      >
                        View details →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Read Notifications */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-[#EAF4EE] rounded-lg mr-3">
              <IconBell className="w-5 h-5 text-[#1D805A]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Recent Notifications</h2>
              <p className="text-sm text-gray-600 mt-1">
                Your last 50 notifications
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {notifications && notifications.length > 0 ? (
            notifications.map((notification) => (
              <div key={notification.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2 ${
                        notification.severity === 'high' 
                          ? 'bg-red-100 text-red-800' 
                          : notification.severity === 'normal'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {notification.kind}
                      </span>
                      {!notification.read_at && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#C7A45A] text-white">
                          New
                        </span>
                      )}
                      <span className="text-xs text-gray-500 ml-2">
                        {new Date(notification.created_at).toLocaleString()}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {notification.title}
                    </h3>

                    {notification.body && (
                      <p className="text-gray-600 text-sm mb-2">
                        {notification.body}
                      </p>
                    )}

                    {notification.action_url && (
                      <a
                        href={notification.action_url}
                        className="text-sm font-medium text-[#1D805A] hover:text-[#103C2D]"
                      >
                        View details →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <IconBell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No notifications yet
              </h3>
              <p className="text-gray-600">
                You will receive notifications when price alerts trigger or when there are important updates.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
