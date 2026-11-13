import { describe, expect, it } from 'vitest';
import { authenticateApiKey, checkRateLimit, extractApiKey, hashApiKey } from '@/lib/api/auth';

describe('API key hashing', () => {
  it('produces a stable SHA-256 hash', () => {
    const hash = hashApiKey('pl_live_abc123');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashApiKey('pl_live_abc123')).toBe(hash);
  });

  it('never contains the plaintext key', () => {
    const key = 'pl_live_supersecretvalue';
    expect(hashApiKey(key)).not.toContain(key);
  });

  it('produces a different hash for a different key', () => {
    expect(hashApiKey('pl_live_a')).not.toBe(hashApiKey('pl_live_b'));
  });
});

describe('API key extraction', () => {
  it('reads a Bearer token from the Authorization header', () => {
    const request = new Request('https://example.test/api', {
      headers: { authorization: 'Bearer pl_live_abc123' },
    });
    expect(extractApiKey(request)).toBe('pl_live_abc123');
  });

  it('is case-insensitive about the Bearer scheme', () => {
    const request = new Request('https://example.test/api', {
      headers: { authorization: 'bearer pl_live_abc123' },
    });
    expect(extractApiKey(request)).toBe('pl_live_abc123');
  });

  it('reads the X-API-Key header', () => {
    const request = new Request('https://example.test/api', {
      headers: { 'x-api-key': 'pl_live_abc123' },
    });
    expect(extractApiKey(request)).toBe('pl_live_abc123');
  });

  it('prefers the Authorization header when both are present', () => {
    const request = new Request('https://example.test/api', {
      headers: { authorization: 'Bearer pl_live_first', 'x-api-key': 'pl_live_second' },
    });
    expect(extractApiKey(request)).toBe('pl_live_first');
  });

  it('returns null when no key is supplied', () => {
    expect(extractApiKey(new Request('https://example.test/api'))).toBeNull();
  });

  it('returns null for an Authorization header that is not a bearer token', () => {
    const request = new Request('https://example.test/api', {
      headers: { authorization: 'Basic dXNlcjpwYXNz' },
    });
    expect(extractApiKey(request)).toBeNull();
  });
});

describe('rate limiting', () => {
  it('allows requests up to the limit', () => {
    const now = Date.now();
    for (let i = 0; i < 5; i += 1) {
      const result = checkRateLimit('key-a', 5, now);
      expect(result.allowed).toBe(true);
    }
  });

  it('blocks requests once the limit is reached', () => {
    const now = Date.now();
    for (let i = 0; i < 5; i += 1) checkRateLimit('key-b', 5, now);
    const blocked = checkRateLimit('key-b', 5, now);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('reports the remaining allowance', () => {
    const now = Date.now();
    expect(checkRateLimit('key-c', 10, now).remaining).toBe(9);
    expect(checkRateLimit('key-c', 10, now).remaining).toBe(8);
  });

  it('resets after the window', () => {
    const now = Date.now();
    for (let i = 0; i < 3; i += 1) checkRateLimit('key-d', 3, now);
    expect(checkRateLimit('key-d', 3, now).allowed).toBe(false);
    // Two minutes later the window has rolled over.
    expect(checkRateLimit('key-d', 3, now + 120_000).allowed).toBe(true);
  });

  it('keeps separate buckets for separate keys', () => {
    const now = Date.now();
    for (let i = 0; i < 3; i += 1) checkRateLimit('key-e', 3, now);
    expect(checkRateLimit('key-e', 3, now).allowed).toBe(false);
    expect(checkRateLimit('key-f', 3, now).allowed).toBe(true);
  });
});

describe('the anonymous free tier', () => {
  // Every /api/v1 endpoint is a read-only view of published data. The launch
  // gate asserts "public price API is reachable without a key", /api-docs says
  // "the endpoints below are read-only and currently open", and
  // `anonymousRateLimit` exists for exactly this caller. This group pins that
  // contract: a keyless caller is admitted to a scopeless endpoint and refused
  // one that requires a scope, and this does not depend on whether a database
  // is configured.
  //
  // The bug this covers: the keyless branch sat after the
  // `isSupabaseConfigured()` branch, so a configured project returned 401 for
  // every keyless request and free public price discovery was closed off.

  const anonymousRequest = () =>
    new Request('https://example.test/api/v1/prices/latest?limit=1');

  it('admits a keyless caller to an endpoint with no scope', async () => {
    const result = await authenticateApiKey(anonymousRequest());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.application).toBeNull();
      expect(result.anonymous).toBe(true);
    }
  });

  it('refuses a keyless caller when the endpoint requires a scope', async () => {
    const result = await authenticateApiKey(anonymousRequest(), 'reports:read');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('missing');
  });

  it('keeps the anonymous tier independent of the database configuration', async () => {
    // The configured case is the one that regressed. Setting the variables the
    // config helper reads makes `isSupabaseConfigured()` true, which is the
    // state the deployed project runs in.
    const previous = {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    };
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'publishable-test-key';
    try {
      const result = await authenticateApiKey(anonymousRequest());
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.anonymous).toBe(true);

      const scoped = await authenticateApiKey(anonymousRequest(), 'reports:read');
      expect(scoped.ok).toBe(false);
    } finally {
      if (previous.url === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      else process.env.NEXT_PUBLIC_SUPABASE_URL = previous.url;
      if (previous.key === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = previous.key;
    }
  });

  it('never falls back to the anonymous tier when a key is supplied', async () => {
    // Admitting keyless callers must not weaken key validation: a supplied key
    // goes to the database lookup and either matches or fails. It must never
    // silently degrade into anonymous access.
    //
    // The lookup needs a service-role key, which is not present in the test
    // environment, so it raises. The assertion is on the invariant that matters
    // and is testable here: the anonymous branch is not taken.
    const previous = {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      service: process.env.SUPABASE_SERVICE_ROLE_KEY,
    };
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'publishable-test-key';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    try {
      const request = new Request('https://example.test/api/v1/prices/latest', {
        headers: { authorization: 'Bearer pl_live_notarealkey' },
      });
      let result: Awaited<ReturnType<typeof authenticateApiKey>> | undefined;
      let raised: unknown;
      try {
        result = await authenticateApiKey(request);
      } catch (error) {
        raised = error;
      }
      if (result) {
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.reason).toBe('invalid');
      } else {
        // The only acceptable failure is a configuration error, and never an
        // anonymous success.
        expect(String(raised)).toMatch(/service|key|environment/i);
      }
    } finally {
      if (previous.url === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      else process.env.NEXT_PUBLIC_SUPABASE_URL = previous.url;
      if (previous.key === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = previous.key;
      if (previous.service === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      else process.env.SUPABASE_SERVICE_ROLE_KEY = previous.service;
    }
  });
});
