import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';

/**
 * Sign out.
 *
 * A POST route, so a link cannot be used to sign somebody out, and the
 * session cookie is cleared server-side before the redirect.
 */
export async function POST(request: Request) {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  const target = new URL('/', request.url);
  return NextResponse.redirect(target, { status: 303 });
}
