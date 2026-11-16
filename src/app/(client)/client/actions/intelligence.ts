'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// ─── Watchlist Actions ─────────────────────────────────────────────────────

export async function saveCommodity(commodityId: number, note?: string) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { error: 'Not authenticated' };
  }

  // Check entitlement
  const { data: hasEntitlement } = await supabase.rpc('has_entitlement', {
    entitlement_key: 'watchlists',
  });

  if (!hasEntitlement) {
    return { error: 'Watchlist feature requires a premium subscription' };
  }

  const { error } = await supabase.from('saved_commodities').insert({
    user_id: session.user.id,
    commodity_id: commodityId,
    note: note || null,
  });

  if (error) {
    // Unique constraint violation means already saved
    if (error.code === '23505') {
      return { error: 'Commodity already in watchlist' };
    }
    return { error: error.message };
  }

  revalidatePath('/client');
  revalidatePath('/client/watchlists');
  revalidatePath('/client/commodities');
  return { success: true };
}

export async function removeSavedCommodity(commodityId: number) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('saved_commodities')
    .delete()
    .eq('user_id', session.user.id)
    .eq('commodity_id', commodityId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/client');
  revalidatePath('/client/watchlists');
  revalidatePath('/client/commodities');
  return { success: true };
}

export async function saveMarket(marketId: number, note?: string) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { error: 'Not authenticated' };
  }

  const { data: hasEntitlement } = await supabase.rpc('has_entitlement', {
    entitlement_key: 'watchlists',
  });

  if (!hasEntitlement) {
    return { error: 'Watchlist feature requires a premium subscription' };
  }

  const { error } = await supabase.from('saved_markets').insert({
    user_id: session.user.id,
    market_id: marketId,
    note: note || null,
  });

  if (error) {
    if (error.code === '23505') {
      return { error: 'Market already in watchlist' };
    }
    return { error: error.message };
  }

  revalidatePath('/client');
  revalidatePath('/client/watchlists');
  revalidatePath('/client/markets');
  return { success: true };
}

export async function removeSavedMarket(marketId: number) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('saved_markets')
    .delete()
    .eq('user_id', session.user.id)
    .eq('market_id', marketId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/client');
  revalidatePath('/client/watchlists');
  revalidatePath('/client/markets');
  return { success: true };
}

// ─── Alert Actions ─────────────────────────────────────────────────────────

export async function createPriceAlert(data: {
  commodityId: number;
  marketId?: number;
  direction: 'above' | 'below' | 'any';
  thresholdAmount?: number;
  thresholdPercent?: number;
  channel: 'email' | 'sms' | 'webhook';
}) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { error: 'Not authenticated' };
  }

  // Check entitlement
  const { data: hasEntitlement } = await supabase.rpc('has_entitlement', {
    entitlement_key: 'alerts',
  });

  if (!hasEntitlement) {
    return { error: 'Price alerts require a premium subscription' };
  }

  // Check alert limit (Professional: 50, Enterprise: unlimited)
  const { count: alertCount } = await supabase
    .from('price_alerts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', session.user.id);

  // For now, limit to 50 for all non-enterprise users
  if (alertCount && alertCount >= 50) {
    return { error: 'Alert limit reached (50). Upgrade to Enterprise for unlimited alerts.' };
  }

  const { error } = await supabase.from('price_alerts').insert({
    user_id: session.user.id,
    commodity_id: data.commodityId,
    market_id: data.marketId || null,
    direction: data.direction,
    threshold_amount: data.thresholdAmount || null,
    threshold_percent: data.thresholdPercent || null,
    channel: data.channel,
    is_active: true,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/client');
  revalidatePath('/client/alerts');
  return { success: true };
}

export async function updatePriceAlert(
  alertId: number,
  data: {
    direction?: 'above' | 'below' | 'any';
    thresholdAmount?: number;
    thresholdPercent?: number;
    channel?: 'email' | 'sms' | 'webhook';
    isActive?: boolean;
  }
) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { error: 'Not authenticated' };
  }

  const updates: any = {};
  if (data.direction !== undefined) updates.direction = data.direction;
  if (data.thresholdAmount !== undefined) updates.threshold_amount = data.thresholdAmount;
  if (data.thresholdPercent !== undefined) updates.threshold_percent = data.thresholdPercent;
  if (data.channel !== undefined) updates.channel = data.channel;
  if (data.isActive !== undefined) updates.is_active = data.isActive;

  const { error } = await supabase
    .from('price_alerts')
    .update(updates)
    .eq('id', alertId)
    .eq('user_id', session.user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/client/alerts');
  return { success: true };
}

export async function deletePriceAlert(alertId: number) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('price_alerts')
    .delete()
    .eq('id', alertId)
    .eq('user_id', session.user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/client');
  revalidatePath('/client/alerts');
  return { success: true };
}

// ─── Notification Actions ──────────────────────────────────────────────────

export async function markNotificationAsRead(notificationId: number) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', session.user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/client/notifications');
  revalidatePath('/client');
  return { success: true };
}

export async function markAllNotificationsAsRead() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', session.user.id)
    .is('read_at', null);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/client/notifications');
  revalidatePath('/client');
  return { success: true };
}
