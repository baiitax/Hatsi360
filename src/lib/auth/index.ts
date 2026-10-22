import 'server-only';

import { cache } from 'react';
import type { User } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import type { UserRole } from '@/types/domain';

export interface SessionProfile {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  phone: string | null;
}

export interface Session {
  user: User;
  profile: SessionProfile | null;
}

/**
 * The signed-in user, or null.
 *
 * `cache()` dedupes the lookup across a single render pass, so a page that
 * checks the session in the header and again in the body only queries once.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role, phone')
    .eq('id', user.id)
    .maybeSingle();

  return {
    user,
    profile: profile
      ? {
          id: profile.id as string,
          email: user.email ?? '',
          fullName: (profile.full_name as string | null) ?? null,
          role: (profile.role as UserRole) ?? 'public_user',
          phone: (profile.phone as string | null) ?? null,
        }
      : null,
  };
});

export async function getUser(): Promise<{ id: string; email: string } | null> {
  const session = await getSession();
  if (!session?.user) return null;
  return { id: session.user.id, email: session.user.email ?? '' };
}

export async function getProfile(): Promise<SessionProfile | null> {
  const session = await getSession();
  return session?.profile ?? null;
}

/** The caller's role, or 'public_user' when signed out. */
export async function getRole(): Promise<UserRole> {
  const profile = await getProfile();
  return profile?.role ?? 'public_user';
}

export async function isSignedIn(): Promise<boolean> {
  return (await getSession()) !== null;
}

/** Roles that may sign in to the internal operations workspace. */
export const OPERATIONS_ROLES: UserRole[] = [
  'agent',
  'verification_officer',
  'market_supervisor',
  'analyst',
  'admin',
  'super_admin',
];

export function hasOperationsAccess(role: UserRole): boolean {
  return OPERATIONS_ROLES.includes(role);
}

export function isStaffRole(role: UserRole): boolean {
  return ['verification_officer', 'market_supervisor', 'analyst', 'admin', 'super_admin'].includes(
    role,
  );
}
