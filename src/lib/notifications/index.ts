import 'server-only';

import { createHash } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';

/**
 * Pluck Live — notification service.
 *
 * In-app delivery is the only channel that is switched on. Email, SMS and
 * WhatsApp are implemented as *adapters with a documented boundary*: they
 * exist, they are typed, and they report themselves as unconfigured until a
 * provider credential is present. Nothing here ever claims a message was
 * delivered when the provider did not say so.
 */

export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'whatsapp' | 'push';

export interface Notification {
  id: string;
  userId: string;
  kind: string;
  severity: string;
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: string | null;
  actionUrl: string | null;
  metadata: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface DeliveryAdapter {
  channel: NotificationChannel;
  /** The environment variable that has to be present for this adapter to work. */
  requiresEnv: string[];
  /** True when the adapter is ready to deliver. */
  isConfigured(): boolean;
  /** Deliver one notification. Returns the provider's own status. */
  deliver(notification: Notification): Promise<DeliveryResult>;
}

export interface DeliveryResult {
  status: 'sent' | 'delivered' | 'failed' | 'skipped';
  provider?: string;
  providerMessageId?: string;
  error?: string;
}

/**
 * The external channels are not configured in this deployment.
 *
 * They are wired as adapters so that adding a provider is a matter of
 * supplying credentials and an implementation — not of changing the calling
 * code. Until then, `deliver` reports `skipped`, never `delivered`.
 */
export const externalChannelAdapters: DeliveryAdapter[] = [
  {
    channel: 'email',
    requiresEnv: ['NOTIFICATION_EMAIL_PROVIDER', 'NOTIFICATION_EMAIL_API_KEY'],
    isConfigured() {
      return Boolean(
        process.env.NOTIFICATION_EMAIL_PROVIDER && process.env.NOTIFICATION_EMAIL_API_KEY,
      );
    },
    async deliver(): Promise<DeliveryResult> {
      return {
        status: 'skipped',
        error: 'No email provider is configured. The notification remains in the in-app inbox.',
      };
    },
  },
  {
    channel: 'sms',
    requiresEnv: ['NOTIFICATION_SMS_PROVIDER', 'NOTIFICATION_SMS_API_KEY'],
    isConfigured() {
      return Boolean(
        process.env.NOTIFICATION_SMS_PROVIDER && process.env.NOTIFICATION_SMS_API_KEY,
      );
    },
    async deliver(): Promise<DeliveryResult> {
      return {
        status: 'skipped',
        error: 'No SMS provider is configured. The notification remains in the in-app inbox.',
      };
    },
  },
  {
    channel: 'whatsapp',
    requiresEnv: ['NOTIFICATION_WHATSAPP_PROVIDER', 'NOTIFICATION_WHATSAPP_TOKEN'],
    isConfigured() {
      return Boolean(
        process.env.NOTIFICATION_WHATSAPP_PROVIDER && process.env.NOTIFICATION_WHATSAPP_TOKEN,
      );
    },
    async deliver(): Promise<DeliveryResult> {
      return {
        status: 'skipped',
        error: 'No WhatsApp provider is configured. The notification remains in the in-app inbox.',
      };
    },
  },
];

/** Which channels are live in this deployment. */
export function channelStatus(): { channel: NotificationChannel; configured: boolean }[] {
  return [
    { channel: 'in_app', configured: true },
    ...externalChannelAdapters.map((adapter) => ({
      channel: adapter.channel,
      configured: adapter.isConfigured(),
    })),
  ];
}

/* --------------------------------------------------------------- reading -- */

export async function listNotifications(
  userId: string,
  options: { limit?: number; unreadOnly?: boolean } = {},
): Promise<Notification[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();

  let query = supabase
    .from('notifications')
    .select(
      'id, user_id, kind, severity, title, body, entity_type, entity_id, action_url, metadata, read_at, created_at',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(options.limit ?? 25);

  if (options.unreadOnly) query = query.is('read_at', null);

  const { data } = await query;
  return (data ?? []).map(mapNotification);
}

export async function unreadCount(userId: string): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const supabase = await createClient();
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);
  return count ?? 0;
}

export async function markRead(userId: string, notificationIds: string[]): Promise<number> {
  if (!isSupabaseConfigured() || notificationIds.length === 0) return 0;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .in('id', notificationIds)
    .select('id');
  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

/* -------------------------------------------------------------- creation -- */

/**
 * Create a notification for one recipient.
 *
 * The row and its in-app delivery record are written by the database function
 * `public.notify`, so the recipient check, the audit trail and the delivery
 * log all happen in one transaction.
 */
export async function createNotification(input: {
  userId: string;
  kind: string;
  title: string;
  body?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  actionUrl?: string | null;
  severity?: 'low' | 'normal' | 'high' | 'critical';
  metadata?: Record<string, unknown>;
}): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('notify', {
    p_user_id: input.userId,
    p_kind: input.kind,
    p_title: input.title,
    p_body: input.body ?? null,
    p_entity_type: input.entityType ?? null,
    p_entity_id: input.entityId ?? null,
    p_action_url: input.actionUrl ?? null,
    p_severity: input.severity ?? 'normal',
    p_metadata: input.metadata ?? {},
  });

  if (error) throw new Error(error.message);
  return (data as string | null) ?? null;
}

/**
 * Attempt to deliver the queued notifications on the external channels.
 *
 * Nothing is marked delivered unless the provider confirms it. A channel that
 * is not configured leaves the notification in the in-app inbox only.
 */
export async function deliverPending(): Promise<{
  attempted: number;
  delivered: number;
  failed: number;
  skipped: number;
}> {
  const summary = { attempted: 0, delivered: 0, failed: 0, skipped: 0 };
  if (!isSupabaseConfigured()) return summary;

  const supabase = await createClient();
  const { data } = await supabase
    .from('notification_delivery_logs')
    .select('id, notification_id, channel, status')
    .in('status', ['queued', 'failed'])
    .limit(200);

  for (const log of data ?? []) {
    const adapter = externalChannelAdapters.find((a) => a.channel === log.channel);
    if (!adapter) continue;
    summary.attempted += 1;

    if (!adapter.isConfigured()) {
      await supabase
        .from('notification_delivery_logs')
        .update({ status: 'skipped', error: 'Channel is not configured.' })
        .eq('id', log.id);
      summary.skipped += 1;
      continue;
    }

    const result = await adapter.deliver({
      id: log.notification_id,
      userId: '',
      kind: '',
      severity: 'normal',
      title: '',
      body: null,
      entityType: null,
      entityId: null,
      actionUrl: null,
      metadata: {},
      readAt: null,
      createdAt: new Date().toISOString(),
    });

    await supabase
      .from('notification_delivery_logs')
      .update({
        status: result.status,
        provider: result.provider ?? adapter.channel,
        provider_message_id: result.providerMessageId ?? null,
        attempt_count: 1,
        error: result.error ?? null,
      })
      .eq('id', log.id);

    if (result.status === 'delivered' || result.status === 'sent') summary.delivered += 1;
    else summary.failed += 1;
  }

  return summary;
}

/** A stable, non-reversible identifier for a sign-in attempt. */
export function hashIdentifier(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

function mapNotification(row: Record<string, unknown>): Notification {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    kind: row.kind as string,
    severity: row.severity as string,
    title: row.title as string,
    body: (row.body as string | null) ?? null,
    entityType: (row.entity_type as string | null) ?? null,
    entityId: (row.entity_id as string | null) ?? null,
    actionUrl: (row.action_url as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    readAt: (row.read_at as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}
