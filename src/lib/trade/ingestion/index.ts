/**
 * Trade Data Ingestion Module
 * 
 * Phase 07 Stage 3: International Trade Data Engine
 * 
 * Exports all ingestion-related types, services, and adapters.
 */

// Types
export type {
  TradeFlowType,
  PeriodType,
  ValuationMethod,
  ValidationStatus,
  TariffType,
  RateType,
  TradeDataSourceType,
  SyncStatus,
  TradeDataRecord,
  TradeQueryParams,
  TradeFlowSummary,
  TariffQueryParams,
  TariffSchedule,
  TradeDataSource,
  TradeDataSyncLog,
  IngestionResult,
  TradeDataSourceAdapter,
  ValidationResult,
  TradeFlowAnalytics,
} from './types';

// Validators
export {
  validateTradeRecord,
  validateTradeRecords,
  findDuplicates,
  filterValidRecords,
  deduplicateRecords,
} from './validators';

// Adapters
export { FAOSTATTradeAdapter, faostatTradeAdapter } from './adapters/faostat-trade';

// Pipeline
export {
  ingestTradeData,
  getTradeDataSources,
  getRecentSyncLogs,
} from './pipeline';
