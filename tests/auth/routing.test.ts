import { describe, expect, it } from 'vitest';
import {
  allowedPathPrefixes,
  canRoleVisitPath,
  landingPathForRole,
  loginRedirectFor,
  ROLE_WORKSPACE,
  safeRedirectPath,
  WORKSPACE_HOME,
} from '@/lib/auth/routing';

/**
 * Post-login routing and the redirect allowlist.
 *
 * The browser must not be able to choose where it lands after signing in, and
 * a `next` parameter must never be able to send somebody off-site.
 */

describe('landingPathForRole', () => {
  it('sends a super administrator to the control centre', () => {
    expect(landingPathForRole('super_admin')).toBe('/admin/overview');
  });

  it('sends an administrator to the control centre', () => {
    expect(landingPathForRole('admin')).toBe('/admin/overview');
  });

  it('sends a market agent to the field app', () => {
    expect(landingPathForRole('agent')).toBe('/agent/home');
  });

  it('sends a verification officer to the review queue', () => {
    expect(landingPathForRole('verification_officer')).toBe('/admin/verification');
  });

  it('sends a public user to their dashboard', () => {
    expect(landingPathForRole('public_user')).toBe('/dashboard');
    expect(landingPathForRole('customer')).toBe('/dashboard');
  });
});

describe('the workspace table', () => {
  it('gives every role a workspace', () => {
    for (const role of Object.keys(ROLE_WORKSPACE)) {
      expect(WORKSPACE_HOME[ROLE_WORKSPACE[role as keyof typeof ROLE_WORKSPACE]]).toBeTruthy();
    }
  });
});

describe('canRoleVisitPath', () => {
  it('lets an agent into the field app', () => {
    expect(canRoleVisitPath('agent', '/agent/home')).toBe(true);
    expect(canRoleVisitPath('agent', '/agent/collect')).toBe(true);
  });

  it('keeps an agent out of the control centre', () => {
    expect(canRoleVisitPath('agent', '/admin/overview')).toBe(false);
    expect(canRoleVisitPath('agent', '/admin/agents')).toBe(false);
  });

  it('keeps a market agent out of the agent-only administration areas', () => {
    expect(canRoleVisitPath('market_supervisor', '/admin/agents')).toBe(true);
    expect(canRoleVisitPath('agent', '/admin/agents')).toBe(false);
  });

  it('keeps a verification officer out of the settings', () => {
    expect(canRoleVisitPath('verification_officer', '/admin/settings')).toBe(false);
    expect(canRoleVisitPath('admin', '/admin/settings')).toBe(true);
  });

  it('does not match a path that merely starts with the same letters', () => {
    expect(canRoleVisitPath('agent', '/agentic')).toBe(false);
  });
});

describe('allowedPathPrefixes', () => {
  it('never lists a path outside the role’s own workspace', () => {
    expect(allowedPathPrefixes('agent')).toContain('/agent');
    expect(allowedPathPrefixes('agent')).not.toContain('/admin');
  });
});

describe('safeRedirectPath', () => {
  it('accepts a same-origin path inside a known area', () => {
    expect(safeRedirectPath('/admin/overview', '/dashboard')).toBe('/admin/overview');
    expect(safeRedirectPath('/agent/home', '/dashboard')).toBe('/agent/home');
  });

  it('accepts a path with a query string', () => {
    expect(safeRedirectPath('/prices?commodity=paddy-rice', '/dashboard')).toBe(
      '/prices?commodity=paddy-rice',
    );
  });

  it('refuses an absolute URL', () => {
    expect(safeRedirectPath('https://evil.example.com', '/dashboard')).toBe('/dashboard');
  });

  it('refuses a protocol-relative URL', () => {
    expect(safeRedirectPath('//evil.example.com', '/dashboard')).toBe('/dashboard');
  });

  it('refuses a backslash URL', () => {
    expect(safeRedirectPath('/\\evil.example.com', '/dashboard')).toBe('/dashboard');
    expect(safeRedirectPath('/admin\\evil', '/dashboard')).toBe('/dashboard');
  });

  it('refuses a path with a newline', () => {
    expect(safeRedirectPath('/admin\r\nSet-Cookie: x', '/dashboard')).toBe('/dashboard');
  });

  it('refuses an unknown area', () => {
    expect(safeRedirectPath('/secret-area', '/dashboard')).toBe('/dashboard');
  });

  it('falls back for an empty or missing value', () => {
    expect(safeRedirectPath('', '/dashboard')).toBe('/dashboard');
    expect(safeRedirectPath(null, '/dashboard')).toBe('/dashboard');
    expect(safeRedirectPath(undefined, '/dashboard')).toBe('/dashboard');
  });

  it('refuses an absurdly long value', () => {
    expect(safeRedirectPath(`/${'a'.repeat(600)}`, '/dashboard')).toBe('/dashboard');
  });
});

describe('loginRedirectFor', () => {
  it('returns the landing page when there is no next', () => {
    expect(loginRedirectFor('agent')).toBe('/agent/home');
  });

  it('keeps a valid next', () => {
    expect(loginRedirectFor('agent', '/agent/tasks')).toBe('/login?next=%2Fagent%2Ftasks');
  });

  it('discards a next that is not allowed', () => {
    expect(loginRedirectFor('agent', 'https://evil.example.com')).toBe('/agent/home');
  });
});

describe('the navigation and the path guard agree', () => {
  it('gives every role the same modules in both places', async () => {
    const { ADMIN_NAV } = await import('@/lib/operations/navigation');
    const roles = [
      'verification_officer',
      'market_supervisor',
      'analyst',
      'admin',
      'super_admin',
    ] as const;

    for (const role of roles) {
      const navHrefs = ADMIN_NAV.flatMap((group) =>
        group.items.filter((item) => item.roles.includes(role)).map((item) => item.href),
      );
      for (const href of navHrefs) {
        expect(canRoleVisitPath(role, href)).toBe(true);
      }
    }
  });
});
