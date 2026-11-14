/**
 * Commodity Intelligence Module
 *
 * Evidence-backed agricultural intelligence for production, supply,
 * demand, and trade flow analysis. All data carries provenance metadata.
 *
 * Phase 06 — Stage 1: Evidence Provenance Engine
 */

// Types
export type {
  EvidenceSource,
  EvidenceSourceType,
  AccessMethod,
  SourceSyncEvent,
  SyncType,
  SyncStatus,
  CommodityProduction,
  CommoditySupply,
  CommodityDemand,
  CommodityTrade,
  TradeFlowType,
  VerificationStatus,
  IngestionResult,
  IngestionContext,
  ProductionQuery,
  SupplyQuery,
  DemandQuery,
  TradeQuery,
  CommodityIntelligenceSummary,
} from './types';

// Core service
export {
  getActiveSources,
  getSourceByCode,
  getAllSources,
  createSyncEvent,
  completeSyncEvent,
  getRecentSyncEvents,
  getProductionData,
  getSupplyData,
  getDemandData,
  getTradeData,
  getCommodityIntelligenceSummary,
  getIntelligenceStats,
} from './service';

export type { IntelligenceStats } from './service';

// Ingestion
export { runIngestion, runBatchIngestion, getSupportedSources } from './ingestion/orchestrator';
export type { IngestionRequest, IngestionResponse, BatchIngestionResult } from './ingestion/orchestrator';
export { ingestFAOSTATProduction, ingestFAOSTATTrade, getFAOSTATItemMap } from './ingestion/faostat';
export { ingestUSDASupplyDemand, getUSDACommodityMap } from './ingestion/usda-fas';
export { ingestCBNExchangeRates, getLatestExchangeRate } from './ingestion/cbn';
