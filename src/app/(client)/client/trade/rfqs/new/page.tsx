import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { RFQForm } from './RFQForm';

export const dynamic = 'force-dynamic';

export default async function NewRFQPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, phone')
    .eq('id', session.user.id)
    .single();

  // Get commodities
  const { data: commodities } = await supabase
    .from('commodities')
    .select('id, name, slug')
    .order('name');

  // Get grades
  const { data: grades } = await supabase
    .from('commodity_grades')
    .select('id, name')
    .order('name');

  // Get varieties
  const { data: varieties } = await supabase
    .from('commodity_varieties')
    .select('id, name, commodity_id')
    .order('name');

  // Get units
  const { data: units } = await supabase
    .from('measurement_units')
    .select('id, name, abbreviation')
    .order('name');

  // Get markets
  const { data: markets } = await supabase
    .from('markets')
    .select('id, name, state')
    .order('name');

  // Get states
  const { data: states } = await supabase
    .from('states')
    .select('id, name')
    .order('name');

  // Ensure profile exists
  if (!profile) {
    redirect('/client/account');
  }

  return (
    <RFQForm
      profile={profile}
      commodities={commodities || []}
      grades={grades || []}
      varieties={varieties || []}
      units={units || []}
      markets={markets || []}
      states={states || []}
    />
  );
}
