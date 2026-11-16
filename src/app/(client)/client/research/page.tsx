import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ResearchClient } from './ResearchClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Research & Reports — Hatsi360',
  description: 'Access market reports, analysis, and research publications',
};

export default async function ResearchPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login?returnUrl=/client/research');
  }

  // Fetch in parallel
  const [subscriptionsResult, reportsResult, commoditiesResult] = await Promise.all([
    // User's subscriptions
    supabase
      .from('report_subscriptions')
      .select('report_id')
      .eq('user_id', session.user.id),
    // All published reports with relations
    supabase
      .from('market_reports')
      .select(`
        id,
        title,
        slug,
        summary,
        body,
        is_premium,
        published_at,
        created_at,
        commodity_id,
        market_id,
        commodities:commodity_id(id, name, slug),
        markets:market_id(id, name, slug)
      `)
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false }),
    // Commodities for filtering
    supabase
      .from('commodities')
      .select('id, name, slug')
      .order('name'),
  ]);

  const subscribedIds = new Set(
    (subscriptionsResult.data || []).map((s: any) => s.report_id)
  );

  const reports = (reportsResult.data || []).map((r: any) => ({
    ...r,
    is_subscribed: subscribedIds.has(r.id),
    // Handle array relations from Supabase
    commodity: Array.isArray(r.commodities) ? r.commodities[0] : r.commodities,
    market: Array.isArray(r.markets) ? r.markets[0] : r.markets,
  }));

  return (
    <ResearchClient
      reports={reports}
      commodities={commoditiesResult.data || []}
      subscribedCount={subscriptionsResult.data?.length || 0}
    />
  );
}
