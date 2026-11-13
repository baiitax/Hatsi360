import { describe, expect, it } from 'vitest';
import { landingPathForRole, ROLE_WORKSPACE, WORKSPACE_HOME } from '/home/user/pluck-live/src/lib/auth/routing';

describe('demo account landing paths', () => {
  it.each([
    ['agent', '/agent/home'],
    ['verification_officer', '/admin/verification'],
    ['admin', '/admin/overview'],
  ] as const)('role %s lands in %s', (role, expected) => {
    expect(landingPathForRole(role)).toBe(expected);
    expect(WORKSPACE_HOME[ROLE_WORKSPACE[role]]).toBe(expected);
  });

  it('every workspace home is an absolute in-app path', () => {
    for (const p of Object.values(WORKSPACE_HOME)) {
      expect(p.startsWith('/')).toBe(true);
      expect(p.startsWith('//')).toBe(false);
    }
  });
});
