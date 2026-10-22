/**
 * The data-source contract used by every page, API route and server action.
 *
 * Two implementations exist:
 *  - `supabase`  — the production backend (PostgreSQL + RLS).
 *  - `fixture`   — the migrated legacy dataset, used when no Supabase project is
 *                  configured. It contains exactly the records that were
 *                  published on https://liveprice.pluckagro.com and nothing else.
 *
 * Both implementations return the same shapes so the UI can never tell them
 * apart — and so the "is this live or migrated?" question is answered by the
 * `source` flag, not by a divergence in behaviour.
 */

import type {
  Commodity,
  CommodityCategory,
  Country,
  Market,
  MeasurementUnit,
  ObservationQuery,
  Paginated,
  PriceObservation,
  State,
} from '@/types/domain';

export interface DataSource {
  readonly kind: 'supabase' | 'fixture';
  /** True when the underlying records came from the migrated legacy system. */
  readonly isMigrated: boolean;

  listCountries(): Promise<Country[]>;
  listStates(): Promise<State[]>;
  listCategories(): Promise<CommodityCategory[]>;
  listMarkets(): Promise<Market[]>;
  getMarketBySlug(slug: string): Promise<Market | null>;
  listCommodities(): Promise<Commodity[]>;
  getCommodityBySlug(slug: string): Promise<Commodity | null>;
  getCommodityById(id: number): Promise<Commodity | null>;
  listUnits(): Promise<MeasurementUnit[]>;

  /** Published + publicly readable observations, filtered. */
  listObservations(query: ObservationQuery): Promise<Paginated<PriceObservation>>;
  /** All matching observations without pagination — used for aggregation. */
  listObservationsForAnalysis(query: Omit<ObservationQuery, 'page' | 'pageSize' | 'sort'>): Promise<PriceObservation[]>;

  /** Full provenance record for the legacy import, when the fixture backend is used. */
  getProvenance(): Promise<Provenance | null>;
}

export interface Provenance {
  source: string;
  collectedAt: string;
  collectionMethod: string;
  reconstructionNote: string;
  knownUnknowns: string[];
  observedCount: number;
  dateRange: [string, string];
  validation: { publishedLatestValuesChecked: number; mismatches: unknown[] };
}
