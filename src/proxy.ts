import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * GonaPulse — session proxy.
 *
 * The proxy refreshes the Supabase session cookie when it is close to
 * expiring, so a signed-in agent or administrator is not signed out in the
 * middle of a task. It does not authorise anything: access is decided by the
 * server guards and by the database policies.
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) return supabaseResponse;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  try {
    // `getUser()` verifies the token with the auth server. It is the call that
    // tells us whether the session is genuinely valid.
    await supabase.auth.getUser();
  } catch {
    // A network failure here must not block the request. The guards will
    // still refuse an unusable session.
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and the public API, which must stay
     * reachable without a session.
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api/v1|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
