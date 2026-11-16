import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AlertsClient } from './AlertsClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Price Alerts — Hatsi360',
  description: 'Manage your price alert configurations',
};

export default async function AlertsPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login?returnUrl=/client/alerts');
  }

  // Fetch in parallel
  const [alertsResult, commoditiesResult, marketsResult, triggerLogsResult] = await Promise.all([
    supabase
      .from('price_alerts')
      .select(`
        id,
        direction,
        threshold_amount,
        threshold_percent,
        channel,
        is_active,
        last_triggered_at,
        created_at,
        commodities:commodity_id(id, name, slug),
        markets:market_id(id, name, slug)
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('commodities')
      .select('id, name, slug')
      .order('name'),
    supabase
      .from('markets')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('alert_trigger_logs')
      .select(`
        id,
        triggered_at,
        trigger_type,
        observation_value,
        commodities:commodity_id(name),
        markets:market_id(name)
      `)
      .eq('user_id', session.user.id)
      .order('triggered_at', { ascending: false })
      .limit(10),
  ]);

  // Normalize array relations
  const alerts = (alertsResult.data || []).map((a: any) => ({
    ...a,
    commodity: Array.isArray(a.commodities) ? a.commodities[0] : a.commodities,
    market: Array.isArray(a.markets) ? a.markets[0] : a.markets,
  }));

  const triggerLogs = (triggerLogsResult.data || []).map((t: any) => ({
    ...t,
    commodity: Array.isArray(t.commodities) ? t.commodities[0] : t.commodities,
    market: Array.isArray(t.markets) ? t.markets[0] : t.markets,
  }));

  // Check entitlement
  const { data: hasAlertEntitlement } = await supabase.rpc('has_entitlement', {
    entitlement_key: 'alerts',
  });

  return (
    <AlertsClient
      alerts={alerts}
      commodities={commoditiesResult.data || []}
      markets={marketsResult.data || []}
      triggerLogs={triggerLogs}
      hasEntitlement={!!hasAlertEntitlement}
      alertCount={alerts.length}
    />
  );
}
