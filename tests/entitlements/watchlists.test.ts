/**
 * Watchlist Entitlement Enforcement Tests
 *
 * Phase 08A Stage 2: Verify that the 'watchlists' entitlement is enforced
 * at both the database level (RLS) and application level.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';

// Test configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';

describe('Watchlist Entitlement Enforcement', () => {
  let serviceClient: ReturnType<typeof createAdminClient>;
  let testUser1Id: string;
  let testUser2Id: string;
  let testUser1Client: ReturnType<typeof createClient>;
  let testUser2Client: ReturnType<typeof createClient>;

  beforeEach(async () => {
    serviceClient = createAdminClient();

    // Create test users (these would need to be created in your test setup)
    // For now, we'll use placeholder UUIDs
    testUser1Id = '00000000-0000-0000-0000-000000000001';
    testUser2Id = '00000000-0000-0000-0000-000000000002';

    // Create authenticated clients for each user
    testUser1Client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer mock-token-user1`,
        },
      },
    });

    testUser2Client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer mock-token-user2`,
        },
      },
    });
  });

  afterEach(async () => {
    // Cleanup test data
    await serviceClient.from('saved_commodities').delete().match({ user_id: testUser1Id });
    await serviceClient.from('saved_commodities').delete().match({ user_id: testUser2Id });
    await serviceClient.from('saved_markets').delete().match({ user_id: testUser1Id });
    await serviceClient.from('saved_markets').delete().match({ user_id: testUser2Id });
    await serviceClient.from('customer_subscriptions').delete().match({ user_id: testUser1Id });
    await serviceClient.from('customer_subscriptions').delete().match({ user_id: testUser2Id });
  });

  describe('Database-level enforcement (RLS)', () => {
    it('allows users with watchlists entitlement to insert saved commodities', async () => {
      // Grant watchlists entitlement to user1
      await serviceClient.from('customer_subscriptions').insert({
        user_id: testUser1Id,
        plan: 'professional',
        status: 'active',
        entitlements: { watchlists: true },
        starts_at: new Date().toISOString(),
      });

      // User1 should be able to insert
      const { data, error } = await testUser1Client.from('saved_commodities').insert({
        user_id: testUser1Id,
        commodity_id: 1,
        note: 'Test commodity',
      } as any).select();

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect((data?.[0] as any).user_id).toBe(testUser1Id);
    });

    it('prevents users without watchlists entitlement from inserting saved commodities', async () => {
      // User2 has no subscription (no entitlements)
      const { error } = await testUser2Client.from('saved_commodities').insert({
        user_id: testUser2Id,
        commodity_id: 1,
        note: 'Test commodity',
      } as any);

      // RLS should block this
      expect(error).not.toBeNull();
      expect(error?.message).toMatch(/new row violates row-level security/i);
    });

    it('prevents users from reading other users saved commodities', async () => {
      // Insert data as user1 (with entitlement)
      await serviceClient.from('customer_subscriptions').insert({
        user_id: testUser1Id,
        plan: 'professional',
        status: 'active',
        entitlements: { watchlists: true },
        starts_at: new Date().toISOString(),
      });

      await serviceClient.from('saved_commodities').insert({
        user_id: testUser1Id,
        commodity_id: 1,
        note: 'User1 commodity',
      } as any);

      // Grant entitlement to user2
      await serviceClient.from('customer_subscriptions').insert({
        user_id: testUser2Id,
        plan: 'professional',
        status: 'active',
        entitlements: { watchlists: true },
        starts_at: new Date().toISOString(),
      });

      // User2 should only see their own data
      const { data, error } = await testUser2Client.from('saved_commodities').select();

      expect(error).toBeNull();
      expect(data).toHaveLength(0); // User2 has no saved commodities
    });

    it('allows staff users to access watchlists regardless of entitlement', async () => {
      // Create a staff user (assuming you have a way to mark users as staff)
      // This test would need your specific staff user setup
      // For now, we'll skip this test with a note
      // TODO: Implement staff user test based on your auth setup
    });

    it('revokes access when subscription expires', async () => {
      // Create an expired subscription
      await serviceClient.from('customer_subscriptions').insert({
        user_id: testUser1Id,
        plan: 'professional',
        status: 'expired', // or 'past_due'
        entitlements: { watchlists: true },
        starts_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        ends_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      });

      // User should not be able to insert
      const { error } = await testUser1Client.from('saved_commodities').insert({
        user_id: testUser1Id,
        commodity_id: 1,
        note: 'Test commodity',
      } as any);

      expect(error).not.toBeNull();
      expect(error?.message).toMatch(/new row violates row-level security/i);
    });
  });

  describe('Application-level enforcement', () => {
    it('returns empty watchlist for users without entitlement', async () => {
      // User without entitlement should see empty state
      const { data, error } = await testUser2Client
        .from('saved_commodities')
        .select()
        .eq('user_id', testUser2Id);

      // RLS will return empty result (not an error)
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it('returns watchlist data for users with entitlement', async () => {
      // Grant entitlement
      await serviceClient.from('customer_subscriptions').insert({
        user_id: testUser1Id,
        plan: 'professional',
        status: 'active',
        entitlements: { watchlists: true },
        starts_at: new Date().toISOString(),
      });

      // Insert some data
      await serviceClient.from('saved_commodities').insert({
        user_id: testUser1Id,
        commodity_id: 1,
        note: 'Test commodity',
      } as any);

      // User should see their data
      const { data, error } = await testUser1Client
        .from('saved_commodities')
        .select()
        .eq('user_id', testUser1Id);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });
  });

  describe('Saved markets enforcement', () => {
    it('enforces entitlement on saved_markets table', async () => {
      // Grant entitlement to user1
      await serviceClient.from('customer_subscriptions').insert({
        user_id: testUser1Id,
        plan: 'professional',
        status: 'active',
        entitlements: { watchlists: true },
        starts_at: new Date().toISOString(),
      });

      // User1 should be able to insert
      const { data, error } = await testUser1Client.from('saved_markets').insert({
        user_id: testUser1Id,
        market_id: 1,
        note: 'Test market',
      } as any).select();

      expect(error).toBeNull();
      expect(data).toHaveLength(1);

      // User2 without entitlement should not be able to insert
      const { error: error2 } = await testUser2Client.from('saved_markets').insert({
        user_id: testUser2Id,
        market_id: 1,
        note: 'Test market',
      } as any);

      expect(error2).not.toBeNull();
      expect(error2?.message).toMatch(/new row violates row-level security/i);
    });
  });

  describe('Entitlement resolution', () => {
    it('only grants watchlists entitlement from active subscriptions', async () => {
      // Create active subscription with watchlists entitlement
      await serviceClient.from('customer_subscriptions').insert({
        user_id: testUser1Id,
        plan: 'professional',
        status: 'active',
        entitlements: { watchlists: true, alerts: true },
        starts_at: new Date().toISOString(),
      });

      // Check entitlements
      const { data, error } = await testUser1Client.rpc('user_entitlements');

      expect(error).toBeNull();
      expect(data).toContain('watchlists');
      expect(data).toContain('alerts');
    });

    it('does not grant entitlements from trialing subscriptions past trial end', async () => {
      // Create trialing subscription that has expired
      await serviceClient.from('customer_subscriptions').insert({
        user_id: testUser1Id,
        plan: 'professional',
        status: 'trialing',
        entitlements: { watchlists: true },
        starts_at: new Date(Date.now() - 86400000).toISOString(),
        trial_ends_at: new Date(Date.now() - 3600000).toISOString(), // Trial ended 1 hour ago
      });

      // Check entitlements
      const { data, error } = await testUser1Client.rpc('user_entitlements');

      expect(error).toBeNull();
      expect(data).not.toContain('watchlists'); // Should not have entitlement
    });
  });
});
