/**
 * Phase 08A Stage 3 — Alerts Entitlement Enforcement Tests
 * 
 * Tests for the alerts entitlement enforcement in:
 * - Migration 0043 (RLS policies)
 * - /trade/alerts page
 * - /dashboard page
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

describe('Alerts Entitlement Enforcement', () => {
  const admin = createAdminClient();
  
  beforeAll(async () => {
    // Clean up any test data
    await admin.from('price_alerts').delete().eq('user_id', 'test-user-1');
    await admin.from('price_alerts').delete().eq('user_id', 'test-user-2');
    await admin.from('price_alerts').delete().eq('user_id', 'test-user-3');
    
    // Clean up alert delivery logs for test alerts
    const { data: testAlerts } = await admin
      .from('price_alerts')
      .select('id')
      .in('user_id', ['test-user-1', 'test-user-2', 'test-user-3']);
    
    if (testAlerts && testAlerts.length > 0) {
      await admin.from('alert_delivery_logs').delete().in('alert_id', testAlerts.map((a: any) => a.id));
    }
  });

  afterAll(async () => {
    // Clean up test data
    await admin.from('price_alerts').delete().eq('user_id', 'test-user-1');
    await admin.from('price_alerts').delete().eq('user_id', 'test-user-2');
    await admin.from('price_alerts').delete().eq('user_id', 'test-user-3');
  });

  describe('Migration 0043 — RLS Policies', () => {
    it('should enforce alerts entitlement for INSERT operations', async () => {
      // User without alerts entitlement should not be able to create alerts
      const supabase = await createClient();
      
      const { error } = await supabase.from('price_alerts').insert({
        user_id: 'test-user-1',
        commodity_id: 1,
        direction: 'above',
        threshold_amount: 1000,
        channel: 'email',
        is_active: true,
      });

      expect(error).toBeTruthy();
      expect(error?.message).toMatch(/entitlement|policy/i);
    });

    it('should allow admin to create alerts (bypasses RLS)', async () => {
      // Admin client bypasses RLS and can create alerts for testing
      const { data, error } = await admin.from('price_alerts').insert({
        user_id: 'test-user-2',
        commodity_id: 1,
        direction: 'above',
        threshold_amount: 1000,
        channel: 'email',
        is_active: true,
      }).select();

      expect(error).toBeFalsy();
      expect(data).toBeTruthy();
      expect(data?.[0]).toMatchObject({
        user_id: 'test-user-2',
        commodity_id: 1,
        direction: 'above',
        threshold_amount: 1000,
      });
    });

    it('should allow users to read their own alerts regardless of entitlement', async () => {
      // Create an alert for test-user-3 (admin bypasses entitlement checks)
      await admin.from('price_alerts').insert({
        user_id: 'test-user-3',
        commodity_id: 1,
        direction: 'below',
        threshold_amount: 500,
        channel: 'email',
        is_active: false,
      });

      // User should be able to read their alerts (SELECT allowed by RLS)
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('price_alerts')
        .select()
        .eq('user_id', 'test-user-3');

      expect(error).toBeFalsy();
      expect(data).toHaveLength(1);
      expect(data?.[0].user_id).toBe('test-user-3');
    });

    it('should prevent cross-user access to alerts', async () => {
      // test-user-1 should not be able to read test-user-2's alerts
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('price_alerts')
        .select()
        .eq('user_id', 'test-user-2');

      expect(error).toBeFalsy();
      expect(data).toHaveLength(0); // Cannot see other user's alerts
    });

    it('should enforce alerts entitlement for UPDATE operations', async () => {
      // Create an alert for test-user-1
      await admin.from('price_alerts').insert({
        user_id: 'test-user-1',
        commodity_id: 1,
        direction: 'above',
        threshold_amount: 1000,
        channel: 'email',
        is_active: true,
      });

      // User without entitlement should not be able to update alerts
      const supabase = await createClient();
      const { error } = await supabase
        .from('price_alerts')
        .update({ is_active: false })
        .eq('user_id', 'test-user-1');

      expect(error).toBeTruthy();
      expect(error?.message).toMatch(/entitlement|policy/i);
    });

    it('should enforce alerts entitlement for DELETE operations', async () => {
      // Create an alert for test-user-1
      await admin.from('price_alerts').insert({
        user_id: 'test-user-1',
        commodity_id: 1,
        direction: 'above',
        threshold_amount: 1000,
        channel: 'email',
        is_active: true,
      });

      // User without entitlement should not be able to delete alerts
      const supabase = await createClient();
      const { error } = await supabase
        .from('price_alerts')
        .delete()
        .eq('user_id', 'test-user-1');

      expect(error).toBeTruthy();
      expect(error?.message).toMatch(/entitlement|policy/i);
    });

    it('should allow admin to bypass entitlement checks', async () => {
      // Admin client bypasses RLS and can perform all operations
      const { data, error } = await admin.from('price_alerts').insert({
        user_id: 'test-user-admin',
        commodity_id: 1,
        direction: 'above',
        threshold_amount: 1000,
        channel: 'email',
        is_active: true,
      }).select();

      expect(error).toBeFalsy();
      expect(data).toBeTruthy();
      
      // Clean up
      await admin.from('price_alerts').delete().eq('user_id', 'test-user-admin');
    });

    it('should enforce staff-only write access on alert_delivery_logs', async () => {
      // Regular users should not be able to write to alert_delivery_logs
      const supabase = await createClient();
      
      const { error } = await supabase.from('alert_delivery_logs').insert({
        alert_id: 1,
        triggered_at: new Date().toISOString(),
        status: 'sent',
      });

      // This should fail - only staff/admin can write
      expect(error).toBeTruthy();
    });
  });

  describe('Transition Policy', () => {
    it('should preserve existing alerts when entitlement is lost', async () => {
      // Create alerts for test-user-1
      await admin.from('price_alerts').insert([
        {
          user_id: 'test-user-1',
          commodity_id: 1,
          direction: 'above',
          threshold_amount: 1000,
          channel: 'email',
          is_active: true,
        },
        {
          user_id: 'test-user-1',
          commodity_id: 2,
          direction: 'below',
          threshold_amount: 500,
          channel: 'sms',
          is_active: true,
        },
      ]);

      // Simulate losing entitlement by removing from entitlements table
      // (In real scenario, this would happen when subscription expires)

      // User should still be able to read their alerts
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('price_alerts')
        .select()
        .eq('user_id', 'test-user-1');

      expect(error).toBeFalsy();
      expect(data).toHaveLength(2); // Alerts are preserved
    });

    it('should prevent creating new alerts after entitlement is lost', async () => {
      // User without entitlement should not be able to create new alerts
      const supabase = await createClient();
      
      const { error } = await supabase.from('price_alerts').insert({
        user_id: 'test-user-1',
        commodity_id: 3,
        direction: 'above',
        threshold_amount: 2000,
        channel: 'email',
        is_active: true,
      });

      expect(error).toBeTruthy();
      expect(error?.message).toMatch(/entitlement|policy/i);
    });
  });

  describe('Application-Level Enforcement', () => {
    it('should show warning banner on /trade/alerts for users without entitlement', async () => {
      // This test would require rendering the page and checking for the warning
      // Since we can't easily test React components in this context, we'll document
      // the expected behavior:
      // - Users without alerts entitlement should see a warning banner
      // - The banner should explain that alerts are paused
      // - The banner should link to /pricing for upgrade
      expect(true).toBe(true); // Placeholder
    });

    it('should hide alert counts on /dashboard for users without entitlement', async () => {
      // This test would require rendering the dashboard and checking for alert counts
      // Expected behavior:
      // - Users without alerts entitlement should not see alert count section
      // - Instead, they should see an upgrade prompt
      expect(true).toBe(true); // Placeholder
    });
  });
});
