import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { IconUser, IconShieldCheck } from '@/components/ui/icons';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  // Get subscription information
  const { data: subscription } = await supabase
    .from('customer_subscriptions')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .single();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Account Settings</h1>
        <p className="text-gray-600">
          Manage your profile, subscription, and API access.
        </p>
      </div>

      {/* Profile Section */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-[#EAF4EE] rounded-lg mr-3">
              <IconUser className="w-5 h-5 text-[#1D805A]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
              <p className="text-sm text-gray-600 mt-1">
                Your personal information and account details
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <p className="text-gray-900">{profile?.full_name || 'Not set'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <p className="text-gray-900">{session.user.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <p className="text-gray-900">{profile?.phone || 'Not set'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organisation
              </label>
              <p className="text-gray-900">{profile?.organisation || 'Not set'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Created
              </label>
              <p className="text-gray-900">
                {profile?.created_at 
                  ? new Date(profile.created_at).toLocaleDateString()
                  : 'Unknown'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Status
              </label>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Section */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-[#EAF4EE] rounded-lg mr-3">
                <IconShieldCheck className="w-5 h-5 text-[#1D805A]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Subscription</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Your current plan and billing information
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {subscription ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Plan
                  </label>
                  <p className="text-gray-900 font-medium capitalize">
                    {subscription.plan || 'Free'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {subscription.status}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Period Start
                  </label>
                  <p className="text-gray-900">
                    {subscription.starts_at 
                      ? new Date(subscription.starts_at).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Period End
                  </label>
                  <p className="text-gray-900">
                    {subscription.ends_at 
                      ? new Date(subscription.ends_at).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <IconShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No active subscription
              </h3>
              <p className="text-gray-600 mb-4">
                You are currently on the free plan. Upgrade to unlock premium features.
              </p>
              <button className="inline-flex items-center px-4 py-2 bg-[#1D805A] text-white rounded-lg hover:bg-[#103C2D] transition-colors">
                View Plans
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
