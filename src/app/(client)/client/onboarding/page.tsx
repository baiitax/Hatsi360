import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { OnboardingWizard } from './OnboardingWizard';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Get user profile with onboarding state
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, onboarding_step, onboarding_completed_at, interests')
    .eq('id', session.user.id)
    .single();

  // If onboarding already completed, redirect to dashboard
  if (profile?.onboarding_completed_at) {
    redirect('/client');
  }

  // Ensure profile exists (should always be true at this point)
  if (!profile) {
    redirect('/client');
  }

  // Get available commodities for selection
  const { data: commodities } = await supabase
    .from('commodities')
    .select('id, name, slug, category')
    .order('name');

  // Get available markets for selection
  const { data: markets } = await supabase
    .from('markets')
    .select('id, name, slug, state, market_type')
    .order('name');

  // Get available states
  const { data: states } = await supabase
    .from('states')
    .select('id, name, slug')
    .order('name');

  return (
    <OnboardingWizard
      profile={{
        id: profile.id,
        full_name: profile.full_name,
        email: session.user.email || '',
        onboarding_step: profile.onboarding_step || 0,
        onboarding_completed_at: profile.onboarding_completed_at,
        interests: (profile.interests as Record<string, unknown>) || {},
      }}
      commodities={commodities || []}
      markets={markets || []}
      states={states || []}
      currentStep={profile.onboarding_step || 0}
      interests={(profile.interests as Record<string, unknown>) || {}}
    />
  );
}
