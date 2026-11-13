import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireStaff } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import {
  applyBadges,
  navigationForRole,
  type RenderedNavGroup,
} from '@/lib/operations/navigation';
import { unreadCount } from '@/lib/notifications';
import { AdminShell } from '@/components/admin/AdminShell';

export const metadata: Metadata = {
  title: 'Control Centre — Hatsi360',
  robots: { index: false, follow: false },
};

// The console reads the session on every request, so it is never cached.
export const dynamic = 'force-dynamic';

/**
 * The admin console shell.
 *
 * Access is refused here for anybody who is not staff, before any of the
 * modules is rendered. Each module additionally re-checks the role it needs.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireStaff('/admin/overview');

  const baseGroups = navigationForRole(profile.role);
  let groups: RenderedNavGroup[] = applyBadges(baseGroups, {});
  let unread = 0;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();

    const [pendingResult, tasksResult, flagsResult] = await Promise.all([
      supabase
        .from('price_observations')
        .select('*', { count: 'exact', head: true })
        .in('verification_status', ['submitted', 'pending_verification']),
      supabase
        .from('collection_tasks')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress']),
      supabase
        .from('data_quality_flags')
        .select('*', { count: 'exact', head: true })
        .is('resolved_at', null),
    ]);

    groups = applyBadges(baseGroups, {
      pendingVerification: pendingResult.count ?? 0,
      openTasks: tasksResult.count ?? 0,
      qualityFlags: flagsResult.count ?? 0,
    });

    unread = await unreadCount(profile.id);
  } else {
    groups = applyBadges(baseGroups, {});
  }

  if (groups.length === 0) {
    redirect('/dashboard?error=forbidden');
  }

  return (
    <AdminShell
      groups={groups}
      userName={profile.fullName ?? profile.email}
      userRole={profile.role}
      unreadCount={unread}
    >
      {children}
    </AdminShell>
  );
}
