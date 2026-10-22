import 'server-only';

import { redirect } from 'next/navigation';
import { getProfile, hasOperationsAccess, isStaffRole } from './index';
import type { UserRole } from '@/types/domain';

/**
 * Require a signed-in user. Redirects to the sign-in page otherwise.
 *
 * The redirect is a convenience, not the enforcement. Every read and write in
 * the application is still checked by Row Level Security in the database.
 */
export async function requireUser(returnTo = '/dashboard') {
  const profile = await getProfile();
  if (!profile) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }
  return profile!;
}

/** Require one of the given roles. */
export async function requireRole(roles: UserRole[], returnTo = '/dashboard') {
  const profile = await requireUser(returnTo);
  if (!roles.includes(profile.role)) {
    redirect('/dashboard?error=forbidden');
  }
  return profile;
}

/** Require access to the internal operations workspace. */
export async function requireOperations(returnTo = '/agent') {
  const profile = await requireUser(returnTo);
  if (!hasOperationsAccess(profile.role)) {
    redirect('/dashboard?error=forbidden');
  }
  return profile;
}

/** Require a staff role (verification, supervision, analysis or administration). */
export async function requireStaff(returnTo = '/admin') {
  const profile = await requireUser(returnTo);
  if (!isStaffRole(profile.role)) {
    redirect('/dashboard?error=forbidden');
  }
  return profile;
}
