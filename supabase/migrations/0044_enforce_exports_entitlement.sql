-- Migration 0044: Enforce 'exports' entitlement on export_jobs table
-- Part of Phase 08A Stage 4: Export Entitlement Enforcement
--
-- This migration modifies RLS policies on export_jobs to require the 'exports'
-- entitlement for creating new export jobs. Read access is preserved for users
-- to see their own export jobs (audit trail), and admin access is maintained.

-- Drop existing policies
DROP POLICY IF EXISTS export_jobs_owner_read ON public.export_jobs;
DROP POLICY IF EXISTS export_jobs_insert ON public.export_jobs;
DROP POLICY IF EXISTS export_jobs_update ON public.export_jobs;

-- New policy: Read access (SELECT)
-- Users can see their own export jobs for audit trail purposes
-- Admins can see all export jobs
CREATE POLICY export_jobs_read ON public.export_jobs
  FOR SELECT
  TO authenticated
  USING (
    requested_by = auth.uid() 
    OR public.is_admin()
  );

-- New policy: Insert access (CREATE)
-- Only users with 'exports' entitlement can create new export jobs
-- Admins can create export jobs regardless of entitlement
CREATE POLICY export_jobs_insert_entitled ON public.export_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (requested_by = auth.uid() AND public.has_entitlement('exports'))
    OR public.is_admin()
  );

-- New policy: Update access (UPDATE)
-- Only admins can update export jobs (e.g., mark as complete, update status)
-- Regular users cannot modify their export jobs
CREATE POLICY export_jobs_update_admin ON public.export_jobs
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Verify the policies were created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'export_jobs' AND policyname = 'export_jobs_read'
  ) THEN
    RAISE EXCEPTION 'export_jobs_read policy was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'export_jobs' AND policyname = 'export_jobs_insert_entitled'
  ) THEN
    RAISE EXCEPTION 'export_jobs_insert_entitled policy was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'export_jobs' AND policyname = 'export_jobs_update_admin'
  ) THEN
    RAISE EXCEPTION 'export_jobs_update_admin policy was not created';
  END IF;
END $$;
