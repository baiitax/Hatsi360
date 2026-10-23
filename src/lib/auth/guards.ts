import 'server-only';

import { redirect } from 'next/navigation';
import { getProfile, hasOperationsAccess, isStaffRole } from './index';
import { canRoleVisitPath, landingPathForRole } from './routing';
import type { UserRole } from '@/types/domain';

/**
 * Pluck Live — server-side route guards.
 *
 * These guards run on the server before a page renders. They are a
 * convenience and a defence in depth; the authority is still Row Level
 * Security in the database and the policies on each table.
 *
 * A suspended or deactivated account is refused everywhere, including the
 * pages that only read.
 */

/** Require a signed-in user with a usable account. */
export async function requireUser(returnTo = '/dashboard') {
  const profile = await getProfile();
  if (!profile) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }
  if (profile.accountStatus !== 'active') {
    redirect(`/login?error=${profile.accountStatus}`);
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

/** Require the administrator workspace. */
export async function requireAdmin(returnTo = '/admin/overview') {
  const profile = await requireUser(returnTo);
  if (profile.role !== 'admin' && profile.role !== 'super_admin') {
    redirect('/dashboard?error=forbidden');
  }
  return profile;
}

/** Require the market agent workspace. */
export async function requireAgent(returnTo = '/agent/home') {
  const profile = await requireUser(returnTo);
  if (profile.role !== 'agent' && profile.role !== 'market_supervisor') {
    redirect('/dashboard?error=forbidden');
  }
  return profile;
}

/**
 * Require that the signed-in role may open the current path.
 *
 * Used by the admin and agent layouts: the layout checks the path it is
 * rendering, so an agent who types `/admin/overview` is sent to their own
 * workspace instead of seeing an empty shell.
 */
export async function requirePathAccess(path: string, returnTo?: string) {
  const profile = await requireUser(returnTo ?? path);
  if (!canRoleVisitPath(profile.role, path)) {
    redirect(landingPathForRole(profile.role));
  }
  return profile;
}
