/**
 * Intelligence Ingestion Orchestrator
 *
 * Coordinates data ingestion from all external sources. Provides a
 * unified entry point for triggering syncs and tracking their results.
 *
 * This service enforces the provenance chain: every data point in the
 * intelligence tables must be traceable to a source and sync event.
 */

import { createClient } from '@/lib/supabase/server';
import { getSourceByCode, createSyncEvent, completeSyncEvent } from '../service';
import { ingestFAOSTATProduction, ingestFAOSTATTrade } from './faostat';
import { ingestUSDASupplyDemand } from './usda-fas';
import { ingestCBNExchangeRates } from './cbn';
import type { IngestionResult, SourceSyncEvent } from '../types';

// ── Supported Source Codes ──────────────────────────────────────────────────

type SourceCode = 'faostat' | 'usda_fas' | 'nbs' | 'cbn';

const SUPPORTED_SOURCES: SourceCode[] = ['faostat', 'usda_fas', 'nbs', 'cbn'];

// ── Ingestion Orchestrator ──────────────────────────────────────────────────

export interface IngestionRequest {
  sourceCode: SourceCode;
  syncType: SourceSyncEvent['sync_type'];
  triggeredBy?: string;
  data?: Record<string, unknown>; // For manual uploads (e.g., exchange rates)
}

export interface IngestionResponse {
  source_code: string;
  sync_event_id: number;
  status: 'completed' | 'failed' | 'partial';
  result: IngestionResult;
  duration_ms: number;
}

/**
 * Execute a data ingestion from an external source.
 *
 * Flow:
 * 1. Validate source exists and is active
 * 2. Create a sync event record (audit trail)
 * 3. Run the source-specific ingestion
 * 4. Complete the sync event with results
 * 5. Return the outcome
 */
export async function runIngestion(
  request: IngestionRequest
): Promise<IngestionResponse> {
  const startTime = Date.now();

  // Validate source
  if (!SUPPORTED_SOURCES.includes(request.sourceCode)) {
    throw new Error(`Unsupported source code: ${request.sourceCode}. Supported: ${SUPPORTED_SOURCES.join(', ')}`);
  }

  const source = await getSourceByCode(request.sourceCode);
  if (!source) {
    throw new Error(`Source '${request.sourceCode}' not found in evidence_sources table`);
  }
  if (!source.is_active) {
    throw new Error(`Source '${request.sourceCode}' is not active`);
  }

  // Create sync event
  const syncEvent = await createSyncEvent(
    source.id,
    request.syncType,
    request.triggeredBy
  );

  const context = {
    source_id: source.id,
    sync_event_id: syncEvent.id,
    triggered_by: request.triggeredBy,
  };

  // Execute source-specific ingestion
  let result: IngestionResult;

  try {
    switch (request.sourceCode) {
      case 'faostat':
        result = await runFAOSTATIngestion(context);
        break;
      case 'usda_fas':
        result = await ingestUSDASupplyDemand(context);
        break;
      case 'cbn':
        result = await runCBNIngestion(context, request.data);
        break;
      case 'nbs':
        // NBS requires manual data entry or file upload — not automated yet
        result = {
          records_fetched: 0,
          records_inserted: 0,
          records_updated: 0,
          records_skipped: 0,
          errors: ['NBS automated ingestion not yet implemented. Use manual data entry.'],
        };
        break;
      default:
        throw new Error(`No ingestion handler for source: ${request.sourceCode}`);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    result = {
      records_fetched: 0,
      records_inserted: 0,
      records_updated: 0,
      records_skipped: 0,
      errors: [msg],
    };
  }

  // Determine overall status
  const status = result.errors.length === 0
    ? 'completed'
    : result.records_inserted > 0
      ? 'partial'
      : 'failed';

  // Complete the sync event
  await completeSyncEvent(syncEvent.id, {
    status,
    records_fetched: result.records_fetched,
    records_inserted: result.records_inserted,
    records_updated: result.records_updated,
    records_skipped: result.records_skipped,
    error_message: result.errors.length > 0 ? result.errors.join('; ') : undefined,
  });

  return {
    source_code: request.sourceCode,
    sync_event_id: syncEvent.id,
    status,
    result,
    duration_ms: Date.now() - startTime,
  };
}

// ── Source-Specific Runners ─────────────────────────────────────────────────

async function runFAOSTATIngestion(
  context: { source_id: number; sync_event_id: number; triggered_by?: string }
): Promise<IngestionResult> {
  // Run production and trade ingestion in parallel
  const [productionResult, tradeResult] = await Promise.all([
    ingestFAOSTATProduction(context),
    ingestFAOSTATTrade(context),
  ]);

  return {
    records_fetched: productionResult.records_fetched + tradeResult.records_fetched,
    records_inserted: productionResult.records_inserted + tradeResult.records_inserted,
    records_updated: productionResult.records_updated + tradeResult.records_updated,
    records_skipped: productionResult.records_skipped + tradeResult.records_skipped,
    errors: [...productionResult.errors, ...tradeResult.errors],
  };
}

async function runCBNIngestion(
  context: { source_id: number; sync_event_id: number; triggered_by?: string },
  data?: Record<string, unknown>
): Promise<IngestionResult> {
  if (!data || !Array.isArray(data.rates)) {
    return {
      records_fetched: 0,
      records_inserted: 0,
      records_updated: 0,
      records_skipped: 0,
      errors: ['CBN ingestion requires exchange rate data in request.rates'],
    };
  }

  return ingestCBNExchangeRates(context, data.rates as Array<{
    date: string;
    base_currency: string;
    quote_currency: string;
    rate: number;
    source: string;
  }>);
}

// ── Batch Ingestion ─────────────────────────────────────────────────────────

export interface BatchIngestionResult {
  results: IngestionResponse[];
  total_duration_ms: number;
  overall_status: 'completed' | 'partial' | 'failed';
}

/**
 * Run ingestion for all active sources.
 * Useful for scheduled maintenance syncs.
 */
export async function runBatchIngestion(
  triggeredBy?: string
): Promise<BatchIngestionResult> {
  const startTime = Date.now();
  const supabase = await createClient();

  // Get all active sources
  const { data: sources, error } = await supabase
    .from('evidence_sources')
    .select('code, is_active')
    .eq('is_active', true);

  if (error) throw new Error(`Failed to fetch active sources: ${error.message}`);

  const activeSourceCodes = (sources ?? [])
    .map((s) => s.code)
    .filter((code): code is SourceCode => SUPPORTED_SOURCES.includes(code as SourceCode));

  // Run all ingestions
  const results: IngestionResponse[] = [];
  for (const sourceCode of activeSourceCodes) {
    try {
      const result = await runIngestion({
        sourceCode,
        syncType: 'scheduled',
        triggeredBy,
      });
      results.push(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      results.push({
        source_code: sourceCode,
        sync_event_id: 0,
        status: 'failed',
        result: {
          records_fetched: 0,
          records_inserted: 0,
          records_updated: 0,
          records_skipped: 0,
          errors: [msg],
        },
        duration_ms: 0,
      });
    }
  }

  // Determine overall status
  const hasSuccess = results.some((r) => r.status === 'completed');
  const hasFailure = results.some((r) => r.status === 'failed');
  const overallStatus = hasFailure
    ? hasSuccess ? 'partial' : 'failed'
    : 'completed';

  return {
    results,
    total_duration_ms: Date.now() - startTime,
    overall_status: overallStatus,
  };
}

// ── Supported Sources ───────────────────────────────────────────────────────

export function getSupportedSources(): SourceCode[] {
  return [...SUPPORTED_SOURCES];
}
