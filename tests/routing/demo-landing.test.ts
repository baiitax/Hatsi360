import { describe, expect, it } from 'vitest';
import { landingPathForRole, ROLE_WORKSPACE, WORKSPACE_HOME } from '/home/user/pluck-live/src/lib/auth/routing';

describe('demo account landing paths', () => {
  it.each([
    ['agent', '/agent/home'],
    ['verification_officer', '/admin/verification'],
    ['admin', '/admin/overview'],
    // The two accounts the demonstration offers, saved commodities and price
    // alerts belong to. Neither is operational, so neither may be routed into
    // an agent or admin workspace.
    ['customer', '/dashboard'],
    ['public_user', '/dashboard'],
  ] as const)('role %s lands in %s', (role, expected) => {
    expect(landingPathForRole(role)).toBe(expected);
    expect(WORKSPACE_HOME[ROLE_WORKSPACE[role]]).toBe(expected);
  });

  it('never routes a non-operational role into an operational workspace', () => {
    // A customer and a public account are commercial and consumer roles. If
    // either ever resolved to /agent or /admin, the demo would be showing
    // permissions those roles do not hold.
    for (const role of ['customer', 'public_user'] as const) {
      expect(landingPathForRole(role)).not.toMatch(/^\/(agent|admin)/);
    }
  });

  it('every workspace home is an absolute in-app path', () => {
    for (const p of Object.values(WORKSPACE_HOME)) {
      expect(p.startsWith('/')).toBe(true);
      expect(p.startsWith('//')).toBe(false);
    }
  });
});
