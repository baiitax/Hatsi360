/**
 * GET /api/v1/trade/sources
 * 
 * List configured trade data sources with their sync status.
 */

import { createApiHandler } from '@/lib/api/handler';
import { getTradeDataSources } from '@/lib/trade/ingestion/pipeline';

export const GET = createApiHandler({
  handler: async () => {
    const sources = await getTradeDataSources();

    return {
      trade_data_sources: sources.map((s) => ({
        id: s.id,
        source_type: s.source_type,
        is_active: s.is_active,
        api_base_url: s.api_base_url,
        api_rate_limit: s.api_rate_limit,
        supported_flow_types: s.supported_flow_types,
        min_year: s.min_year,
        max_year: s.max_year,
        auto_sync: s.auto_sync,
        sync_frequency_hours: s.sync_frequency_hours,
        last_sync: {
          at: s.last_sync_at,
          status: s.last_sync_status,
          records: s.last_sync_records,
          error: s.last_sync_error,
        },
        evidence_source: s.evidence_source
          ? {
              code: s.evidence_source.code,
              name: s.evidence_source.name,
              organization: s.evidence_source.organization,
              url: s.evidence_source.url,
            }
          : null,
      })),
      total: sources.length,
    };
  },
});
