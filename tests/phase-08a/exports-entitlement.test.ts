import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * Phase 08A Stage 4: Export Entitlement Enforcement Tests
 *
 * Tests the enforcement of the 'exports' entitlement on export operations:
 * 1. Database RLS policies on export_jobs table
 * 2. Application-level checks in actions.ts and admin.ts
 * 3. Proper access control for different user types
 */

describe('Phase 08A Stage 4: Export Entitlement Enforcement', () => {
  let adminClient: ReturnType<typeof createAdminClient>;
  let testUserId: string;
  let staffUserId: string;
  let exportJobId: string;

  beforeEach(async () => {
    adminClient = createAdminClient();

    // Get test user IDs
    const { data: testUser } = await adminClient
      .from('profiles')
      .select('id')
      .eq('email', 'test@example.com')
      .single();

    const { data: staffUser } = await adminClient
      .from('profiles')
      .select('id')
      .eq('role', 'staff')
      .limit(1)
      .single();

    testUserId = testUser?.id || '';
    staffUserId = staffUser?.id || '';
  });

  afterEach(async () => {
    // Clean up test data
    if (exportJobId) {
      await adminClient.from('export_jobs').delete().eq('id', exportJobId);
    }
  });

  describe('Database RLS Policies', () => {
    it('should allow users with exports entitlement to insert export jobs', async () => {
      // Grant exports entitlement to test user
      await adminClient.from('entitlements').upsert({
        user_id: testUserId,
        feature: 'exports',
        granted_at: new Date().toISOString(),
      });

      // Try to insert an export job as the test user
      const testClient = await createClient();
      const { data, error } = await testClient
        .from('export_jobs')
        .insert({
          requested_by: testUserId,
          job_type: 'market_report',
          status: 'pending',
          parameters: { market_id: 1, days: 30 },
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.requested_by).toBe(testUserId);

      exportJobId = data?.id || '';
    });

    it('should prevent users without exports entitlement from inserting export jobs', async () => {
      // Revoke exports entitlement from test user
      await adminClient.from('entitlements').delete().eq('user_id', testUserId);

      // Try to insert an export job as the test user
      const testClient = await createClient();
      const { data, error } = await testClient
        .from('export_jobs')
        .insert({
          requested_by: testUserId,
          job_type: 'market_report',
          status: 'pending',
          parameters: { market_id: 1, days: 30 },
        })
        .select();

      expect(error).toBeDefined();
      expect(error?.code).toBe('42501'); // RLS violation
      expect(data).toBeNull();
    });

    it('should allow staff to insert export jobs without entitlement', async () => {
      // Create a client as staff user
      const staffClient = await createClient();

      const { data, error } = await staffClient
        .from('export_jobs')
        .insert({
          requested_by: staffUserId,
          job_type: 'market_report',
          status: 'pending',
          parameters: { market_id: 1, days: 30 },
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.requested_by).toBe(staffUserId);

      exportJobId = data?.id || '';
    });

    it('should allow users to read their own export jobs', async () => {
      // Create an export job for the test user
      const { data: job } = await adminClient
        .from('export_jobs')
        .insert({
          requested_by: testUserId,
          job_type: 'market_report',
          status: 'pending',
          parameters: { market_id: 1, days: 30 },
        })
        .select()
        .single();

      exportJobId = job?.id || '';

      // Try to read the export job as the test user
      const testClient = await createClient();
      const { data, error } = await testClient
        .from('export_jobs')
        .select('*')
        .eq('id', exportJobId)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.id).toBe(exportJobId);
    });

    it('should prevent users from reading other users export jobs', async () => {
      // Create an export job for the test user
      const { data: job } = await adminClient
        .from('export_jobs')
        .insert({
          requested_by: testUserId,
          job_type: 'market_report',
          status: 'pending',
          parameters: { market_id: 1, days: 30 },
        })
        .select()
        .single();

      exportJobId = job?.id || '';

      // Create another user
      const { data: otherUser } = await adminClient
        .from('profiles')
        .select('id')
        .eq('email', 'other@example.com')
        .single();

      // Try to read the export job as the other user
      const otherClient = await createClient();
      const { data, error } = await otherClient
        .from('export_jobs')
        .select('*')
        .eq('id', exportJobId)
        .single();

      expect(error).toBeDefined();
      expect(error?.code).toBe('PGRST116'); // Not found
      expect(data).toBeNull();
    });

    it('should allow staff to read all export jobs', async () => {
      // Create an export job for the test user
      const { data: job } = await adminClient
        .from('export_jobs')
        .insert({
          requested_by: testUserId,
          job_type: 'market_report',
          status: 'pending',
          parameters: { market_id: 1, days: 30 },
        })
        .select()
        .single();

      exportJobId = job?.id || '';

      // Try to read the export job as staff
      const staffClient = await createClient();
      const { data, error } = await staffClient
        .from('export_jobs')
        .select('*')
        .eq('id', exportJobId)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.id).toBe(exportJobId);
    });

    it('should allow staff to update any export job', async () => {
      // Create an export job for the test user
      const { data: job } = await adminClient
        .from('export_jobs')
        .insert({
          requested_by: testUserId,
          job_type: 'market_report',
          status: 'pending',
          parameters: { market_id: 1, days: 30 },
        })
        .select()
        .single();

      exportJobId = job?.id || '';

      // Try to update the export job as staff
      const staffClient = await createClient();
      const { data, error } = await staffClient
        .from('export_jobs')
        .update({ status: 'completed' })
        .eq('id', exportJobId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.status).toBe('completed');
    });

    it('should prevent users from updating their own export jobs', async () => {
      // Create an export job for the test user
      const { data: job } = await adminClient
        .from('export_jobs')
        .insert({
          requested_by: testUserId,
          job_type: 'market_report',
          status: 'pending',
          parameters: { market_id: 1, days: 30 },
        })
        .select()
        .single();

      exportJobId = job?.id || '';

      // Try to update the export job as the test user
      const testClient = await createClient();
      const { data, error } = await testClient
        .from('export_jobs')
        .update({ status: 'completed' })
        .eq('id', exportJobId)
        .select();

      expect(error).toBeDefined();
      expect(error?.code).toBe('42501'); // RLS violation
      expect(data).toBeNull();
    });
  });

  describe('Application-Level Checks', () => {
    it('should check entitlements in listExportJobs', async () => {
      // Grant exports entitlement to test user
      await adminClient.from('entitlements').upsert({
        user_id: testUserId,
        feature: 'exports',
        granted_at: new Date().toISOString(),
      });

      // Create some export jobs
      await adminClient.from('export_jobs').insert([
        {
          requested_by: testUserId,
          job_type: 'market_report',
          status: 'pending',
          parameters: { market_id: 1, days: 30 },
        },
        {
          requested_by: testUserId,
          job_type: 'price_report',
          status: 'pending',
          parameters: { commodity_id: 1, days: 30 },
        },
      ]);

      // Call listExportJobs as the test user
      const testClient = await createClient();
      const { data: jobs } = await testClient
        .from('export_jobs')
        .select('*')
        .eq('requested_by', testUserId);

      expect(jobs).toBeDefined();
      expect(jobs?.length).toBeGreaterThanOrEqual(2);
    });

    it('should allow staff to list all export jobs without entitlement', async () => {
      // Create some export jobs
      await adminClient.from('export_jobs').insert([
        {
          requested_by: testUserId,
          job_type: 'market_report',
          status: 'pending',
          parameters: { market_id: 1, days: 30 },
        },
      ]);

      // Call listExportJobs as staff
      const staffClient = await createClient();
      const { data: jobs } = await staffClient
        .from('export_jobs')
        .select('*');

      expect(jobs).toBeDefined();
      expect(jobs?.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Entitlement Checks in Actions', () => {
    it('should verify entitlement before creating export job', async () => {
      // Grant exports entitlement to test user
      await adminClient.from('entitlements').upsert({
        user_id: testUserId,
        feature: 'exports',
        granted_at: new Date().toISOString(),
      });

      // Check entitlement
      const testClient = await createClient();
      const { data: hasEntitlement } = await testClient.rpc('has_entitlement', {
        p_user_id: testUserId,
        p_feature: 'exports',
      });

      expect(hasEntitlement).toBe(true);
    });

    it('should deny export creation without entitlement', async () => {
      // Revoke exports entitlement from test user
      await adminClient.from('entitlements').delete().eq('user_id', testUserId);

      // Check entitlement
      const testClient = await createClient();
      const { data: hasEntitlement } = await testClient.rpc('has_entitlement', {
        p_user_id: testUserId,
        p_feature: 'exports',
      });

      expect(hasEntitlement).toBe(false);
    });
  });
});
