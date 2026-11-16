import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { PremiumSidebar } from '@/components/client/PremiumSidebar';
import { PremiumHeader } from '@/components/client/PremiumHeader';
import { createClient } from '@/lib/supabase/server';

/**
 * All authenticated client pages must not be indexed by search engines.
 * Private workspace information must never surface through search results.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  
  if (!session) {
    redirect('/login?returnUrl=/client');
  }

  // Fetch user profile
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, role')
    .eq('id', session.user.id)
    .single();

  // Fetch user entitlements (function uses current session user)
  const { data: entitlements } = await supabase
    .rpc('user_entitlements');

  // Fetch unread notification count
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', session.user.id)
    .is('read_at', null);

  const userName = profile?.full_name || session.user.email?.split('@')[0] || 'User';
  const userEntitlements = entitlements || [];

  return (
    <div className="min-h-screen bg-[#F7F9F7]">
      <div className="flex">
        {/* Sidebar */}
        <PremiumSidebar
          userEntitlements={userEntitlements}
          userName={userName}
          userRole={profile?.role}
        />
        
        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <PremiumHeader
            userName={userName}
            userAvatarUrl={profile?.avatar_url}
            unreadNotifications={unreadCount || 0}
          />
          
          {/* Page content */}
          <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
