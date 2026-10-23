import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getSession } from '@/lib/auth';
import { markRead } from '@/lib/notifications';

const bodySchema = z.object({
  notificationIds: z.array(z.string().uuid()).min(1).max(100),
});

/**
 * Mark notifications as read.
 *
 * The update is scoped to the signed-in user, so a caller cannot mark another
 * person's notifications as read even by forging the request.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'No database is configured.' }, { status: 503 });
  }

  const session = await getSession();
  if (!session?.profile) {
    return NextResponse.json({ ok: false, message: 'Sign in first.' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid request.' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: 'Invalid request.' }, { status: 400 });
  }

  try {
    const count = await markRead(session.profile.id, parsed.data.notificationIds);
    return NextResponse.json({ ok: true, count });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'The update failed.' },
      { status: 500 },
    );
  }
}
