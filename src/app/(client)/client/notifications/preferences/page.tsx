import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { NotificationPreferencesForm } from './NotificationPreferencesForm';

export const dynamic = 'force-dynamic';

export default async function NotificationPreferencesPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Get current notification preferences
  const { data: preferences } = await supabase
    .from('user_notification_preferences')
    .select('*')
    .eq('user_id', session.user.id)
    .single();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Notification Preferences</h1>
        <p className="text-gray-600">
          Control how and when you receive notifications from Hatsi360.
        </p>
      </div>

      <NotificationPreferencesForm 
        userId={session.user.id} 
        existingPreferences={preferences} 
      />
    </div>
  );
}
