/**
 * POST /api/v1/intelligence/sync
 *
 * Trigger data ingestion from an external source.
 * Requires admin authentication.
 *
 * Body:
 *   { "source_code": "faostat", "sync_type": "api_fetch" }
 *   or
 *   { "batch": true }  — sync all active sources
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runIngestion, runBatchIngestion } from '@/lib/intelligence/ingestion/orchestrator';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Require authenticated admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 });
    }

    const body = await request.json();

    // Batch sync
    if (body.batch === true) {
      const result = await runBatchIngestion(user.id);
      return NextResponse.json({
        success: true,
        overall_status: result.overall_status,
        total_duration_ms: result.total_duration_ms,
        results: result.results.map((r) => ({
          source_code: r.source_code,
          status: r.status,
          records_inserted: r.result.records_inserted,
          records_skipped: r.result.records_skipped,
          errors: r.result.errors.length,
          duration_ms: r.duration_ms,
        })),
      });
    }

    // Single source sync
    if (!body.source_code) {
      return NextResponse.json(
        { error: 'Missing required field: source_code (or set batch: true)' },
        { status: 400 }
      );
    }

    const result = await runIngestion({
      sourceCode: body.source_code,
      syncType: body.sync_type ?? 'manual',
      triggeredBy: user.id,
      data: body.data,
    });

    return NextResponse.json({
      success: result.status !== 'failed',
      source_code: result.source_code,
      status: result.status,
      sync_event_id: result.sync_event_id,
      records_fetched: result.result.records_fetched,
      records_inserted: result.result.records_inserted,
      records_skipped: result.result.records_skipped,
      errors: result.result.errors,
      duration_ms: result.duration_ms,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[intelligence/sync] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
