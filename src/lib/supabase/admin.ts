import 'server-only';

import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client — **server only**.
 *
 * Used for the handful of jobs that legitimately need to bypass Row Level
 * Security: API credential verification, usage logging, and administrative
 * actions that already re-check authorisation in application code.
 *
 * The secret key must never be imported by a Client Component. `server-only`
 * makes an accidental client import a build-time error rather than a silent
 * credential leak.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Supabase admin access is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
