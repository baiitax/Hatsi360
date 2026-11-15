/**
 * The data-source contract used by every page, API route and server action.
 *
 * Two implementations exist:
 *  - `supabase`  — the production backend (PostgreSQL + RLS).
 *  - `fixture`   — the historical dataset, used when no Supabase project is
 *                  configured. It contains exactly the records that were
 *                  from the historical archive.
 *
 * Both implementations return the same shapes so the UI can never tell them
 * apart — and so the data source is answered by the
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
  /** True when the underlying records are from the historical archive. */
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
