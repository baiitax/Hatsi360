import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';

/**
 * Supabase email-confirmation and password-reset callback.
 *
 * The provider redirects here with a one-time code. We exchange it for a
 * session and set the session cookies on the response, then send the visitor
 * on to the right place.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/dashboard';

  // Only allow same-origin relative redirects.
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL('/login?error=not_configured', url.origin));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL('/login?error=invalid_code', url.origin));
  }

  return NextResponse.redirect(new URL(safeNext, url.origin));
}
