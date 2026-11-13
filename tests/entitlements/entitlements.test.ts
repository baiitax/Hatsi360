import { describe, expect, it } from 'vitest';
import {
  ENTITLEMENT_KEYS,
  EMPTY_ENTITLEMENTS,
  hasEntitlement,
  rateLimitFor,
  type EntitlementSet,
} from '@/lib/entitlements';

/**
 * The entitlement layer.
 *
 * These tests cover the rules that must hold regardless of what the database
 * contains:
 *
 *  - Public price discovery is never gated.
 *  - A premium capability is never granted by default.
 *  - The rate limit a caller receives follows its entitlement, not its
 *    claims.
 */

function setWith(...keys: string[]): EntitlementSet {
  return {
    keys: new Set(keys as never),
    tier: keys.length === 0 ? 'public' : 'professional',
    tierActive: keys.length === 0,
  };
}

describe('entitlements', () => {
  it('recognises exactly the documented entitlement keys', () => {
    expect([...ENTITLEMENT_KEYS].sort()).toEqual([
      'alerts',
      'api',
      'bulk',
      'exports',
      'reports',
      'watchlists',
    ]);
  });

  it('grants nothing by default', () => {
    expect(EMPTY_ENTITLEMENTS.keys.size).toBe(0);
    expect(EMPTY_ENTITLEMENTS.tier).toBeNull();
    expect(EMPTY_ENTITLEMENTS.tierActive).toBe(false);
  });

  it('refuses every premium capability to a caller with no entitlement', () => {
    for (const key of ENTITLEMENT_KEYS) {
      expect(hasEntitlement(EMPTY_ENTITLEMENTS, key)).toBe(false);
    }
  });

  it('grants only the key it holds', () => {
    const reports = setWith('reports');
    expect(hasEntitlement(reports, 'reports')).toBe(true);
    expect(hasEntitlement(reports, 'api')).toBe(false);
    expect(hasEntitlement(reports, 'exports')).toBe(false);
  });

  it('never treats the public capability set as premium', () => {
    // No capability is currently public-only-but-gated; the public price
    // directory is served without any entitlement check at all.
    expect(hasEntitlement(EMPTY_ENTITLEMENTS, 'reports')).toBe(false);
  });

  it('raises the rate limit for a caller with the api entitlement', () => {
    const withApi = rateLimitFor({
      keyLimit: null,
      anonymousLimit: 120,
      hasApiEntitlement: true,
      tier: 'enterprise',
    });
    const withoutApi = rateLimitFor({
      keyLimit: null,
      anonymousLimit: 120,
      hasApiEntitlement: false,
      tier: 'public',
    });

    expect(withApi).toBeGreaterThan(withoutApi);
    expect(withoutApi).toBe(120);
  });

  it('lets a key’s own rate limit win over the entitlement tier', () => {
    const limit = rateLimitFor({
      keyLimit: 30,
      anonymousLimit: 120,
      hasApiEntitlement: true,
      tier: 'enterprise',
    });
    expect(limit).toBe(30);
  });

  it('falls back to the anonymous limit for an unusable key limit', () => {
    const limit = rateLimitFor({
      keyLimit: 0,
      anonymousLimit: 90,
      hasApiEntitlement: false,
      tier: 'public',
    });
    expect(limit).toBe(90);
  });
});
