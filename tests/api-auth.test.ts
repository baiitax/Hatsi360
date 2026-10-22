import { describe, expect, it } from 'vitest';
import { checkRateLimit, extractApiKey, hashApiKey } from '@/lib/api/auth';

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
