import type { UserRole } from '@/types/domain';

/**
 * Hatsi360 — where a signed-in person belongs.
 *
 * The routing table is the single place that decides which workspace a role
 * lands in. The server guards enforce the same table, so the redirect after
 * sign-in and the protection of each area cannot drift apart.
 */

export type Workspace = 'admin' | 'agent' | 'staff' | 'public';

export const ROLE_WORKSPACE: Record<UserRole, Workspace> = {
  public_user: 'public',
  customer: 'public',
  agent: 'agent',
  verification_officer: 'staff',
  market_supervisor: 'staff',
  analyst: 'staff',
  admin: 'admin',
  super_admin: 'admin',
};

/** The landing page for each workspace. */
export const WORKSPACE_HOME: Record<Workspace, string> = {
  admin: '/admin/overview',
  agent: '/agent/home',
  staff: '/admin/verification',
  public: '/dashboard',
};

/**
 * The default landing page for a role.
 *
 * An analyst does not land in the agent app, and a market agent does not land
 * in the admin console.
 */
export function landingPathForRole(role: UserRole): string {
  return WORKSPACE_HOME[ROLE_WORKSPACE[role] ?? 'public'];
}

/**
 * The areas a role may open.
 *
 * This is used to answer "is this path mine?". It matches the modules the
 * control centre shows that role, so the navigation and the guard cannot
 * disagree. The database still decides what they can read: the navigation is
 * a convenience, the policies are the control.
 */
const ROLE_PATHS: Record<UserRole, string[]> = {
  public_user: ['/dashboard', '/prices', '/commodities', '/markets', '/compare', '/insights'],
  customer: ['/dashboard', '/prices', '/commodities', '/markets', '/compare', '/insights'],
  agent: ['/agent'],
  market_supervisor: [
    '/agent',
    '/admin/overview',
    '/admin/operations',
    '/admin/search',
    '/admin/verification',
    '/admin/observations',
    '/admin/quality',
    '/admin/tasks',
    '/admin/agents',
    '/admin/assignments',
    '/admin/markets',
    '/admin/zones',
    '/admin/commodities',
    '/admin/categories',
    '/admin/schedule',
    '/admin/reports',
    '/admin/notifications',
    '/admin/profile',
  ],
  verification_officer: [
    '/admin/overview',
    '/admin/operations',
    '/admin/search',
    '/admin/verification',
    '/admin/observations',
    '/admin/quality',
    '/admin/reports',
    '/admin/notifications',
    '/admin/profile',
  ],
  analyst: [
    '/admin/overview',
    '/admin/operations',
    '/admin/search',
    '/admin/analytics',
    '/admin/observations',
    '/admin/quality',
    '/admin/tasks',
    '/admin/markets',
    '/admin/assignments',
    '/admin/commodities',
    '/admin/categories',
    '/admin/grades',
    '/admin/units',
    '/admin/reports',
    '/admin/notifications',
    '/admin/profile',
  ],
  admin: ['/admin'],
  super_admin: ['/admin'],
};

export function allowedPathPrefixes(role: UserRole): string[] {
  return ROLE_PATHS[role] ?? ROLE_PATHS.public_user;
}

/** Is this path inside the role's workspace? */
export function canRoleVisitPath(role: UserRole, path: string): boolean {
  const prefixes = allowedPathPrefixes(role);
  return prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/**
 * The paths a `next` parameter is allowed to point at.
 *
 * Only same-origin absolute paths inside a known area are accepted. Anything
 * else — a protocol-relative URL, an absolute URL, a backslash, a path with a
 * newline — falls back to the role's own landing page.
 */
const ALLOWED_REDIRECT_PREFIXES = [
  '/admin',
  '/agent',
  '/dashboard',
  '/prices',
  '/commodities',
  '/markets',
  '/compare',
  '/insights',
  '/auth',
];

export function safeRedirectPath(next: string | null | undefined, fallback: string): string {
  if (!next) return fallback;

  const candidate = next.trim();

  if (candidate.length === 0 || candidate.length > 512) return fallback;
  // Must be a root-relative path.
  if (!candidate.startsWith('/')) return fallback;
  // `//host` and `/\host` are treated as absolute by browsers.
  if (candidate.startsWith('//') || candidate.startsWith('/\\')) return fallback;
  // No control characters.
  if (/[\r\n\t\0]/.test(candidate)) return fallback;
  // No backslashes anywhere.
  if (candidate.includes('\\')) return fallback;

  const [path] = candidate.split('?');
  const allowed = ALLOWED_REDIRECT_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );

  return allowed ? candidate : fallback;
}

/** The sign-in page's own query parameters that need to survive a redirect. */
export function loginRedirectFor(role: UserRole, next?: string | null): string {
  const landing = landingPathForRole(role);
  const target = safeRedirectPath(next, landing);
  if (target === landing) return landing;
  return `/login?next=${encodeURIComponent(target)}`;
}
