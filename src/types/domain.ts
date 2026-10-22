/**
 * Pluck Live domain types.
 *
 * These mirror the Supabase schema in `supabase/migrations/`. They are the single
 * source of truth for shapes that cross the server/client boundary.
 *
 * Money is always `number` in the UI layer, but it is stored as PostgreSQL
 * `numeric` and must never be persisted as float. See `src/lib/money.ts`.
 */

/* ------------------------------------------------------------------ reference */

export interface Country {
  id: number;
  code: string;
  name: string;
  currencyCode: string;
  currencySymbol: string;
}

export interface State {
  id: number;
  countryId: number;
  code: string | null;
  name: string;
  slug: string;
}

export interface MarketZone {
  id: number;
  stateId: number;
  name: string;
  slug: string;
  description: string | null;
}

export interface Market {
  id: number;
  legacyId: number | null;
  marketZoneId: number | null;
  stateId: number;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
  /** Denormalised for list rendering; resolved by the data layer. */
  stateName?: string;
  stateSlug?: string;
  countryName?: string;
  countryCode?: string;
  marketZoneName?: string | null;
  latestObservationAt?: string | null;
  observationCount?: number;
}

export interface CommodityCategory {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
}

export interface Commodity {
  id: number;
  legacyId: number | null;
  categoryId: number;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  defaultVarietyId: number | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  synonyms?: string[];
  /** Markets that have at least one published observation. */
  marketCount?: number;
  latestObservationAt?: string | null;
  observationCount?: number;
}

export interface CommodityVariety {
  id: number;
  commodityId: number;
  name: string;
  slug: string;
  synonyms: string[];
}

export interface CommodityGrade {
  id: number;
  commodityId: number;
  varietyId: number | null;
  name: string;
  slug: string;
  description: string | null;
}

/** A measurement unit with a physical dimension so compatibility can be checked. */
export interface MeasurementUnit {
  id: number;
  code: string;
  name: string;
  pluralName: string | null;
  dimension: 'mass' | 'volume' | 'count' | 'length' | 'unknown';
  /** Base unit of the dimension, e.g. kg / litre / piece. */
  baseUnitId: number | null;
  /** Multiplier into the base unit, e.g. 1000 g -> 1 kg. */
  baseFactor: number | null;
  /**
   * False for the synthetic "unspecified" unit used to hold legacy records whose
   * measurement unit was never recorded. Comparisons across such records are
   * allowed but always flagged as ambiguous.
   */
  isSpecific: boolean;
}

/** Commodity-specific bag/package weight rule (a bag of maize is not a bag of cocoa). */
export interface CommodityUnitConversion {
  id: number;
  commodityId: number;
  fromUnitId: number;
  toUnitId: number;
  factor: number;
  note: string | null;
}

/* ----------------------------------------------------------------- pricing */

export const PRICE_TYPES = [
  'farmgate',
  'wholesale_asking',
  'wholesale_transaction',
  'retail',
  'processor_procurement',
  'export_buy',
  'export_sell',
  'indicative',
  'unspecified',
] as const;

export type PriceType = (typeof PRICE_TYPES)[number];

export interface PriceTypeMeta {
  code: PriceType;
  label: string;
  shortLabel: string;
  description: string;
  /** Whether a price of this type may be compared with another of the same type. */
  isComparable: boolean;
}

export const PRICE_TYPE_META: Record<PriceType, PriceTypeMeta> = {
  farmgate: {
    code: 'farmgate',
    label: 'Farmgate purchase price',
    shortLabel: 'Farmgate',
    description: 'Price paid to the farmer at the farm gate or collection point.',
    isComparable: true,
  },
  wholesale_asking: {
    code: 'wholesale_asking',
    label: 'Wholesale asking price',
    shortLabel: 'Wholesale asking',
    description: 'Price a wholesale buyer asks for the commodity.',
    isComparable: true,
  },
  wholesale_transaction: {
    code: 'wholesale_transaction',
    label: 'Wholesale transaction price',
    shortLabel: 'Wholesale trade',
    description: 'Price a commodity actually transacted at in the wholesale market.',
    isComparable: true,
  },
  retail: {
    code: 'retail',
    label: 'Retail selling price',
    shortLabel: 'Retail',
    description: 'Price the commodity is sold to end consumers for.',
    isComparable: true,
  },
  processor_procurement: {
    code: 'processor_procurement',
    label: 'Processor procurement price',
    shortLabel: 'Processor',
    description: 'Price a processor or mill pays for raw commodity intake.',
    isComparable: true,
  },
  export_buy: {
    code: 'export_buy',
    label: 'Exporter buying offer',
    shortLabel: 'Exporter buy',
    description: 'Offer price an exporter is willing to pay.',
    isComparable: true,
  },
  export_sell: {
    code: 'export_sell',
    label: 'Exporter selling offer',
    shortLabel: 'Exporter sell',
    description: 'Price an exporter is asking for the commodity.',
    isComparable: true,
  },
  indicative: {
    code: 'indicative',
    label: 'Indicative market estimate',
    shortLabel: 'Indicative',
    description: 'An estimate of the prevailing market level. Not a confirmed transaction.',
    isComparable: false,
  },
  unspecified: {
    code: 'unspecified',
    label: 'Price type not recorded',
    shortLabel: 'Unspecified',
    description:
      'The source record did not state whether this was an asking, transaction or retail price.',
    isComparable: false,
  },
};

export const VERIFICATION_STATUSES = [
  'draft',
  'pending_verification',
  'verified',
  'rejected',
  'correction_requested',
  'legacy_unverified',
] as const;

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export interface VerificationStatusMeta {
  code: VerificationStatus;
  label: string;
  description: string;
  /** Whether the public may see the row when it is published. */
  publiclyReadable: boolean;
  tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
}

export const VERIFICATION_STATUS_META: Record<VerificationStatus, VerificationStatusMeta> = {
  draft: {
    code: 'draft',
    label: 'Draft',
    description: 'Saved by the collecting agent but not yet submitted for verification.',
    publiclyReadable: false,
    tone: 'neutral',
  },
  pending_verification: {
    code: 'pending_verification',
    label: 'Pending verification',
    description: 'Submitted and awaiting review by a verification officer.',
    publiclyReadable: false,
    tone: 'info',
  },
  verified: {
    code: 'verified',
    label: 'Verified',
    description: 'Reviewed and approved by a verification officer.',
    publiclyReadable: true,
    tone: 'success',
  },
  rejected: {
    code: 'rejected',
    label: 'Rejected',
    description: 'Reviewed and found not fit for publication.',
    publiclyReadable: false,
    tone: 'danger',
  },
  correction_requested: {
    code: 'correction_requested',
    label: 'Correction requested',
    description: 'A verification officer asked the agent to correct and resubmit.',
    publiclyReadable: false,
    tone: 'warning',
  },
  legacy_unverified: {
    code: 'legacy_unverified',
    label: 'Legacy record — unverified',
    description:
      'Migrated from the previous Pluck Live system. It carries no verification trail, so it is published with an explicit unverified label rather than being retroactively marked verified.',
    publiclyReadable: true,
    tone: 'warning',
  },
};

/** Data-quality flags raised against an observation. */
export const QUALITY_FLAGS = [
  'duplicate_suspected',
  'price_outlier',
  'unit_conversion_unverified',
  'bag_weight_inconsistent',
  'timestamp_inconsistent',
  'missing_evidence',
  'conflicting_report',
  'stale',
  'legacy_unverified',
  'unit_ambiguous',
] as const;

export type QualityFlag = (typeof QUALITY_FLAGS)[number];

export interface PriceObservation {
  id: string;
  commodityId: number;
  marketId: number;
  varietyId: number | null;
  gradeId: number | null;
  priceType: PriceType;

  /** Exactly as reported by the agent. Never overwritten by normalisation. */
  reportedAmount: number | null;
  reportedUnitId: number | null;
  packageWeightKg: number | null;

  /** Normalised amount, in `normalizedUnitId`. Null when conversion is not known. */
  normalizedAmount: number | null;
  normalizedUnitId: number | null;

  currencyCode: string;
  currencySymbol: string;

  collectedAt: string;
  /** 'minute' when the real clock time is known; 'date' when only the day is known. */
  collectedAtPrecision: 'minute' | 'date';
  submittedAt: string | null;
  verifiedAt: string | null;
  publishedAt: string | null;

  agentUserId: string | null;
  verificationStatus: VerificationStatus;
  notes: string | null;
  qualityFlags: QualityFlag[];

  sourceSystem: 'legacy_import' | 'agent_app' | 'manual_entry';
  sourceReference: string | null;

  /* denormalised for display */
  commodityName?: string;
  commoditySlug?: string;
  marketName?: string;
  marketSlug?: string;
  stateName?: string;
  stateSlug?: string;
  countryCode?: string;
  gradeName?: string | null;
  varietyName?: string | null;
  unitCode?: string | null;
  unitName?: string | null;
  unitDimension?: 'mass' | 'volume' | 'count' | 'length' | 'unknown';
  unitIsSpecific?: boolean;
}

/** A published summary of one market's price for one commodity. */
export interface MarketPriceSummary {
  marketId: number;
  marketName: string;
  marketSlug: string;
  stateName: string;
  stateSlug: string;
  commodityId: number;
  commodityName: string;
  commoditySlug?: string;
  priceType: PriceType;
  gradeId: number | null;
  gradeName: string | null;
  varietyId: number | null;
  unitId: number | null;
  unitCode: string | null;
  unitName: string | null;
  unitIsSpecific: boolean;

  /** Median of the underlying observations (the published summary rule). */
  medianAmount: number;
  minAmount: number;
  maxAmount: number;
  latestAmount: number;
  observationCount: number;
  currencyCode: string;
  currencySymbol: string;

  /** Window the summary covers. */
  windowStart: string;
  windowEnd: string;
  latestCollectedAt: string;
  latestVerifiedAt: string | null;

  /** True when the unit was never recorded (legacy data). */
  unitAmbiguous: boolean;
  /** True when the newest observation is older than the freshness rule. */
  isStale: boolean;
  /** Mean change against the previous window, when enough data exists. */
  changePercent: number | null;
}

export interface PriceSeriesPoint {
  date: string;
  min: number;
  max: number;
  median: number;
  observations: number;
}

export interface DataFreshness {
  commodityId: number | null;
  marketId: number | null;
  windowHours: number;
}

export interface ObservationQuery {
  commodityId?: number;
  marketId?: number;
  categoryId?: number;
  stateId?: number;
  priceType?: PriceType;
  gradeId?: number;
  varietyId?: number;
  collectedFrom?: string;
  collectedTo?: string;
  search?: string;
  sort?: 'recent' | 'price_asc' | 'price_desc' | 'commodity' | 'market';
  page?: number;
  pageSize?: number;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/* --------------------------------------------------------------- operations */

export type UserRole =
  | 'public_user'
  | 'customer'
  | 'agent'
  | 'verification_officer'
  | 'market_supervisor'
  | 'analyst'
  | 'admin'
  | 'super_admin';

export interface AgentAssignment {
  id: number;
  userId: string;
  marketId: number;
  marketName: string;
  stateName: string;
  startsOn: string;
  endsOn: string | null;
  isActive: boolean;
}

export interface CollectionTask {
  id: number;
  marketId: number;
  marketName: string;
  commodityId: number | null;
  commodityName: string | null;
  dueOn: string;
  status: 'open' | 'in_progress' | 'submitted' | 'skipped';
  notes: string | null;
}

export interface QualityFlagRecord {
  id: number;
  observationId: string;
  flag: QualityFlag;
  detail: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
}
